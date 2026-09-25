// Face ID kiosk — maktab eshigiga qo'yiladigan telefon/planshet.
// Bitta qurilma KELDI va KETDI ni o'zi ajratadi (AVTO rejim) yoki qo'lda tanlanadi.
// Tezlik uchun: natija ekranga DARHOL chiqadi, server esa fonda xabardor qilinadi.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ScanFace, CheckCircle2, Clock, XCircle, LogOut, SwitchCamera, WifiOff, Loader2,
  LogIn, DoorOpen, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { api, beep, bestMatches, detectFace, loadFaceApi, startCamera, stopCamera, warmup, type Person } from "@/lib/face";

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

type Banner =
  | { kind: "idle" }
  | { kind: "closer" }
  | { kind: "unknown" }
  | { kind: "in" | "late"; login: string; name: string; cls: string; time: string }
  | { kind: "out"; login: string; name: string; cls: string; time: string; early?: boolean; end?: string | null }
  | { kind: "already_in" | "already_out"; login: string; name: string; cls: string; time: string };

interface ScanReply {
  event: Action;
  name: string;
  class_name: string;
  time: string;
  status?: string;
  early?: boolean;
  lessons_end?: string | null;
}

const QUEUE_KEY = "faceid_queue_v2";
const MODE_KEY = "faceid_mode";
const LOOP_GAP_MS = 30; // kadrlar orasidagi pauza (aniqlashning o'zi tezlikni belgilaydi)
const SAME_PERSON_QUIET_MS = 6000; // bir odam kamera oldida tursa — qayta ko'rsatmaymiz
const MARGIN = 0.06; // 1-va 2-eng yaqin odam orasidagi minimal farq

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

