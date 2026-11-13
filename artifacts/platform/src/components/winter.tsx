// Qishki bezaklar: qor yog'ishi, chiroqlar guirlandasi, bosh sahifa banneri va yoqish/o'chirish tugmasi
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Snowflake, Sparkles } from "lucide-react";
import { useSeason } from "@/lib/season";
import { useTheme } from "@/lib/theme";

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

type OrnamentKind = "ball" | "star" | "drop";
interface Ornament { left: number; len: number; kind: OrnamentKind; color: string; delay: number }

// Archa o'yinchoqlari: joylashuvi (% chapdan), ip uzunligi (px), turi, rangi
const ORNAMENTS: Ornament[] = [
  { left: 4,  len: 12, kind: "ball", color: "#ef4444", delay: 0 },
  { left: 13, len: 22, kind: "star", color: "#facc15", delay: 0.6 },
  { left: 22, len: 14, kind: "drop", color: "#38bdf8", delay: 1.2 },
  { left: 31, len: 26, kind: "ball", color: "#a855f7", delay: 0.3 },
  { left: 40, len: 12, kind: "star", color: "#f97316", delay: 0.9 },
  { left: 50, len: 20, kind: "ball", color: "#22c55e", delay: 1.5 },
  { left: 59, len: 14, kind: "drop", color: "#ec4899", delay: 0.2 },
  { left: 68, len: 24, kind: "star", color: "#facc15", delay: 1.0 },
  { left: 77, len: 12, kind: "ball", color: "#3b82f6", delay: 0.7 },
  { left: 86, len: 22, kind: "drop", color: "#ef4444", delay: 1.4 },
  { left: 95, len: 14, kind: "ball", color: "#f59e0b", delay: 0.5 },
];

function OrnamentSvg({ kind, color }: { kind: OrnamentKind; color: string }) {
  if (kind === "star") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <polygon points="10,1 12.6,7.4 19.5,7.9 14.2,12.3 15.9,19 10,15.3 4.1,19 5.8,12.3 0.5,7.9 7.4,7.4" fill={color} stroke="#fff" strokeOpacity=".55" strokeWidth=".8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "drop") {
    return (
      <svg width="16" height="22" viewBox="0 0 18 24">
        <rect x="6.5" y="0" width="5" height="3.5" rx="1" fill="#d4af37" />
        <path d="M9 4 C9 4 2 12 2 16.5 a7 7 0 0 0 14 0 C16 12 9 4 9 4Z" fill={color} />
        <ellipse cx="6.2" cy="14" rx="1.6" ry="3" fill="#fff" opacity=".45" transform="rotate(-20 6.2 14)" />
      </svg>
    );
  }
  return (
    <svg width="18" height="22" viewBox="0 0 18 22">
      <rect x="6.5" y="0" width="5" height="3.5" rx="1" fill="#d4af37" />
      <circle cx="9" cy="13" r="8.5" fill={color} />
      <path d="M1 13 Q9 17.5 17 13" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" />
      <ellipse cx="6.3" cy="9.6" rx="2.2" ry="3.1" fill="#fff" opacity=".45" transform="rotate(-30 6.3 9.6)" />
    </svg>
  );
}

/** Tepadagi archa shoxli guirlanda: yonib-o'chadigan chiroqlar va osilgan o'yinchoqlar */
export function WinterLights() {
  const { winter } = useSeason();
  const hidden = useHideDecor();
  if (!winter || hidden) return null;
  return (
    <>
      <div aria-hidden className="winter-lights" />
      {ORNAMENTS.map((o, i) => (
        <div
          key={i}
          aria-hidden
          className={`winter-orn${i % 2 ? " winter-orn-alt" : ""}`}
          style={{ left: `${o.left}%`, animationDelay: `${o.delay}s`, ["--len" as string]: `${o.len}px` }}
        >
          <span className="winter-orn-string" />
          <OrnamentSvg kind={o.kind} color={o.color} />
        </div>
      ))}
    </>
  );
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
