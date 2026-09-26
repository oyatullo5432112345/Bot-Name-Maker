// Face ID kiosk — maktab eshigiga qo'yiladigan telefon/planshet.
// • Bir kadrda bir nechta o'quvchi (6 tagacha) bir vaqtda tanladi
// • Tez yurib o'tsa ham: har bir yuz kadrlar orasida kuzatiladi, ovozlar yig'iladi
// • Yon tomondan (~45° gacha) — SSD topuvchi + ro'yxatga olishdagi 7 burchak
// • Bitta qurilma KELDI va KETDI ni o'zi ajratadi (AVTO) yoki qo'lda tanlanadi
// • Natija ekranga DARHOL chiqadi, server fonda xabardor qilinadi

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ScanFace, CheckCircle2, Clock, XCircle, LogOut, SwitchCamera, WifiOff, Loader2,
  LogIn, DoorOpen, ArrowDownLeft, ArrowUpRight, Users, Zap, UserX, Volume2, VolumeX,
} from "lucide-react";
import {
  api, beep, speak, stopSpeak, buildIndex, detectFaces, hasSsd, loadFaceApi, startCamera, stopCamera, warmup,
  type Box, type Detector, type FaceIndex, type FaceResult, type Person,
} from "@/lib/face";
import { associate, matchFrame, VoteBook, type Track } from "@/lib/face-track";

interface Settings {
  late_after: string;
  notify: boolean;
  threshold: number;
  min_stay: number;
}

type Mode = "auto" | "in" | "out";
type Action = "in" | "out" | "already_in" | "already_out";

interface KPerson extends Person {
  left_ms?: number | null;
}

interface Event {
  key: string;
  name: string;
  class_name: string;
  time: string;
  kind: "in" | "late" | "out" | "early";
}

type ToastKind = "in" | "late" | "out" | "early" | "already_in" | "already_out" | "unknown";
interface Toast {
  id: number;
  kind: ToastKind;
  login: string;
  name: string;
  cls: string;
  time: string;
  end?: string | null;
  until: number;
}

interface ScanReply {
  event: Action;
  name: string;
  class_name: string;
  time: string;
  status?: string;
  early?: boolean;
  lessons_end?: string | null;
}

interface DrawItem {
  box: Box;
  color: string;
  text: string;
}

const QUEUE_KEY = "faceid_queue_v2";
const MODE_KEY = "faceid_mode";
const DET_KEY = "faceid_detector"; // qo'lda tanlangan: "ssd" | "tiny"
const VOICE_KEY = "faceid_voice"; // ovoz yoqilgan/o'chirilgan
const LOOP_GAP_MS = 10; // kadrlar orasidagi pauza (tezlikni aniqlashning o'zi belgilaydi)
const MARGIN = 0.06; // 1- va 2-eng yaqin odam orasidagi minimal farq
const VOTE_WINDOW_MS = 1500; // tasdiqlash uchun ovozlar shu oraliqda yig'iladi
const TRACK_TTL_MS = 1000; // yuz 1 soniya ko'rinmasa — kuzatuv tugaydi
const QUIET_MS = 8000; // tanilgan o'quvchi 8 soniya qayta ko'rsatilmaydi
const QUIET_ALREADY_MS = 15000; // "bugun keldi" kabi eslatmalar — 15 soniya
const UNKNOWN_AFTER_MS = 1800; // shuncha vaqt tanilmasa — "Tanilmadi"
const UNKNOWN_GAP_MS = 3000;
const MAX_TOASTS = 4;
const SLOW_MS = 320; // SSD kadri bundan sekin bo'lsa — Tez rejimga o'tamiz

const COLORS = {
  ok: "#34D399",
  wait: "#22D3EE",
  unknown: "#F59E0B",
  small: "#94A3B8",
};

// O'zbekiston vaqti (qurilma soat mintaqasi noto'g'ri bo'lsa ham)
function uzClock(withSeconds = false): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  });
}