export default function FaceKioskPage() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const peopleRef = useRef<KPerson[]>([]);
  const settingsRef = useRef<Settings>({ late_after: "08:00", notify: true, threshold: 0.48, min_stay: 20 });
  const skewRef = useRef(0); // server soati − qurilma soati
  const startsRef = useRef<Record<string, string>>({}); // sinf → birinchi dars boshlanishi (2 smena uchun)
  const modeRef = useRef<Mode>(readMode());
  const candRef = useRef<{ login: string; count: number } | null>(null);
  const unknownSinceRef = useRef<number | null>(null);
  const lastShownRef = useRef<{ login: string; at: number } | null>(null);
  const bannerUntilRef = useRef(0);
  const runningRef = useRef(false);
  const facingRef = useRef<"user" | "environment">("user");
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [progress, setProgress] = useState("Tayyorlanmoqda…");
  const [error, setError] = useState("");
  const [mode, setModeState] = useState<Mode>(modeRef.current);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [banner, setBanner] = useState<Banner>({ kind: "idle" });
  const [events, setEvents] = useState<Event[]>([]);
  const [counts, setCounts] = useState({ arrived: 0, left: 0, enrolled: 0 });
  const [pending, setPending] = useState(readQueue().length);
  const [clock, setClock] = useState(uzClock(true));
  const [online, setOnline] = useState(navigator.onLine);

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

  // ── Yuz izlari va bugungi holat
  const loadPeople = useCallback(async () => {
    const t0 = Date.now();
    const data = await api<{ now: number; settings: Settings; starts?: Record<string, string>; people: KPerson[] }>("/faceid/descriptors");
    startsRef.current = data.starts ?? {};
    skewRef.current = data.now - Math.round((t0 + Date.now()) / 2);
    peopleRef.current = data.people;
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
  }, [loadPeople]);

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

  const showBanner = (b: Banner, ms: number) => {
    setBanner(b);
    bannerUntilRef.current = Date.now() + ms;
  };

  const pushEvent = (e: Omit<Event, "key">) => {
    setEvents((list) => [{ ...e, key: `${e.name}-${e.time}-${e.kind}-${Date.now()}` }, ...list].slice(0, 14));
  };

  // ── Yuz ramkasi (video object-cover bo'yicha)
  const drawBox = (box: { x: number; y: number; width: number; height: number } | null, color: string) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    if (!box || !video.videoWidth) return;
    const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
    const ox = (cw - video.videoWidth * scale) / 2;
    const oy = (ch - video.videoHeight * scale) / 2;
    let x = box.x * scale + ox;
    const y = box.y * scale + oy;
    const w = box.width * scale;
    const h = box.height * scale;
    if (facingRef.current === "user") x = cw - x - w;
    const c = Math.min(w, h) * 0.22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
    ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
    ctx.moveTo(x + w, y + h - c); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - c, y + h);
    ctx.moveTo(x + c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - c);
    ctx.stroke();
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
  const onRecognized = (p: KPerson, d: number) => {
    const last = lastShownRef.current;
    if (last && last.login === p.login && Date.now() - last.at < SAME_PERSON_QUIET_MS) return;
    lastShownRef.current = { login: p.login, at: Date.now() };

    const action = decide(p);
    const time = uzClock();
    const base = { login: p.login, name: p.name, cls: p.class_name };

    if (action === "already_in") {
      showBanner({ kind: "already_in", ...base, time: p.arrived ?? time }, 1600);
      return;
    }
    if (action === "already_out") {
      showBanner({ kind: "already_out", ...base, time: p.left ?? time }, 1600);
      return;
    }

    if (action === "in") {
      const late = time > (startsRef.current[p.class_name] ?? settingsRef.current.late_after);
      p.arrived = time;
      p.arrived_ms = Date.now() + skewRef.current;
      showBanner({ kind: late ? "late" : "in", ...base, time }, 2200);
      beep(late ? "late" : "ok");
      pushEvent({ name: p.name, class_name: p.class_name, time, kind: late ? "late" : "in" });
    } else {
      p.left = time;
      p.left_ms = Date.now() + skewRef.current;
      showBanner({ kind: "out", ...base, time }, 2200);
      beep("again");
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
          const k = r.status === "late" ? "late" : "in";
          setBanner((b) => ((b.kind === "in" || b.kind === "late") && b.login === p.login ? { ...b, kind: k, time: r.time } : b));
          setEvents((list) => list.map((e) => (e.name === p.name && (e.kind === "in" || e.kind === "late") ? { ...e, kind: k, time: r.time } : e)));
        } else if (r.event === "out") {
          p.left = r.time;
          if (r.early) {
            setBanner((b) => (b.kind === "out" && b.login === p.login ? { ...b, early: true, end: r.lessons_end } : b));
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
  };

  // ── Asosiy sikl
  const loop = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const fa = faceapiRef.current;
    try {
      if (video && fa && video.readyState >= 2) {
        const face = await detectFace(fa, video, 224);
        const now = Date.now();
        if (!face) {
          candRef.current = null;
          unknownSinceRef.current = null;
          drawBox(null, "");
          if (now > bannerUntilRef.current) setBanner({ kind: "idle" });
        } else if (face.box.width < video.videoWidth * 0.14) {
          candRef.current = null;
          drawBox(face.box, "#94A3B8");
          if (now > bannerUntilRef.current) setBanner({ kind: "closer" });
        } else {
          const { best, second } = bestMatches(face.descriptor, peopleRef.current);
          const th = settingsRef.current.threshold;
          const confident = best && best.d < th && second - best.d > MARGIN;
          if (confident) {
            unknownSinceRef.current = null;
            drawBox(face.box, "#22D3EE");
            const strong = best.d < th * 0.8; // juda aniq — bitta kadr yetarli
            const c = candRef.current;
            const count = c && c.login === best.p.login ? c.count + 1 : 1;
            candRef.current = { login: best.p.login, count };
            if (strong || count >= 2) {
              candRef.current = null;
              onRecognized(best.p as KPerson, best.d);
            }
          } else {
            candRef.current = null;
            drawBox(face.box, "#F59E0B");
            unknownSinceRef.current ??= now;
            if (now - unknownSinceRef.current > 1500 && now > bannerUntilRef.current) {
              showBanner({ kind: "unknown" }, 1500);
              unknownSinceRef.current = now + 1500;
            }
          }
        }
      }
    } catch {
      /* bitta kadr xatosi — davom etamiz */
    }
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
      streamRef.current = await startCamera(videoRef.current!, face);
      await document.documentElement.requestFullscreen?.().catch(() => {});
      await requestWake();
      beep("again"); // iOS: ovozni foydalanuvchi bosishi bilan "uyg'otamiz"
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

  const bannerStyle =
    banner.kind === "in"
      ? "bg-emerald-500/25 border-emerald-400/60"
      : banner.kind === "late" || (banner.kind === "out" && banner.early)
        ? "bg-amber-500/25 border-amber-400/60"
        : banner.kind === "out"
          ? "bg-sky-500/25 border-sky-400/60"
          : banner.kind === "unknown"
            ? "bg-red-500/20 border-red-400/50"
            : "bg-[#0D1430]/70 border-white/10";

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
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-black/50 border border-white/10 p-1 backdrop-blur">
            {modeBtn("auto", "AVTO")}
            {modeBtn("in", "KELDI")}
            {modeBtn("out", "KETDI")}
          </div>
        </div>
      </div>

      {(!online || pending > 0) && (
        <div className="absolute top-32 sm:top-36 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/40 px-4 py-1.5 text-sm text-amber-200">
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
                <div className="mt-2 text-sm text-slate-400">Birinchi marta ~7 MB yuklanadi, keyingi safar tez ochiladi.</div>
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
                  <div>• <b className="text-slate-200">AVTO</b>: kelganda — KELDI, {settingsRef.current.min_stay} daqiqadan keyin — KETDI</div>
                  <div>• Kirish va chiqish eshigi alohida bo'lsa — KELDI yoki KETDI ni tanlang</div>
                  <div>• Telefonni yuz balandligiga, yorug' joyga qo'ying; quvvatga ulang</div>
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
          <div className={`mx-auto max-w-3xl rounded-3xl border px-6 py-5 sm:py-7 text-center backdrop-blur transition-colors duration-150 ${bannerStyle}`}>
            {banner.kind === "idle" && <div className="text-xl sm:text-3xl font-semibold text-slate-200">Kameraga qarang</div>}
            {banner.kind === "closer" && <div className="text-xl sm:text-3xl font-semibold text-slate-200">Yaqinroq keling</div>}
            {(banner.kind === "in" || banner.kind === "late") && (
              <>
                <div className={`flex items-center justify-center gap-3 ${banner.kind === "in" ? "text-emerald-300" : "text-amber-200"}`}>
                  {banner.kind === "in" ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  <span className="text-lg sm:text-2xl font-semibold">{banner.kind === "in" ? "KELDI · Xush kelibsiz!" : "KELDI · Kechikdingiz"}</span>
                </div>
                <div className="mt-2 text-3xl sm:text-5xl font-bold">{banner.name}</div>
                <div className="mt-2 text-lg sm:text-2xl text-slate-200">{banner.cls} · {banner.time}</div>
              </>
            )}
            {banner.kind === "out" && (
              <>
                <div className={`flex items-center justify-center gap-3 ${banner.early ? "text-amber-200" : "text-sky-300"}`}>
                  <DoorOpen className="w-8 h-8" />
                  <span className="text-lg sm:text-2xl font-semibold">
                    {banner.early ? `KETDI · Erta (darslar ${banner.end ?? ""} da tugaydi)` : "KETDI · Yaxshi boring!"}
                  </span>
                </div>
                <div className="mt-2 text-3xl sm:text-5xl font-bold">{banner.name}</div>
                <div className="mt-2 text-lg sm:text-2xl text-slate-200">{banner.cls} · {banner.time}</div>
              </>
            )}
            {(banner.kind === "already_in" || banner.kind === "already_out") && (
              <>
                <div className="text-2xl sm:text-4xl font-bold">{banner.name}</div>
                <div className="mt-1 text-base sm:text-xl text-slate-300">
                  {banner.kind === "already_in" ? `Bugun keldi · ${banner.time}` : `Ketgan · ${banner.time}`}
                </div>
              </>
            )}
            {banner.kind === "unknown" && (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-red-200">Tanilmadi</div>
                <div className="mt-1 text-sm sm:text-lg text-slate-300">To'g'ri qarang yoki navbatchi o'qituvchiga murojaat qiling</div>
              </>
            )}
          </div>

          {events.length > 0 && (
            <div className="mx-auto max-w-3xl mt-3 flex gap-2 overflow-x-auto pb-1">
              {events.map((e) => (
                <div key={e.key} className="shrink-0 flex items-center gap-1.5 rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-sm">
                  {e.kind === "in" || e.kind === "late" ? (
                    <ArrowDownLeft className={`w-4 h-4 ${e.kind === "late" ? "text-amber-300" : "text-emerald-300"}`} />
                  ) : (
                    <ArrowUpRight className={`w-4 h-4 ${e.kind === "early" ? "text-amber-300" : "text-sky-300"}`} />
                  )}
                  {e.name.split(" ").slice(0, 2).join(" ")} · {e.class_name} · {e.time}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
