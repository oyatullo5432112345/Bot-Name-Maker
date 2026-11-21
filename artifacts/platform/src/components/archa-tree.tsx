// Archa (yangi yil daraxti): bezaklar tanlanadi, joylashtiriladi va localStorage'da saqlanadi.
// Bu komponent ham arxa sahifada, ham bosh sahifa kartasida ishlatiladi.

import type { MouseEvent } from "react";

export type OrnType = "ball-red" | "ball-gold" | "ball-blue" | "bell" | "candy" | "gift" | "snow" | "bow";
export interface Orn { t: OrnType; x: number; y: number } // x,y — viewBox (0..200, 0..260) bo'yicha

export const ORN_LIST: { t: OrnType; label: string }[] = [
  { t: "ball-red", label: "Qizil shar" },
  { t: "ball-gold", label: "Oltin shar" },
  { t: "ball-blue", label: "Ko'k shar" },
  { t: "bell", label: "Qo'ng'iroq" },
  { t: "candy", label: "Nishon tayoqcha" },
  { t: "gift", label: "Sovg'a" },
  { t: "snow", label: "Qor parchasi" },
  { t: "bow", label: "Lenta" },
];

export const ARCHA_KEY = "talim_archa_v1";
export function loadArcha(): Orn[] {
  try { return JSON.parse(localStorage.getItem(ARCHA_KEY) || "[]") as Orn[]; } catch { return []; }
}
export function saveArcha(o: Orn[]) {
  try { localStorage.setItem(ARCHA_KEY, JSON.stringify(o)); } catch { /* ignore */ }
}

const COLORS: Record<OrnType, string> = {
  "ball-red": "#e11d48", "ball-gold": "#f5c542", "ball-blue": "#2563eb", bell: "#f59e0b",
  candy: "#ffffff", gift: "#f43f5e", snow: "#e0f2fe", bow: "#fb7185",
};

function Ornament({ o }: { o: Orn }) {
  const c = COLORS[o.t];
  switch (o.t) {
    case "ball-red":
    case "ball-gold":
    case "ball-blue":
      return (
        <g>
          <line x1={o.x} y1={o.y - 14} x2={o.x} y2={o.y - 8} stroke="#94a3b8" strokeWidth="1" />
          <circle cx={o.x} cy={o.y} r="6" fill={c} stroke="#ffffff55" strokeWidth="1" />
          <circle cx={o.x - 2} cy={o.y - 2} r="1.6" fill="#ffffffaa" />
        </g>
      );
    case "bell":
      return <path d={`M${o.x - 5} ${o.y + 4} Q${o.x} ${o.y - 9} ${o.x + 5} ${o.y + 4} Z`} fill={c} stroke="#92400e" strokeWidth=".6" />;
    case "candy":
      return <path d={`M${o.x} ${o.y - 6} q 3 -3 4 0 q 1 3 -2 4 l -4 -1`} fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />;
    case "gift":
      return (
        <g>
          <rect x={o.x - 5} y={o.y - 5} width="10" height="10" fill={c} />
          <rect x={o.x - 5} y={o.y - 1} width="10" height="1.6" fill="#fde68a" />
          <rect x={o.x - .8} y={o.y - 5} width="1.6" height="10" fill="#fde68a" />
        </g>
      );
    case "snow":
      return (
        <g stroke={c} strokeWidth="1" fill="none">
          {[0, 60, 120].map((a) => (
            <line key={a} x1={o.x} y1={o.y - 5} x2={o.x} y2={o.y + 5} transform={`rotate(${a} ${o.x} ${o.y})`} />
          ))}
        </g>
      );
    case "bow":
      return (
        <g fill={c}>
          <path d={`M${o.x} ${o.y} L${o.x - 6} ${o.y - 4} L${o.x - 6} ${o.y + 4} Z`} />
          <path d={`M${o.x} ${o.y} L${o.x + 6} ${o.y - 4} L${o.x + 6} ${o.y + 4} Z`} />
          <circle cx={o.x} cy={o.y} r="1.6" fill="#be123c" />
        </g>
      );
  }
}

// Tanlash tugmasi uchun kichik bezak belgisi
export function OrnamentIcon({ t }: { t: OrnType }) {
  return (
    <svg viewBox="80 112 40 40" width="26" height="26" aria-hidden>
      <Ornament o={{ t, x: 100, y: 132 }} />
    </svg>
  );
}

export function ArchaTree({ ornaments, onPlace, onStarClick, showStar = true, className = "" }: {
  ornaments: Orn[];
  onPlace?: (x: number, y: number) => void;
  onStarClick?: () => void;
  showStar?: boolean;
  className?: string;
}) {
  const handle = (e: MouseEvent<SVGSVGElement>) => {
    if (!onPlace) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200;
    const y = ((e.clientY - r.top) / r.height) * 260;
    // faqat daraxt ichida joylashtiriladi
    if (y < 40 || y > 232) return;
    onPlace(Math.round(x), Math.round(y));
  };
  return (
    <svg viewBox="0 0 200 260" className={className} onClick={handle} role="img" aria-label="Yangi yil archasi">
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22c55e" /><stop offset="1" stopColor="#14532d" />
        </linearGradient>
      </defs>
      {/* tanasi */}
      <rect x="92" y="222" width="16" height="24" rx="2" fill="#7c3f1d" />
      {/* qatlamlar */}
      <polygon points="100,30 40,110 160,110" fill="url(#leaf)" />
      <polygon points="100,70 28,160 172,160" fill="url(#leaf)" />
      <polygon points="100,120 20,230 180,230" fill="url(#leaf)" />
      {/* yulduz */}
      {showStar && (
        <polygon
          onClick={(e) => { e.stopPropagation(); onStarClick?.(); }}
          points="100,6 106,20 121,20 109,29 113,43 100,35 87,43 91,29 79,20 94,20"
          fill="#fde047" stroke="#f59e0b" strokeWidth=".8" style={{ cursor: onStarClick ? "pointer" : "default" }}
        />
      )}
      {ornaments.map((o, i) => <Ornament key={i} o={o} />)}
    </svg>
  );
}
