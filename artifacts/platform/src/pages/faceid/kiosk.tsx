// Face ID kiosk — maktab kirishiga qo'yiladigan telefon/planshet.
// Admin "Bugungi Face ID ni boshlash" ni bosadi → shu sahifa to'liq ekranda ochiladi.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ScanFace, CheckCircle2, Clock, XCircle, LogOut, SwitchCamera, WifiOff, Loader2, UserCheck } from "lucide-react";
import { api, beep, bestMatches, detectFace, loadFaceApi, startCamera, stopCamera, type Person } from "@/lib/face";

interface Settings {
  late_after: string;
  notify: boolean;
  threshold: number;
}

interface Arrival {
  login: string;
  name: string;
  class_name: string;
  time: string;
  status: string;
}

type Banner =
  | { kind: "idle" }
  | { kind: "closer" }
  | { kind: "ok" | "late"; name: string; cls: string; time: string }
  | { kind: "already"; name: string; cls: string; time: string }
  | { kind: "unknown" };

const QUEUE_KEY = "faceid_queue";
const CONFIRM_FRAMES = 3; // ketma-ket shuncha kadrda bir xil odam → tasdiq
const MARGIN = 0.06; // 1-va 2-eng yaqin odam orasidagi minimal farq
const SCAN_EVERY_MS = 280;

function readQueue(): { student_login: string; distance: number; device: string }[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: unknown[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* e'tiborsiz */
  }
}

