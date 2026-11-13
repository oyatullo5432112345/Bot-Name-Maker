// Qishki bezaklar: qor yog'ishi, chiroqlar guirlandasi, bosh sahifa banneri va yoqish/o'chirish tugmasi
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Snowflake, Sparkles } from "lucide-react";
import { useSeason } from "@/lib/season";
import { useTheme } from "@/lib/theme";
import { WinterGarland } from "@/components/winter-garland";

// To'liq ekranli sahifalarda (Face ID kiosk) bezak ko'rsatilmaydi
const useHideDecor = () => {
  const [location] = useLocation();
  return location.startsWith("/faceid/kiosk");
};

interface Flake { x: number; y: number; r: number; vy: number; sway: number; phase: number; a: number }

/** Yengil canvas qor: sichqoncha/touch'ga xalaqit bermaydi, tab yopiq bo'lsa to'xtaydi, "kamroq harakat" sozlamasiga bo'ysunadi */
export function Snowfall() {
  const { winter } = useSeason();
  const { theme } = useTheme();
  const hidden = useHideDecor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const active = winter && !hidden;

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0, h = 0, raf = 0, last = performance.now();
    let flakes: Flake[] = [];

    const make = (initial: boolean): Flake => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : -10,
      r: 1 + Math.random() * 2.6,
      vy: 18 + Math.random() * 34,
      sway: 8 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      a: 0.45 + Math.random() * 0.45,
    });

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
      flakes = Array.from({ length: Math.min(90, Math.round(w / 16)) }, () => make(true));
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      const rgb = themeRef.current === "dark" ? "255,255,255" : "110,165,225";
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.phase += dt;
        if (f.y > h + 10) Object.assign(f, make(false));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${f.a})`;
        ctx.arc(f.x + Math.sin(f.phase) * f.sway, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-30 pointer-events-none" />;
}

/** Tepadagi burchaklarda realistik archa guirlandasi */
export function WinterLights() {
  const { winter } = useSeason();
  const hidden = useHideDecor();
  if (!winter || hidden) return null;
  return <WinterGarland />;
}

/** Yoqish / o'chirish tugmasi (sarlavhada) */
export function WinterToggle({ className = "" }: { className?: string }) {
  const { winter, toggleWinter } = useSeason();
  return (
    <button
      type="button"
      onClick={toggleWinter}
      aria-pressed={winter}
      title={winter ? "Qishki bezakni o'chirish" : "Qishki bezakni yoqish"}
      className={`flex items-center justify-center rounded-lg transition-colors hover:bg-accent ${winter ? "text-sky-500" : "text-muted-foreground hover:text-foreground"} ${className}`}
    >
      <Snowflake className="w-4 h-4" />
    </button>
  );
}

const WINTER_TIPS = [
  "Issiq kiyining — sog'liq eng katta boylik 🧣",
  "Qishki kechalar kitob o'qish uchun juda yaxshi 📚",
  "Ertalab yengil mashq qilish qishda ham quvvat beradi 💪",
  "Iliq choy va yaxshi kitob — qishning eng yaxshi dugonalari ☕",
  "Qor ostida ham bilim o'sadi — bugun yangi narsa o'rganing ✨",
  "Ko'proq suv iching va vitaminga boy mevalarni unutmang 🍊",
  "Yo'lda ehtiyot bo'ling, muz toydiradi ⛸️",
];

function winterMessage(now: Date): { big: string; unit: string; label: string } {
  const month = now.getMonth();
  const day = now.getDate();
  const MS = 86_400_000;
  const startOfToday = new Date(now.getFullYear(), month, day).getTime();

  if (month >= 10) { // noyabr–dekabr → Yangi yilgacha
    const ny = new Date(now.getFullYear() + 1, 0, 1).getTime();
    return { big: String(Math.round((ny - startOfToday) / MS)), unit: "kun", label: "Yangi yilgacha 🎄" };
  }
  if (month === 0 && day <= 10) return { big: "🎉", unit: "", label: "Yangi yil muborak bo'lsin!" };
  const spring = new Date(now.getFullYear(), 2, 1).getTime(); // yanvar oxiri – fevral → bahorgacha
  return { big: String(Math.max(0, Math.round((spring - startOfToday) / MS))), unit: "kun", label: "Bahorgacha 🌱" };
}

/** Bosh sahifadagi qishki banner */
export function WinterBanner() {
  const { winter, setWinter } = useSeason();
  if (!winter) return null;

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const tip = WINTER_TIPS[dayOfYear % WINTER_TIPS.length]!;
  const msg = winterMessage(now);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/15 via-cyan-400/10 to-indigo-500/10 p-4 sm:p-5">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25">
          <Snowflake className="w-6 h-6 winter-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-sky-600 dark:text-sky-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Qishki mavsum</p>
          <p className="text-sm font-medium mt-0.5 leading-snug">{tip}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black tabular-nums leading-none text-sky-600 dark:text-sky-300">{msg.big}<span className="text-sm font-semibold ml-1">{msg.unit}</span></p>
          <p className="text-[11px] text-muted-foreground mt-1">{msg.label}</p>
        </div>
      </div>
      <button
        type="button" onClick={() => setWinter(false)}
        className="relative mt-3 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Qishki bezakni o'chirish
      </button>
    </div>
  );
}