type QueueItem = { student_login: string; mode: "in" | "out"; distance: number; device: string };
function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* e'tiborsiz */
  }
}
function readMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "in" || m === "out" ? m : "auto";
  } catch {
    return "auto";
  }
}
function readDetector(): Detector | null {
  try {
    const d = localStorage.getItem(DET_KEY);
    return d === "ssd" || d === "tiny" ? d : null;
  } catch {
    return null;
  }
}
function readVoice(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== "0"; // standart — yoqilgan
  } catch {
    return true;
  }
}
function shortName(n: string): string {
  return n.split(" ").slice(0, 2).join(" ");
}

let toastSeq = 0;

// Eski Safari'da ctx.roundRect yo'q — o'zimiz chizamiz
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toastStyle(k: ToastKind): { card: string; head: string; title: (t: Toast) => string } {
  switch (k) {
    case "in":
      return { card: "bg-emerald-500/25 border-emerald-400/60", head: "text-emerald-300", title: () => "KELDI · Xush kelibsiz!" };
    case "late":
      return { card: "bg-amber-500/25 border-amber-400/60", head: "text-amber-200", title: () => "KELDI · Kechikdingiz" };
    case "out":
      return { card: "bg-sky-500/25 border-sky-400/60", head: "text-sky-300", title: () => "KETDI · Yaxshi boring!" };
    case "early":
      return {
        card: "bg-amber-500/25 border-amber-400/60",
        head: "text-amber-200",
        title: (t) => `KETDI · Erta${t.end ? ` (darslar ${t.end} da tugaydi)` : ""}`,
      };
    case "already_in":
      return { card: "bg-[#0D1430]/80 border-white/15", head: "text-slate-300", title: (t) => `Bugun keldi · ${t.time}` };
    case "already_out":
      return { card: "bg-[#0D1430]/80 border-white/15", head: "text-slate-300", title: (t) => `Ketgan · ${t.time}` };
    default:
      return { card: "bg-red-500/20 border-red-400/50", head: "text-red-200", title: () => "Tanilmadi" };
  }
}

function ToastIcon({ k, className }: { k: ToastKind; className: string }) {
  if (k === "in") return <CheckCircle2 className={className} />;
  if (k === "late") return <Clock className={className} />;
  if (k === "out" || k === "early") return <DoorOpen className={className} />;
  if (k === "unknown") return <UserX className={className} />;
  return <ScanFace className={className} />;
}

