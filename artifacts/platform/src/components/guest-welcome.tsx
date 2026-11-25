// Mehmon rejimi: faqat "Xush kelibsiz" yozuvi o'ngdan markazga kirib, 10 soniya turadi va chapga chiqadi.
// Doimiy aylanadi. Ovoz: public/audio/xush-kelibsiz.mp3 (o'zbekcha). Fayl bo'lmasa — brauzer ovozi.
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "talim_guest_mode";
export const readGuest = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
};
export const writeGuest = (v: boolean) => {
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
};

const AUDIO_SRC = "/audio/xush-kelibsiz.mp3";
const ENTER_MS = 1000;   // o'ngdan markazga kirish
const HOLD_MS = 10000;   // markazda to'xtash
const EXIT_MS = 950;     // chapga chiqish

function speakFallback(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang.toLowerCase().startsWith("uz"))
      || voices.find((x) => x.lang.toLowerCase().startsWith("tr"))
      || voices.find((x) => x.lang.toLowerCase().startsWith("ru"))
      || voices[0];
    if (v) u.voice = v;
    u.lang = "uz-UZ"; u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function GuestWelcome({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"off" | "enter" | "hold" | "exit">("off");
  const timers = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  };

  const playVoice = () => {
    // Avval o'zbekcha mp3 fayl; yuklanmasa brauzer ovozi
    const a = new Audio(AUDIO_SRC);
    audioRef.current = a;
    a.onerror = () => speakFallback("Xush kelibsiz aziz mehmonlar");
    a.play().catch(() => speakFallback("Xush kelibsiz aziz mehmonlar"));
  };

  const cycle = () => {
    setPhase("enter");
    timers.current.push(window.setTimeout(() => {
      setPhase("hold");
      playVoice();
      timers.current.push(window.setTimeout(() => {
        setPhase("exit");
        timers.current.push(window.setTimeout(() => {
          setPhase("off");
          cycle(); // doimiy aylanadi
        }, EXIT_MS));
      }, HOLD_MS));
    }, ENTER_MS));
  };

  useEffect(() => {
    if (!active) { clearAll(); setPhase("off"); return; }
    cycle();
    return () => { clearAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || phase === "off") return null;

  const anim =
    phase === "enter" ? "gw-enter 1s cubic-bezier(0.22,1,0.36,1) forwards"
    : phase === "hold" ? "gw-hold 2.5s ease-in-out infinite"
    : "gw-exit 0.95s cubic-bezier(0.55,0,1,0.45) forwards";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes gw-enter{0%{transform:translateX(110vw) scale(.7);opacity:0}65%{transform:translateX(-20px) scale(1.05);opacity:1}82%{transform:translateX(10px) scale(.99)}100%{transform:translateX(0) scale(1);opacity:1}}
        @keyframes gw-hold{0%,100%{transform:translateX(0) scale(1)}50%{transform:translateX(0) scale(1.03)}}
        @keyframes gw-exit{0%{transform:translateX(0) scale(1);opacity:1}20%{transform:translateX(15px) scale(1.02);opacity:1}100%{transform:translateX(-110vw) scale(.75);opacity:0}}
      `}</style>
      <h2
        style={{ animation: anim }}
        className="text-center text-5xl sm:text-7xl md:text-8xl font-black tracking-tight bg-gradient-to-br from-white via-indigo-100 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_12px_32px_rgba(99,102,241,0.35)] px-4"
      >
        Xush kelibsiz
      </h2>
    </div>
  );
}