function nowClock(): string {
  return new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export default function FaceKioskPage() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const peopleRef = useRef<Person[]>([]);
  const settingsRef = useRef<Settings>({ late_after: "08:00", notify: true, threshold: 0.48 });
  const candRef = useRef<{ login: string; count: number } | null>(null);
  const unknownSinceRef = useRef<number | null>(null);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const bannerUntilRef = useRef(0);
  const runningRef = useRef(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const facingRef = useRef<"user" | "environment">("user");

  const [phase, setPhase] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [progress, setProgress] = useState("Tayyorlanmoqda…");
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [banner, setBanner] = useState<Banner>({ kind: "idle" });
  const [recent, setRecent] = useState<Arrival[]>([]);
  const [arrived, setArrived] = useState(0);
  const [enrolled, setEnrolled] = useState(0);
  const [pending, setPending] = useState(readQueue().length);
  const [clock, setClock] = useState(nowClock());
  const [online, setOnline] = useState(navigator.onLine);

  // ── Yuz izlarini serverdan olish
  const loadPeople = useCallback(async () => {
    const data = await api<{ date: string; settings: Settings; people: Person[] }>("/faceid/descriptors");
    peopleRef.current = data.people;
    settingsRef.current = data.settings;
    setEnrolled(data.people.length);
    setArrived(data.people.filter((p) => p.arrived).length);
  }, []);

  // ── Boshlang'ich yuklash
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fa] = await Promise.all([loadFaceApi((m) => alive && setProgress(m)), loadPeople()]);
        faceapiRef.current = fa;
        if (alive) setPhase("ready");
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setPhase("error");
        }
      }
    })();
    const t = setInterval(() => setClock(nowClock()), 1000);
    const refresh = setInterval(() => void loadPeople().catch(() => {}), 10 * 60 * 1000);
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
      const rest: typeof q = [];
      for (const item of q) {
        try {
          await api("/faceid/checkin", { method: "POST", body: JSON.stringify(item) });
        } catch (e) {
          if ((e as { status?: number }).status === undefined || (e as { status?: number }).status! >= 500) rest.push(item);
        }
      }
      writeQueue(rest);
      setPending(rest.length);
    }, 10_000);
    return () => clearInterval(t);
  }, []);

  const showBanner = (b: Banner, ms = 3200) => {
    setBanner(b);
    bannerUntilRef.current = Date.now() + ms;
  };

  // ── Yuz ramkasini chizish (video object-cover bo'yicha)
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
    if (facingRef.current === "user") x = cw - x - w; // oynadek aks
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

  // ── Tasdiqlangan o'quvchini belgilash
  const checkin = async (p: Person, d: number) => {
    const last = cooldownRef.current.get(p.login) ?? 0;
    if (Date.now() - last < 60_000) return;
    cooldownRef.current.set(p.login, Date.now());

    if (p.arrived) {
      showBanner({ kind: "already", name: p.name, cls: p.class_name, time: p.arrived }, 2200);
      beep("again");
      return;
    }
    const payload = { student_login: p.login, distance: Number(d.toFixed(3)), device: navigator.userAgent.slice(0, 60) };
    try {
      const r = await api<{ ok?: boolean; already?: boolean; name: string; class_name: string; time: string; status: string }>(
        "/faceid/checkin",
        { method: "POST", body: JSON.stringify(payload) }
      );
      p.arrived = r.time;
      if (r.already) {
        showBanner({ kind: "already", name: r.name, cls: r.class_name, time: r.time }, 2200);
        beep("again");
        return;
      }
      const kind = r.status === "late" ? "late" : "ok";
      showBanner({ kind, name: r.name, cls: r.class_name, time: r.time });
      beep(kind);
      setArrived((n) => n + 1);
      setRecent((list) => [{ login: p.login, name: r.name, class_name: r.class_name, time: r.time, status: r.status }, ...list].slice(0, 12));
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === undefined || status >= 500) {
        // Internet/server yo'q — navbatga qo'yamiz, keyin yuboriladi
        const q = readQueue();
        q.push(payload);
        writeQueue(q);
        setPending(q.length);
        const time = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
        p.arrived = time;
        showBanner({ kind: "ok", name: p.name, cls: p.class_name, time });
        beep("ok");
        setArrived((n) => n + 1);
        setRecent((list) => [{ login: p.login, name: p.name, class_name: p.class_name, time, status: "present" }, ...list].slice(0, 12));
      } else {
        showBanner({ kind: "unknown" }, 2000);
        beep("error");
      }
    }
  };

  // ── Asosiy sikl
  const loop = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const fa = faceapiRef.current;
    try {
      if (video && fa && video.readyState >= 2) {
        const face = await detectFace(fa, video);
        const now = Date.now();
        if (!face) {
          candRef.current = null;
          unknownSinceRef.current = null;
          drawBox(null, "");
          if (now > bannerUntilRef.current) setBanner({ kind: "idle" });
        } else if (face.box.width < video.videoWidth * 0.16) {
          // Juda uzoqda — yaqinroq kelsin
          candRef.current = null;
          drawBox(face.box, "#94A3B8");
          if (now > bannerUntilRef.current) setBanner({ kind: "closer" });
        } else {
          const { best, second } = bestMatches(face.descriptor, peopleRef.current);
          const th = settingsRef.current.threshold;
          const confident = best && best.d < th && second - best.d > MARGIN;
          if (confident) {
            unknownSinceRef.current = null;
            const c = candRef.current;
            candRef.current = c && c.login === best.p.login ? { login: c.login, count: c.count + 1 } : { login: best.p.login, count: 1 };
            drawBox(face.box, "#22D3EE");
            if (candRef.current.count >= CONFIRM_FRAMES) {
              candRef.current = null;
              await checkin(best.p, best.d);
            }
          } else {
            candRef.current = null;
            drawBox(face.box, "#F59E0B");
            unknownSinceRef.current ??= now;
            if (now - unknownSinceRef.current > 2500 && now > bannerUntilRef.current) {
              showBanner({ kind: "unknown" }, 2000);
              unknownSinceRef.current = now + 2000;
            }
          }
        }
      }
    } catch {
      /* bitta kadr xatosi — davom etamiz */
    }
    setTimeout(() => void loop(), SCAN_EVERY_MS);
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

  const start = async (face: "user" | "environment" = facing) => {
    facingRef.current = face;
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
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await start(next);
  };

  const exit = () => {
    if (!confirm("Face ID kioskidan chiqasizmi?")) return;
    runningRef.current = false;
    stopCamera(streamRef.current);
    void document.exitFullscreen?.().catch(() => {});
    navigate("/faceid");
  };

  const date = new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 bg-[#05070F] text-white overflow-hidden select-none">
      {/* Kamera */}
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
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 sm:px-8 pt-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0">
            <ScanFace className="w-6 h-6 text-[#05070F]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-bold tracking-[0.2em]">FACE ID · DAVOMAT</div>
            <div className="text-xs sm:text-sm text-slate-300 capitalize truncate">{date}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right">
            <div className="text-2xl sm:text-4xl font-bold tabular-nums leading-none">{clock}</div>
            <div className="text-xs sm:text-sm text-slate-300 mt-1">
              <UserCheck className="inline w-4 h-4 mr-1 -mt-0.5" />
              <b className="text-white">{arrived}</b> / {enrolled} keldi
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

      {(!online || pending > 0) && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/40 px-4 py-1.5 text-sm text-amber-200">
          <WifiOff className="w-4 h-4" />
          {online ? `${pending} ta belgi yuborilmoqda…` : `Internet yo'q — ${pending} ta belgi saqlandi, keyin yuboriladi`}
        </div>
      )}

      {/* Yuklash / boshlash / xato */}
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
                <div className="mt-2 text-slate-300">{enrolled} ta o'quvchi ro'yxatda · kech qolish: {settingsRef.current.late_after} dan keyin</div>
                <div className="mt-4 text-sm text-slate-400 text-left space-y-1">
                  <div>• Telefonni eshik yoniga, yuz balandligida qo'ying</div>
                  <div>• Quvvatga ulab qo'ying — ekran o'chmaydi</div>
                  <div>• Yorug' joy tanlang, orqa fonda deraza bo'lmasin</div>
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
                <button onClick={() => location.reload()} className="mt-6 w-full rounded-2xl bg-white/10 py-3 font-semibold">
                  Qayta urinish
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Holat banneri */}
      {phase === "running" && (
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-8">
          <div
            className={`mx-auto max-w-3xl rounded-3xl border px-6 py-5 sm:py-7 text-center backdrop-blur transition-all duration-200 ${
              banner.kind === "ok"
                ? "bg-emerald-500/25 border-emerald-400/60"
                : banner.kind === "late"
                  ? "bg-amber-500/25 border-amber-400/60"
                  : banner.kind === "unknown"
                    ? "bg-red-500/20 border-red-400/50"
                    : "bg-[#0D1430]/70 border-white/10"
            }`}
          >
            {banner.kind === "idle" && (
              <div className="text-xl sm:text-3xl font-semibold text-slate-200">Kameraga qarang</div>
            )}
            {banner.kind === "closer" && (
              <div className="text-xl sm:text-3xl font-semibold text-slate-200">Yaqinroq keling</div>
            )}
            {(banner.kind === "ok" || banner.kind === "late") && (
              <>
                <div className="flex items-center justify-center gap-3 text-emerald-300">
                  {banner.kind === "ok" ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8 text-amber-300" />}
                  <span className={`text-lg sm:text-2xl font-semibold ${banner.kind === "late" ? "text-amber-200" : ""}`}>
                    {banner.kind === "ok" ? "Xush kelibsiz!" : "Kechikdingiz"}
                  </span>
                </div>
                <div className="mt-2 text-3xl sm:text-5xl font-bold">{banner.name}</div>
                <div className="mt-2 text-lg sm:text-2xl text-slate-200">
                  {banner.cls} · {banner.time}
                </div>
              </>
            )}
            {banner.kind === "already" && (
              <>
                <div className="text-2xl sm:text-4xl font-bold">{banner.name}</div>
                <div className="mt-1 text-base sm:text-xl text-slate-300">Bugun allaqachon belgilangan · {banner.time}</div>
              </>
            )}
            {banner.kind === "unknown" && (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-red-200">Tanilmadi</div>
                <div className="mt-1 text-sm sm:text-lg text-slate-300">To'g'ri qarang yoki navbatchi o'qituvchiga murojaat qiling</div>
              </>
            )}
          </div>

          {recent.length > 0 && (
            <div className="mx-auto max-w-3xl mt-3 flex gap-2 overflow-x-auto pb-1">
              {recent.map((r) => (
                <div key={r.login + r.time} className="shrink-0 rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-sm">
                  <span className={r.status === "late" ? "text-amber-300" : "text-emerald-300"}>●</span> {r.name.split(" ").slice(0, 2).join(" ")} · {r.class_name} · {r.time}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
