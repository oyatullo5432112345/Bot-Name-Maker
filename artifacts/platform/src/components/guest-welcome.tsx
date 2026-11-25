// Mehmon rejimi: o'ngdan markazga kirib, 10 soniya "Xush kelibsiz!" yozuvi va ovoz bilan turadi, keyin chapga chiqadi.
// Rejim yoqilgan paytda har 5 daqiqada qaytariladi. Faqat mehmon rejimi yoqilganda ko'rinadi.
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "talim_guest_mode";
export const readGuest = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
};
export const writeGuest = (v: boolean) => {
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
};

const ENTER_MS = 1100;   // o'ngdan markazga kirish
const HOLD_MS = 10000;   // markazda to'xtash (pauza)
const EXIT_MS = 950;     // chapga chiqish
const CYCLE_MS = 5 * 60 * 1000; // har 5 daqiqada qaytarish

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, now + i * 0.12);
      g.gain.setValueAtTime(0.001, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.2);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + i * 0.12); o.stop(now + i * 0.12 + 1.3);
    });
  } catch { /* ovoz ishlamasa jim o'tadi */ }
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang.toLowerCase().includes("uz"))
      || voices.find((x) => x.lang.toLowerCase().includes("tr"))
      || voices.find((x) => x.lang.toLowerCase().includes("ru"))
      || voices[0];
    if (v) u.voice = v;
    u.lang = "uz-UZ"; u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function GuestWelcome({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"off" | "enter" | "hold" | "exit">("off");
  const [left, setLeft] = useState(10);
  const timers = useRef<number[]>([]);
  const iv = useRef<number | null>(null);

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (iv.current) { window.clearInterval(iv.current); iv.current = null; }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  };

  const run = () => {
    clearAll();
    setPhase("enter");
    setLeft(10);
    timers.current.push(window.setTimeout(() => {
      setPhase("hold");
      playChime();
      speak("Xush kelibsiz aziz mehmonlar");
      const start = Date.now();
      iv.current = window.setInterval(() => {
        const rem = Math.max(0, HOLD_MS - (Date.now() - start));
        setLeft(Math.ceil(rem / 100) / 10);
      }, 100);
      timers.current.push(window.setTimeout(() => {
        if (iv.current) { window.clearInterval(iv.current); iv.current = null; }
        setLeft(0);
        setPhase("exit");
        timers.current.push(window.setTimeout(() => setPhase("off"), EXIT_MS));
      }, HOLD_MS));
    }, ENTER_MS));
  };

  useEffect(() => {
    if (!active) { clearAll(); setPhase("off"); return; }
    run();
    const cyc = window.setInterval(run, CYCLE_MS);
    return () => { window.clearInterval(cyc); clearAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || phase === "off") return null;

  const anim =
    phase === "enter" ? "gw-enter 1.1s cubic-bezier(0.22,1,0.36,1) forwards"
    : phase === "hold" ? "gw-hold 2.5s ease-in-out infinite"
    : "gw-exit 0.95s cubic-bezier(0.55,0,1,0.45) forwards";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes gw-enter{0%{transform:translateX(110vw) scale(.6);opacity:0}65%{transform:translateX(-25px) scale(1.06);opacity:1}82%{transform:translateX(12px) scale(.98)}100%{transform:translateX(0) scale(1);opacity:1}}
        @keyframes gw-hold{0%,100%{transform:translateX(0) scale(1)}50%{transform:translateX(0) scale(1.03)}}
        @keyframes gw-exit{0%{transform:translateX(0) scale(1);opacity:1}20%{transform:translateX(20px) scale(1.03);opacity:1}100%{transform:translateX(-110vw) scale(.7);opacity:0}}
      `}</style>
      <div
        style={{ animation: anim }}
        className="flex flex-col items-center text-center px-8 py-8 rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-indigo-500/40 shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)] max-w-2xl w-[90%]"
      >
        <h2 className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-br from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent pb-2">
          Xush kelibsiz!
        </h2>
        <p className="text-base sm:text-xl text-indigo-200/80 font-medium mt-2">Aziz mehmonlar, tashrifingizdan xursandmiz</p>
        {phase === "hold" && (
          <p className="mt-6 text-sm text-indigo-300 font-semibold">Pauza: {left.toFixed(1)} soniya</p>
        )}
      </div>
    </div>
  );
}
