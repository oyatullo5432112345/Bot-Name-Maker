// Qishki bezaklar: qor yog'ishi, chiroqlar guirlandasi (kompyuterda murakkab, telefonda oddiy), bosh sahifa banneri va yoqish/o'chirish tugmasi
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Snowflake, Sparkles, Zap, BellRing } from "lucide-react";
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
      flakes = Array.from({ length: Math.min(100, Math.round(w / 15)) }, () => make(true));
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      // Mavzuga qarab qor rangi
      const rgb = themeRef.current === "dark" ? "230, 242, 255" : "70, 130, 180";
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
  return <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-30 pointer-events-none opacity-70" />;
}

/**
 * Telefon uchun sodda archa chiziqlari (eskisi kabi).
 */
function MobileGarland() {
  return (
    <svg aria-hidden viewBox="0 0 100 10" className="fixed inset-x-0 top-0 z-[25] h-10 w-full lg:hidden opacity-80" preserveAspectRatio="none">
      <path d="M0 2Q5 8 10 2T20 2T30 2T40 2T50 2T60 2T70 2T80 2T90 2T100 2" fill="none" stroke="#6ee7b7" strokeWidth="0.5" />
      <path d="M0 0Q5 6 10 0T20 0T30 0T40 0T50 0T60 0T70 0T80 0T90 0T100 0" fill="none" stroke="#166534" strokeWidth="1" />
      {[5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((x,i) => (
        <circle key={i} cx={x} cy="1" r="1.5" fill={i%2===0 ? "#b91c1c" : "#fef3c7"} />
      ))}
    </svg>
  );
}

/**
 * Kompyuter uchun murakkab, realistik archa novdasi effekti.
 * Ikkita burchakdan (chap va o'ng) qor bosgan shoxlar va chiroqlar osilib turadi.
 */
function DesktopBranchDecor() {
  // SVG filtrlari (qor effekti uchun)
  const Filters = () => (
    <defs>
      <filter id="snowy-blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
      </filter>
    </defs>
  );

  const Branch = ({ side }: { side: 'left' | 'right' }) => {
    const transform = side === 'right' ? 'scale(-1, 1) translate(-100, 0)' : '';
    
    // Tasodifiy chiroqlar va ignalar yaratish
    const lights = Array.from({ length: 25 }).map((_, i) => ({
      cx: 10 + Math.random() * 80,
      cy: 15 + Math.random() * 45,
      r: 0.8 + Math.random() * 1,
      color: ['#fffbeb', '#fecaca', '#bfdbfe', '#dbeafe'][Math.floor(Math.random() * 4)],
      delay: Math.random() * 5
    }));

    return (
      <svg width="350" height="150" viewBox="0 0 100 100" className="absolute top-0 z-[25] pointer-events-none text-green-900" style={{ [side]: -20 }} preserveAspectRatio="none">
        <Filters />
        <g transform={transform}>
          {/* Asosiy shox (qalinroq egri chiziqlar) */}
          <path d="M0 0 C 20 40, 50 60, 100 50" stroke="currentColor" strokeWidth="6" fill="none" className="text-green-950" />
          <path d="M0 10 C 25 50, 55 70, 95 60" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.7" />
          
          {/* Mayda ignalar/shoxchalar */}
          {Array.from({length: 15}).map((_,i) => {
            const path = `M${i*6} ${i*3} L${i*6+15} ${i*3+10}`;
            return <path key={i} d={path} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />;
          })}

          {/* Qor qatlami (ustki chiziqlar, blur qilingan) */}
          <path d="M0 0 C 20 40, 50 60, 100 50" stroke="white" strokeWidth="8" fill="none" filter="url(#snowy-blur)" opacity="0.8" transform="translate(0,-2)" />
          <path d="M-5 5 L105 35" stroke="white" strokeWidth="3" fill="none" filter="url(#snowy-blur)" opacity="0.9"/>

          {/* Chiroqlar (Gyrlandalar) */}
          <style>{`@keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; }}`}</style>
          {lights.map((l, i) => (
            <circle
              key={i}
              cx={l.cx}
              cy={l.cy}
              r={l.r}
              fill={l.color}
              style={{ animation: `blink 3s infinite ${l.delay}s` }}
              filter="url(#snowy-blur)" // Chiroqlarga ham yumshoq nur beradi
            />
          ))}
          
          {/* Bir ikkita osilgan sharlar/bezaklar */}
          <g className="text-red-700">
            <circle cx="70" cy="55" r="3" fill="currentColor" />
            <path d="M70 52 L70 45" stroke="#d1d5db" strokeWidth="0.5" />
            <circle cx="40" cy="35" r="2" fill="#b45309" /> {/* Oltin rangli */}
          </g>
        </g>
      </svg>
    );
  };

  return (
    <div className="fixed inset-x-0 top-0 h-[150px] w-full hidden lg:block overflow-hidden opacity-90">
      <Branch side="left" />
      <Branch side="right" />
    </div>
  );
}

export function WinterLights() {
  const { winter } = useSeason();
  const hidden = useHideDecor();
  if (!winter || hidden) return null;
  return (
    <>
      <MobileGarland />
      <DesktopBranchDecor />
    </>
  );
}

/** Yoqish / o'chirish tugmasi (sarlavhada) */
export function WinterToggle({ className = "" }: { className?: string }) {
  const { winter, toggleWinter } = useSeason();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={toggleWinter}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-pressed={winter}
      title={winter ? "Qishki bezakni o'chirish" : "Qishki bezakni yoqish"}
      className={`relative flex items-center justify-center rounded-full transition-all duration-300 w-9 h-9 ${winter ? "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 shadow-inner" : "hover:bg-accent text-muted-foreground hover:text-foreground"} ${className}`}
    >
      {winter ? (
        <Snowflake className={`w-5 h-5 ${isHovered ? 'rotate-90 transition-transform' : ''}`} />
      ) : (
        <BellRing className={`w-5 h-5 ${isHovered ? 'animate-ring' : ''}`} />
      )}
      {/* Kichkina "yoniq" nuqtasi */}
      {winter && <span className="absolute right-1.5 top-1.5 block w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>}
      
      <style>{`@keyframes ring { 0% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 50% { transform: rotate(-15deg); } 75% { transform: rotate(10deg); } 100% { transform: rotate(0deg); } } .animate-ring { animation: ring 0.5s ease-in-out; }`}</style>
    </button>
  );
}

const WINTER_TIPS = [
  "Issiq kiyining — sog'liq eng katta boylik 🧣",
  "Yangi yil archasini bezashni unutmang 🎄",
  "Qish ta'tilidan unumli foydalaning ⛷️",
  "Iliq choy va yaxshi kitob — qishning eng yaxshi dugonalari ☕",
  "Derazadagi qish andazalariga qarang ❄️",
  "Vitamin C iste'molini oshiring 🍊",
  "Yaqinlaringizni bayram bilan tabriklang ✨",
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
    <div className="relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-white to-sky-50 dark:from-gray-900 dark:to-gray-950 p-5 shadow-xl shadow-sky-500/5">
      {/* Orqa fondagi abstrakt shakllar */}
      <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-400/10 blur-2xl" />
      
      <div className="relative flex items-center gap-5">
        {/* Chap ikonka */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-sky-300 to-sky-500 p-0.5 shadow-lg shadow-sky-500/30">
            <div className="w-full h-full rounded-[22px] bg-white dark:bg-gray-900 flex items-center justify-center">
              <Snowflake className="w-8 h-8 text-sky-500 animate-pulse" />
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 absolute -top-2 -right-2 rotate-12" />
        </div>

        {/* O'rta matn (Maslahat) */}
        <div className="min-w-0 flex-1 py-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-900 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300 mb-2.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Qishki kayfiyat</span>
          </div>
          <p className="text-base font-bold text-gray-950 dark:text-white leading-tight">{tip}</p>
        </div>

        {/* O'ng tomon (Taymer) */}
        <div className="text-right shrink-0 pl-4 border-l border-gray-200 dark:border-gray-800">
          <p className="text-5xl font-extrabold tabular-nums leading-none text-sky-600 dark:text-sky-400 drop-shadow-sm">
            {msg.big}
          </p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1.5">{msg.unit}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{msg.label}</p>
        </div>
      </div>

      {/* O'chirish tugmasi */}
      <button
        type="button" onClick={() => setWinter(false)}
        className="relative mt-4 w-full text-center text-xs text-gray-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 transition-colors"
      >
        Qishki bezakni vaqtincha o'chirish ✕
      </button>
    </div>
  );
}