function ToastCard({ t, compact }: { t: Toast; compact: boolean }) {
  const s = toastStyle(t.kind);
  const already = t.kind === "already_in" || t.kind === "already_out";
  if (compact) {
    return (
      <div className={`rounded-2xl border px-4 py-3 backdrop-blur flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 ${s.card}`}>
        <ToastIcon k={t.kind} className={`w-7 h-7 shrink-0 ${s.head}`} />
        <div className="min-w-0 flex-1">
          <div className="text-xl sm:text-2xl font-bold truncate">{t.kind === "unknown" ? "Tanilmadi" : t.name}</div>
          <div className={`text-sm sm:text-base truncate ${s.head}`}>
            {t.kind === "unknown" ? "To'g'ri qarang yoki navbatchiga murojaat qiling" : already ? `${t.cls} · ${s.title(t)}` : `${s.title(t)} · ${t.cls} · ${t.time}`}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-3xl border px-6 py-5 sm:py-7 text-center backdrop-blur animate-in fade-in zoom-in-95 duration-150 ${s.card}`}>
      {t.kind === "unknown" ? (
        <>
          <div className="text-2xl sm:text-3xl font-bold text-red-200">Tanilmadi</div>
          <div className="mt-1 text-sm sm:text-lg text-slate-300">To'g'ri qarang yoki navbatchi o'qituvchiga murojaat qiling</div>
        </>
      ) : already ? (
        <>
          <div className="text-2xl sm:text-4xl font-bold">{t.name}</div>
          <div className="mt-1 text-base sm:text-xl text-slate-300">{t.cls} · {s.title(t)}</div>
        </>
      ) : (
        <>
          <div className={`flex items-center justify-center gap-3 ${s.head}`}>
            <ToastIcon k={t.kind} className="w-8 h-8" />
            <span className="text-lg sm:text-2xl font-semibold">{s.title(t)}</span>
          </div>
          <div className="mt-2 text-3xl sm:text-5xl font-bold">{t.name}</div>
          <div className="mt-2 text-lg sm:text-2xl text-slate-200">{t.cls} · {t.time}</div>
        </>
      )}
    </div>
  );
}

export default function FaceKioskPage() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const peopleRef = useRef<KPerson[]>([]);
  const indexRef = useRef<FaceIndex<KPerson>>(buildIndex<KPerson>([]));
  const settingsRef = useRef<Settings>({ late_after: "08:00", notify: true, threshold: 0.48, min_stay: 20 });
  const skewRef = useRef(0); // server soati − qurilma soati
  const startsRef = useRef<Record<string, string>>({}); // sinf → birinchi dars boshlanishi (2 smena uchun)
  const modeRef = useRef<Mode>(readMode());
  const tracksRef = useRef<Track[]>([]);
  const votesRef = useRef(new VoteBook(VOTE_WINDOW_MS));
  const shownUntilRef = useRef(new Map<string, number>()); // login → shu vaqtgacha qayta ko'rsatilmaydi
  const lastUnknownRef = useRef(0);
  const lastFastRef = useRef(0); // "tez o'tib ketdi" ogohlantirishi (throttle)
  const voiceRef = useRef(readVoice());
  const hintRef = useRef<"idle" | "closer" | "scan">("idle");
  const runningRef = useRef(false);
  const facingRef = useRef<"user" | "environment">("user");
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [manualDet] = useState(readDetector);
  const detRef = useRef<Detector>(manualDet ?? "ssd");
  const manualDetRef = useRef<boolean>(manualDet !== null);
  const perfRef = useRef({ ema: 0, frames: 0, shownAt: 0, faces: 0 });

  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [progress, setProgress] = useState("Tayyorlanmoqda…");
  const [error, setError] = useState("");
  const [mode, setModeState] = useState<Mode>(modeRef.current);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hint, setHint] = useState<"idle" | "closer" | "scan">("idle");
  const [events, setEvents] = useState<Event[]>([]);
  const [counts, setCounts] = useState({ arrived: 0, left: 0, enrolled: 0 });
  const [pending, setPending] = useState(readQueue().length);
  const [clock, setClock] = useState(uzClock(true));
  const [online, setOnline] = useState(navigator.onLine);
  const [voice, setVoiceState] = useState(voiceRef.current);
  const [perf, setPerf] = useState<{ det: Detector; fps: number; faces: number; auto: boolean }>({
    det: detRef.current,
    fps: 0,
    faces: 0,
    auto: false,
  });

  const recount = () => {
    const ps = peopleRef.current;
    setCounts({ arrived: ps.filter((p) => p.arrived).length, left: ps.filter((p) => p.left).length, enrolled: ps.length });
  };

  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* e'tiborsiz */
    }
  };

  const setDetector = (d: Detector, manual: boolean) => {
    detRef.current = d;
    perfRef.current = { ema: 0, frames: 0, shownAt: 0, faces: perfRef.current.faces };
    setPerf((p) => ({ ...p, det: d, fps: 0, auto: !manual && d === "tiny" }));
    if (manual) {
      manualDetRef.current = true;
      try {
        localStorage.setItem(DET_KEY, d);
      } catch {
        /* e'tiborsiz */
      }
    }
  };

  // ── Yuz izlari va bugungi holat
  const loadPeople = useCallback(async () => {
    const t0 = Date.now();
    const data = await api<{ now: number; settings: Settings; starts?: Record<string, string>; people: KPerson[] }>("/faceid/descriptors");
    startsRef.current = data.starts ?? {};
    skewRef.current = data.now - Math.round((t0 + Date.now()) / 2);
    // Kiosk ichida belgilangan (hali serverga yetmagan) holatni yo'qotmaymiz
    const old = new Map(peopleRef.current.map((p) => [p.login, p]));
    for (const p of data.people) {
      const o = old.get(p.login);
      if (!o) continue;
      if (!p.arrived && o.arrived) {
        p.arrived = o.arrived;
        p.arrived_ms = o.arrived_ms;
      }
      if (!p.left && o.left) {
        p.left = o.left;
        p.left_ms = o.left_ms;
      }
    }
    peopleRef.current = data.people;
    indexRef.current = buildIndex(data.people);
    settingsRef.current = data.settings;
    recount();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fa] = await Promise.all([loadFaceApi((m) => alive && setProgress(m)), loadPeople()]);
        if (alive) setProgress("Tayyorlanmoqda (bir martalik)…");
        await warmup(fa);
        if (!hasSsd(fa)) setDetector("tiny", false);
        faceapiRef.current = fa;
        if (alive) setPhase("ready");
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setPhase("error");
        }
      }
    })();
    const t = setInterval(() => setClock(uzClock(true)), 1000);
    const refresh = setInterval(() => void loadPeople().catch(() => {}), 5 * 60 * 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(refresh);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      runningRef.current = false;
      stopCamera(streamRef.current);
      void wakeRef.current?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPeople]);

  // ── Muddati o'tgan xabarlarni olib tashlash
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setToasts((list) => (list.some((x) => x.until <= now) ? list.filter((x) => x.until > now) : list));
    }, 250);
    return () => clearInterval(t);
  }, []);

  // ── Internet yo'qligida to'plangan belgilarni qayta yuborish
  useEffect(() => {
    const t = setInterval(async () => {
      const q = readQueue();
      if (q.length === 0 || !navigator.onLine) return;
      const rest: QueueItem[] = [];
      for (const item of q) {
        try {
          await api("/faceid/scan", { method: "POST", body: JSON.stringify(item) });
        } catch (e) {
          const st = (e as { status?: number }).status;
          if (st === undefined || st >= 500) rest.push(item);
        }
      }
      writeQueue(rest);
      setPending(rest.length);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const addToast = (t: Omit<Toast, "id" | "until">, ms: number) => {
    const until = Date.now() + ms;
    setToasts((list) =>
      [{ ...t, id: ++toastSeq, until }, ...list.filter((x) => !(t.login && x.login === t.login))].slice(0, MAX_TOASTS)
    );
  };

  const pushEvent = (e: Omit<Event, "key">) => {
    setEvents((list) => [{ ...e, key: `${e.name}-${e.time}-${e.kind}-${Date.now()}-${Math.random()}` }, ...list].slice(0, 16));
  };

  const setHintOnce = (h: "idle" | "closer" | "scan") => {
    if (hintRef.current === h) return;
    hintRef.current = h;
    setHint(h);
  };

  // ── Yuz ramkalari va ismlar (video object-cover bo'yicha, oldingi kamerada ko'zgu)
  const drawFaces = (items: DrawItem[]) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const W = Math.round(cw * dpr);
    const H = Math.round(ch * dpr);
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (!video.videoWidth || items.length === 0) return;
    const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
    const ox = (cw - video.videoWidth * scale) / 2;
    const oy = (ch - video.videoHeight * scale) / 2;
    for (const it of items) {
      let x = it.box.x * scale + ox;
      const y = it.box.y * scale + oy;
      const w = it.box.width * scale;
      const h = it.box.height * scale;
      if (facingRef.current === "user") x = cw - x - w;
      const c = Math.min(w, h) * 0.22;
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
      ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
      ctx.moveTo(x + w, y + h - c); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - c, y + h);
      ctx.moveTo(x + c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - c);
      ctx.stroke();
      if (it.text) {
        const fs = Math.max(13, Math.min(22, w * 0.13));
        ctx.font = `700 ${fs}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        const tw = ctx.measureText(it.text).width;
        const ph = fs + 10;
        const pw = tw + 18;
        const px = Math.min(Math.max(4, x + w / 2 - pw / 2), cw - pw - 4);
        const py = Math.max(4, y - ph - 8);
        ctx.fillStyle = it.color;
        pill(ctx, px, py, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = "#05070F";
        ctx.textBaseline = "middle";
        ctx.fillText(it.text, px + 9, py + ph / 2 + 1);
      }
    }
  };

  // ── Keldi yoki ketdi? (server bilan bir xil qoida — natijani kutmasdan ko'rsatish uchun)
  const decide = (p: KPerson): Action => {
    const now = Date.now() + skewRef.current;
    const m = modeRef.current;
    if (m === "in") return p.arrived ? "already_in" : "in";
    if (m === "out") return p.left_ms && now - p.left_ms < 10 * 60_000 ? "already_out" : "out";
    if (!p.arrived) return "in";
    if (p.left) return "already_out";
    if (p.arrived_ms && now - p.arrived_ms < settingsRef.current.min_stay * 60_000) return "already_in";
    return "out";
  };

  // ── Tasdiqlangan o'quvchi: darhol ekranga, server — fonda
  const onRecognized = (p: KPerson, d: number): Action => {
    const action = decide(p);
    const time = uzClock();
    const base = { login: p.login, name: p.name, cls: p.class_name };
    const now = Date.now();

    if (action === "already_in" || action === "already_out") {
      shownUntilRef.current.set(p.login, now + QUIET_ALREADY_MS);
      addToast({ kind: action, ...base, time: (action === "already_in" ? p.arrived : p.left) ?? time }, 1600);
      return action;
    }
    shownUntilRef.current.set(p.login, now + QUIET_MS);

    const first = p.name.split(" ").slice(-1)[0] || p.name.split(" ")[0] || p.name; // ism (odatda oxirgi so'z)
    if (action === "in") {
      const late = time > (startsRef.current[p.class_name] ?? settingsRef.current.late_after);
      p.arrived = time;
      p.arrived_ms = now + skewRef.current;
      addToast({ kind: late ? "late" : "in", ...base, time }, 2800);
      beep(late ? "late" : "ok");
      if (voiceRef.current) speak(late ? `${first}, kechikdingiz` : `${first}, xush kelibsiz`);
      pushEvent({ name: p.name, class_name: p.class_name, time, kind: late ? "late" : "in" });
    } else {
      p.left = time;
      p.left_ms = now + skewRef.current;
      addToast({ kind: "out", ...base, time }, 2800);
      beep("again");
      if (voiceRef.current) speak(`${first}, xayr`);
      pushEvent({ name: p.name, class_name: p.class_name, time, kind: "out" });
    }
    recount();

    const payload: QueueItem = {
      student_login: p.login,
      mode: action,
      distance: Number(d.toFixed(3)),
      device: navigator.userAgent.slice(0, 60),
    };
    void api<ScanReply>("/faceid/scan", { method: "POST", body: JSON.stringify(payload) })
      .then((r) => {
        // Server aniqlashtirishi: kechikish, erta ketish
        if (r.event === "in") {
          p.arrived = r.time;
          const k: ToastKind = r.status === "late" ? "late" : "in";
          setToasts((list) => list.map((t) => (t.login === p.login && (t.kind === "in" || t.kind === "late") ? { ...t, kind: k, time: r.time } : t)));
          setEvents((list) => list.map((e) => (e.name === p.name && (e.kind === "in" || e.kind === "late") ? { ...e, kind: k, time: r.time } : e)));
        } else if (r.event === "out") {
          p.left = r.time;
          if (r.early) {
            setToasts((list) => list.map((t) => (t.login === p.login && t.kind === "out" ? { ...t, kind: "early", end: r.lessons_end } : t)));
            setEvents((list) => list.map((e) => (e.name === p.name && e.kind === "out" ? { ...e, kind: "early" } : e)));
          }
        }
      })
      .catch((e) => {
        const st = (e as { status?: number }).status;
        if (st === undefined || st >= 500) {
          const q = readQueue();
          q.push(payload);
          writeQueue(q);
          setPending(q.length);
        }
      });
    return action;
  };

  // ── Bitta kadrni qayta ishlash: hamma yuzlar bir vaqtda
  const processFrame = (faces: FaceResult[], video: HTMLVideoElement) => {
    const now = Date.now();
    const minFace = Math.max(56, Math.min(video.videoWidth, video.videoHeight) * 0.08);
    const usable = faces.filter((f) => f.box.width >= minFace);
    const small = faces.filter((f) => f.box.width < minFace);
    const { tracks, pairs, expired } = associate(tracksRef.current, usable, now, TRACK_TTL_MS);
    tracksRef.current = tracks;
    votesRef.current.prune(now);
    perfRef.current.faces = faces.length;

    // "Tez o'tib ketdi": yuz ko'rindi-yu, tanishga ulgurmay yo'qoldi → ogohlantirish
    const missed = expired.some((t) => !t.matched && t.frames >= 3);
    if (missed && now - lastFastRef.current > 4000) {
      lastFastRef.current = now;
      beep("error");
      if (voiceRef.current) speak("Sekinroq, qaytadan qarang");
    }

    const th = settingsRef.current.threshold;
    const matches = matchFrame(usable, indexRef.current, th, MARGIN);
    const items: DrawItem[] = small.map((f) => ({ box: f.box, color: COLORS.small, text: "" }));

    for (const [face, track] of pairs) {
      const m = matches.find((x) => x.face === face);
      const p = m?.p ?? null;
      if (m && p) {
        track.matched = true;
        track.logins = track.logins.filter((l) => now - l.t < VOTE_WINDOW_MS);
        const conflict = track.logins.some((l) => l.login !== p.login);
        track.logins.push({ login: p.login, t: now });
        if ((shownUntilRef.current.get(p.login) ?? 0) > now) {
          items.push({ box: face.box, color: COLORS.ok, text: shortName(p.name) });
          continue;
        }
        if (conflict) {
          // Shu yuz yaqinda boshqa o'quvchiga ham o'xshadi — shoshilmaymiz
          items.push({ box: face.box, color: COLORS.wait, text: "…" });
          continue;
        }
        const total = votesRef.current.add(p.login, m.strong ? 2 : 1, now);
        if (total >= 2) {
          votesRef.current.clear(p.login);
          onRecognized(p, m.d);
          items.push({ box: face.box, color: COLORS.ok, text: shortName(p.name) });
        } else {
          items.push({ box: face.box, color: COLORS.wait, text: "…" });
        }
      } else {
        if (!track.matched && !track.unknownShown && track.frames >= 3 && now - track.first > UNKNOWN_AFTER_MS) {
          track.unknownShown = true;
          if (now - lastUnknownRef.current > UNKNOWN_GAP_MS) {
            lastUnknownRef.current = now;
            addToast({ kind: "unknown", login: "", name: "", cls: "", time: "" }, 1600);
          }
        }
        items.push({ box: face.box, color: COLORS.unknown, text: track.unknownShown ? "Tanilmadi" : "" });
      }
    }

    drawFaces(items);
    setHintOnce(faces.length === 0 ? "idle" : usable.length === 0 ? "closer" : "scan");
  };

  // ── Tezlikni kuzatish: SSD sekin bo'lsa — avtomatik Tez rejim
  const trackPerf = (ms: number) => {
    const pr = perfRef.current;
    pr.frames++;
    pr.ema = pr.ema ? pr.ema * 0.85 + ms * 0.15 : ms;
    if (detRef.current === "ssd" && !manualDetRef.current && pr.frames > 15 && pr.ema > SLOW_MS) {
      setDetector("tiny", false);
      return;
    }
    const now = Date.now();
    if (now - pr.shownAt > 1000) {
      pr.shownAt = now;
      const fps = Math.max(1, Math.round(1000 / (pr.ema + LOOP_GAP_MS)));
      setPerf((p) => (p.fps === fps && p.faces === pr.faces && p.det === detRef.current ? p : { ...p, fps, faces: pr.faces, det: detRef.current }));
    }
  };

  // ── Asosiy sikl
  const loop = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const fa = faceapiRef.current;
    const t0 = performance.now();
    let worked = false;
    try {
      if (video && fa && video.readyState >= 2 && video.videoWidth) {
        const det = detRef.current;
        let faces: FaceResult[];
        try {
          faces = await detectFaces(fa, video, det, { inputSize: 416, maxFaces: 6, minScore: det === "ssd" ? 0.4 : 0.45 });
        } catch (e) {
          if (det === "ssd") setDetector("tiny", false); // SSD ishlamasa — zaxira
          throw e;
        }
        processFrame(faces, video);
        worked = true;
      }
    } catch {
      /* bitta kadr xatosi — davom etamiz */
    }
    if (worked) trackPerf(performance.now() - t0);
    setTimeout(() => void loop(), LOOP_GAP_MS);
  };

  const requestWake = async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
      wakeRef.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      /* qo'llab-quvvatlanmaydi */
    }
  };

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && runningRef.current) void requestWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const start = async (face: "user" | "environment" = facingRef.current) => {
    facingRef.current = face;
    setFacing(face);
    try {
      stopCamera(streamRef.current);
      streamRef.current = await startCamera(videoRef.current!, face, true);
      tracksRef.current = [];
      await document.documentElement.requestFullscreen?.().catch(() => {});
      await requestWake();
      beep("again"); // iOS: ovozni foydalanuvchi bosishi bilan "uyg'otamiz"
      if (voiceRef.current) speak("Face ID tayyor"); // iOS: nutqni ham foydalanuvchi bosishi bilan uyg'otamiz
      setPhase("running");
      if (!runningRef.current) {
        runningRef.current = true;
        void loop();
      }
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering."
          : (e as Error).message
      );
      setPhase("error");
    }
  };

  const switchCamera = async () => {
    await start(facingRef.current === "user" ? "environment" : "user");
  };

  const toggleDetector = () => {
    if (!hasSsd(faceapiRef.current)) return;
    setDetector(detRef.current === "ssd" ? "tiny" : "ssd", true);
  };

  const toggleVoice = () => {
    const next = !voiceRef.current;
    voiceRef.current = next;
    setVoiceState(next);
    try { localStorage.setItem(VOICE_KEY, next ? "1" : "0"); } catch { /* e'tiborsiz */ }
    if (next) speak("Ovoz yoqildi"); else stopSpeak();
  };

  const exit = () => {
    if (!confirm("Face ID kioskidan chiqasizmi?")) return;
    runningRef.current = false;
    stopCamera(streamRef.current);
    void document.exitFullscreen?.().catch(() => {});
    navigate("/faceid");
  };

  const date = new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tashkent" });

  const modeBtn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wider transition ${
        mode === m ? "bg-white text-[#05070F]" : "text-slate-300 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  const compact = toasts.length > 1;

  return (
    <div className="fixed inset-0 bg-[#05070F] text-white overflow-hidden select-none">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facing === "user" ? "scaleX(-1)" : undefined, opacity: phase === "running" ? 1 : 0.15 }}
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* Yuqori panel */}
      <div className="absolute top-0 inset-x-0 px-4 sm:px-8 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0">
              <ScanFace className="w-6 h-6 text-[#05070F]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold tracking-[0.2em]">FACE ID</div>
              <div className="text-xs sm:text-sm text-slate-300 capitalize truncate">{date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right">
              <div className="text-2xl sm:text-4xl font-bold tabular-nums leading-none">{clock}</div>
              <div className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center justify-end gap-3">
                <span className="flex items-center gap-1"><LogIn className="w-4 h-4 text-emerald-400" /><b className="text-white">{counts.arrived}</b></span>
                <span className="flex items-center gap-1"><DoorOpen className="w-4 h-4 text-sky-400" /><b className="text-white">{counts.left}</b></span>
                <span className="text-slate-400">/ {counts.enrolled}</span>
              </div>
            </div>
            <button onClick={toggleVoice} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title={voice ? "Ovozni o'chirish" : "Ovozni yoqish"}>
              {voice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </button>
            {phase === "running" && (
              <button onClick={() => void switchCamera()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Kamerani almashtirish">
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            <button onClick={exit} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Chiqish">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex rounded-full bg-black/50 border border-white/10 p-1 backdrop-blur">
            {modeBtn("auto", "AVTO")}
            {modeBtn("in", "KELDI")}
            {modeBtn("out", "KETDI")}
          </div>
          {phase === "running" && (
            <button
              onClick={toggleDetector}
              className="inline-flex items-center gap-2 rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-xs sm:text-sm text-slate-200 backdrop-blur"
              title="Aniq rejim — ko'p yuz va yon tomondan; Tez rejim — sekin telefonlar uchun"
            >
              <Zap className={`w-4 h-4 ${perf.det === "ssd" ? "text-cyan-300" : "text-amber-300"}`} />
              <span className="font-semibold">{perf.det === "ssd" ? "Aniq" : perf.auto ? "Tez (avto)" : "Tez"}</span>
              {perf.fps > 0 && <span className="text-slate-400 tabular-nums">{perf.fps} kadr/s</span>}
              <span className="flex items-center gap-1 text-slate-300 tabular-nums"><Users className="w-3.5 h-3.5" />{perf.faces}</span>
            </button>
          )}
        </div>
      </div>

      {(!online || pending > 0) && (
        <div className="absolute top-36 sm:top-40 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/40 px-4 py-1.5 text-sm text-amber-200 whitespace-nowrap">
          <WifiOff className="w-4 h-4" />
          {online ? `${pending} ta belgi yuborilmoqda…` : `Internet yo'q — ${pending} ta belgi saqlandi, keyin yuboriladi`}
        </div>
      )}

      {phase !== "running" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-[#0D1430]/90 border border-white/10 p-8 text-center backdrop-blur">
            {phase === "loading" && (
              <>
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-cyan-400" />
                <div className="mt-5 text-lg font-semibold">{progress}</div>
                <div className="mt-2 text-sm text-slate-400">Birinchi marta ~12 MB yuklanadi, keyingi safar tez ochiladi.</div>
              </>
            )}
            {phase === "ready" && (
              <>
                <ScanFace className="w-14 h-14 mx-auto text-cyan-400" />
                <div className="mt-4 text-2xl font-bold">Face ID tayyor</div>
                <div className="mt-2 text-slate-300">
                  {counts.enrolled} ta o'quvchi · kech qolish {settingsRef.current.late_after} dan keyin
                </div>
                <div className="mt-4 text-sm text-slate-400 text-left space-y-1">
                  <div>• Bir vaqtda <b className="text-slate-200">bir nechta o'quvchi</b> o'tsa ham har birini taniydi</div>
                  <div>• <b className="text-slate-200">AVTO</b>: kelganda — KELDI, {settingsRef.current.min_stay} daqiqadan keyin — KETDI</div>
                  <div>• Telefonni o'quvchilar <b className="text-slate-200">yuradigan yo'lga qaratib</b>, 1–3 m oldinga, yuz balandligiga qo'ying</div>
                  <div>• Yorug' joy, orqada deraza bo'lmasin; quvvatga ulang</div>
                </div>
                <button
                  onClick={() => void start()}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 py-4 text-lg font-bold text-[#05070F]"
                >
                  ▶ Boshlash
                </button>
              </>
            )}
            {phase === "error" && (
              <>
                <XCircle className="w-12 h-12 mx-auto text-red-400" />
                <div className="mt-4 text-lg font-semibold">{error}</div>
                <button onClick={() => window.location.reload()} className="mt-6 w-full rounded-2xl bg-white/10 py-3 font-semibold">
                  Qayta urinish
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-8">
          <div className="mx-auto max-w-4xl">
            {toasts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#0D1430]/70 px-6 py-5 sm:py-7 text-center backdrop-blur">
                <div className="text-xl sm:text-3xl font-semibold text-slate-200">
                  {hint === "closer" ? "Yaqinroq keling" : hint === "scan" ? "Aniqlanmoqda…" : "Kameraga qarang"}
                </div>
              </div>
            ) : (
              <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" : ""}>
                {toasts.map((t) => (
                  <ToastCard key={t.id} t={t} compact={compact} />
                ))}
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div className="mx-auto max-w-4xl mt-3 flex gap-2 overflow-x-auto pb-1">
              {events.map((e) => (
                <div key={e.key} className="shrink-0 flex items-center gap-1.5 rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-sm">
                  {e.kind === "in" || e.kind === "late" ? (
                    <ArrowDownLeft className={`w-4 h-4 ${e.kind === "late" ? "text-amber-300" : "text-emerald-300"}`} />
                  ) : (
                    <ArrowUpRight className={`w-4 h-4 ${e.kind === "early" ? "text-amber-300" : "text-sky-300"}`} />
                  )}
                  {shortName(e.name)} · {e.class_name} · {e.time}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
