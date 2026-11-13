// Realistik archa guirlandasi: burchakdagi archa shoxlari, holly barglari va rezavorlar,
// qamish konfetlar, oltin yulduzchalar, yaltiroq osilgan sharlar va miltillovchi chiroqlar.
// Hammasi SVG (rasm fayl yo'q) — shuning uchun yengil va har qanday ekranda aniq.

interface Pt { x: number; y: number }
interface Branch { p0: Pt; p1: Pt; p2: Pt; steps: number; len: number }

// Deterministik "tasodif" — har yuklanishda bir xil ko'rinish
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);
const bez = (b: Branch, t: number): Pt => ({
  x: (1 - t) ** 2 * b.p0.x + 2 * (1 - t) * t * b.p1.x + t * t * b.p2.x,
  y: (1 - t) ** 2 * b.p0.y + 2 * (1 - t) * t * b.p1.y + t * t * b.p2.y,
});
const bezTan = (b: Branch, t: number): Pt => ({
  x: 2 * (1 - t) * (b.p1.x - b.p0.x) + 2 * t * (b.p2.x - b.p1.x),
  y: 2 * (1 - t) * (b.p1.y - b.p0.y) + 2 * t * (b.p2.y - b.p1.y),
});

const BRANCHES: Branch[] = [
  { p0: { x: -14, y: 10 }, p1: { x: 110, y: 34 }, p2: { x: 292, y: 12 }, steps: 72, len: 17 }, // yuqori bo'ylab
  { p0: { x: -6, y: -6 }, p1: { x: 26, y: 70 }, p2: { x: 58, y: 142 }, steps: 46, len: 16 },   // chap tomonga pastga
  { p0: { x: -10, y: -4 }, p1: { x: 96, y: 6 }, p2: { x: 196, y: 92 }, steps: 46, len: 16 },   // diagonal
  { p0: { x: 40, y: 6 }, p1: { x: 92, y: 46 }, p2: { x: 134, y: 90 }, steps: 28, len: 14 },    // to'ldiruvchi
];

// Archa ignalari: 3 xil yashil tusda, chuqurlik hosil qilish uchun alohida qatlamlarda
const NEEDLES = (() => {
  const r = rng(20261113);
  const g = { dark: "", mid: "", light: "" };
  const stems: string[] = [];
  for (const b of BRANCHES) {
    stems.push(`M${f1(b.p0.x)} ${f1(b.p0.y)} Q${f1(b.p1.x)} ${f1(b.p1.y)} ${f1(b.p2.x)} ${f1(b.p2.y)}`);
    for (let k = 0; k <= b.steps; k++) {
      const t = k / b.steps;
      const p = bez(b, t);
      const tg = bezTan(b, t);
      const base = Math.atan2(tg.y, tg.x);
      const taper = 1 - 0.4 * t;
      for (const side of [-1, 1]) {
        for (let j = 0; j < 3; j++) {
          const ang = base + side * (0.7 + r() * 0.7);
          const L = b.len * (0.55 + r() * 0.6) * taper;
          const seg = `M${f1(p.x)} ${f1(p.y)}L${f1(p.x + Math.cos(ang) * L)} ${f1(p.y + Math.sin(ang) * L)}`;
          const pick = r();
          if (pick < 0.4) g.dark += seg; else if (pick < 0.78) g.mid += seg; else g.light += seg;
        }
      }
    }
  }
  return { ...g, stems: stems.join("") };
})();

// Holly bargi (o'tkir qirrali)
function hollyPath(len: number, w: number): string {
  const n = 8;
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * len;
    const edge = i === 0 || i === n;
    const hw = edge ? 0 : Math.sin(Math.PI * (i / n)) ** 0.7 * w * (i % 2 ? 1 : 0.62);
    top.push(`${f1(x)} ${f1(-hw)}`);
    bot.unshift(`${f1(x)} ${f1(hw)}`);
  }
  return `M${top.join("L")}L${bot.join("L")}Z`;
}

function starPoints(cx: number, cy: number, R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? R * 0.42 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${f1(cx + Math.cos(a) * rad)},${f1(cy + Math.sin(a) * rad)}`);
  }
  return pts.join(" ");
}

// Holly klasterlari: [x, y, burchak, uzunlik, kenglik]
const LEAVES: [number, number, number, number, number][] = [
  [58, 46, -25, 42, 13], [60, 52, 40, 38, 12], [66, 40, -70, 36, 11], [50, 40, 12, 32, 10],
  [208, 24, -15, 30, 9.5], [210, 28, 50, 28, 9],
];
const BERRIES: [number, number, number][] = [
  [58, 50, 5.6], [66, 57, 5.2], [65, 44, 5], [72, 50, 4.6],
  [213, 28, 4.4], [219, 33, 4.2], [217, 23, 4],
];
const STARS: [number, number, number][] = [
  [96, 24, 7], [152, 38, 6], [28, 102, 6], [256, 30, 6], [184, 60, 5], [44, 82, 5], [128, 70, 5],
];
const CANES: { x: number; y: number; rot: number; s: number }[] = [
  { x: 112, y: 44, rot: -22, s: 1 },
  { x: 236, y: 34, rot: 24, s: 0.88 },
];
const BULBS: { t: number; color: string; delay: number }[] = [
  { t: 0.07, color: "#fde68a", delay: 0 }, { t: 0.2, color: "#fca5a5", delay: 0.5 },
  { t: 0.34, color: "#93c5fd", delay: 1.0 }, { t: 0.48, color: "#fde68a", delay: 0.3 },
  { t: 0.62, color: "#bbf7d0", delay: 0.8 }, { t: 0.77, color: "#fca5a5", delay: 0.2 },
  { t: 0.92, color: "#fde68a", delay: 0.6 },
];

interface Bauble { sx: number; sy: number; cy: number; r: number; tone: "gold" | "red"; delay: number }
const BAUBLES: Bauble[] = [
  { sx: 44, sy: 74, cy: 148, r: 17, tone: "gold", delay: 0 },
  { sx: 112, sy: 50, cy: 116, r: 14, tone: "red", delay: 0.9 },
  { sx: 208, sy: 30, cy: 76, r: 10, tone: "gold", delay: 0.4 },
  { sx: 262, sy: 20, cy: 62, r: 9, tone: "red", delay: 1.3 },
];

/** Osilgan ip uchun to'lqinsimon oltin tola */
function twine(sx: number, sy: number, ey: number): string {
  let d = `M${f1(sx)} ${f1(sy)}`;
  for (let y = sy + 3; y <= ey; y += 3) d += `L${f1(sx + Math.sin((y - sy) / 3.2) * 2.2)} ${f1(y)}`;
  return d;
}

function BaubleSvg({ id, b, i }: { id: string; b: Bauble; i: number }) {
  const top = b.cy - b.r;
  const fill = `url(#${id}-${b.tone})`;
  const swirl = b.tone === "gold" ? "rgba(92,46,0,.55)" : "rgba(255,210,170,.5)";
  return (
    <g className="winter-swing" style={{ transformOrigin: `${b.sx}px ${b.sy}px`, animationDelay: `${b.delay}s` }}>
      <line x1={b.sx} y1={b.sy} x2={b.sx} y2={top - 8} stroke="#8a5a0b" strokeWidth=".8" />
      <path d={twine(b.sx, b.sy, top - 8)} stroke="#e3b34d" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx={b.sx} cy={top - 8} r="2.6" fill="none" stroke="#d4a53a" strokeWidth="1.2" />
      <rect x={b.sx - 5} y={top - 6} width="10" height="6.5" rx="1.2" fill={`url(#${id}-cap)`} />
      <path d={`M${b.sx - 5} ${top - 3.4}h10M${b.sx - 5} ${top - 1.2}h10`} stroke="#7a5208" strokeWidth=".6" opacity=".7" />
      <circle cx={b.sx} cy={b.cy} r={b.r} fill={fill} />
      <clipPath id={`${id}-c${i}`}><circle cx={b.sx} cy={b.cy} r={b.r} /></clipPath>
      <g clipPath={`url(#${id}-c${i})`}>
        <g transform={`translate(${b.sx} ${b.cy}) scale(${b.r / 20})`} fill="none" stroke={swirl} strokeWidth="1.6" strokeLinecap="round">
          <path d="M-18 -4C-10 -17 3 -14 5 -6C7 2 -4 6 -8 0C-10 -4 -4 -8 0 -4" />
          <path d="M18 6C10 19 -3 16 -5 8C-7 0 4 -4 8 2C10 6 4 10 0 6" />
          <path d="M-14 12C-8 6 -2 8 0 14M6 -16C10 -12 14 -12 17 -8" />
          <path d="M-19 3H19" strokeOpacity=".6" />
        </g>
      </g>
      <ellipse cx={b.sx - b.r * 0.38} cy={b.cy - b.r * 0.42} rx={b.r * 0.26} ry={b.r * 0.4} fill="#fff" opacity=".55" transform={`rotate(-35 ${b.sx - b.r * 0.38} ${b.cy - b.r * 0.42})`} />
      <ellipse cx={b.sx + b.r * 0.3} cy={b.cy + b.r * 0.62} rx={b.r * 0.42} ry={b.r * 0.14} fill="#fff" opacity=".18" />
    </g>
  );
}

function Corner({ id, className }: { id: string; className: string }) {
  const bulbPts = BULBS.map((bl) => ({ ...bl, ...bez(BRANCHES[0]!, bl.t) }));
  return (
    <svg aria-hidden viewBox="0 0 300 190" className={className}>
      <defs>
        <radialGradient id={`${id}-gold`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff6c2" /><stop offset=".25" stopColor="#f4c542" /><stop offset=".62" stopColor="#c58a12" /><stop offset="1" stopColor="#5e3a05" /></radialGradient>
        <radialGradient id={`${id}-red`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ffb3a0" /><stop offset=".25" stopColor="#e5483c" /><stop offset=".62" stopColor="#a8141b" /><stop offset="1" stopColor="#40080c" /></radialGradient>
        <radialGradient id={`${id}-berry`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ff9a8c" /><stop offset=".45" stopColor="#d11a22" /><stop offset="1" stopColor="#6a090f" /></radialGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38a257" /><stop offset="1" stopColor="#0d4724" /></linearGradient>
        <linearGradient id={`${id}-star`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3a6" /><stop offset="1" stopColor="#e09a14" /></linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f7d774" /><stop offset=".5" stopColor="#c8921a" /><stop offset="1" stopColor="#8a5c0c" /></linearGradient>
        <linearGradient id={`${id}-bow`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ef4444" /><stop offset="1" stopColor="#8f1117" /></linearGradient>
      </defs>

      {/* Archa shoxlari */}
      <path d={NEEDLES.stems} stroke="#3b2a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={NEEDLES.dark} stroke="#0b3a21" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={NEEDLES.mid} stroke="#15803d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={NEEDLES.light} stroke="#4bb26a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".9" />

      {/* Bant (kichik qizil bant) */}
      <g transform="translate(176 30) rotate(-8)">
        <path d="M0 0C-16 -12 -20 9 0 3Z" fill={`url(#${id}-bow)`} />
        <path d="M0 0C16 -12 20 9 0 3Z" fill={`url(#${id}-bow)`} />
        <path d="M-2 3L-10 20L-3 16L0 22L2 3Z" fill="#a31219" />
        <path d="M2 3L12 18L5 15L1 21Z" fill="#8f1117" />
        <circle cx="0" cy="1.6" r="3" fill="#c81e25" />
      </g>

      {/* Qamish konfetlar */}
      {CANES.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.s})`} fill="none" strokeLinecap="round">
          <path d="M0 30V8a6 6 0 0 1 12 0" stroke="#6b0f14" strokeOpacity=".4" strokeWidth="6" />
          <path d="M0 30V8a6 6 0 0 1 12 0" stroke="#fff" strokeWidth="4.6" />
          <path d="M0 30V8a6 6 0 0 1 12 0" stroke="#d3202a" strokeWidth="4.6" strokeDasharray="3.4 3.4" />
        </g>
      ))}

      {/* Holly barglari */}
      {LEAVES.map(([x, y, rot, len, w], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <path d={hollyPath(len, w)} fill={`url(#${id}-leaf)`} stroke="#0a3a1d" strokeWidth=".8" strokeLinejoin="round" />
          <path d={`M2 0L${f1(len - 4)} 0`} stroke="#b8e6a6" strokeOpacity=".55" strokeWidth=".9" />
        </g>
      ))}

      {/* Qizil rezavorlar */}
      {BERRIES.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={`url(#${id}-berry)`} />
          <ellipse cx={x - r * 0.3} cy={y - r * 0.38} rx={r * 0.3} ry={r * 0.2} fill="#fff" opacity=".7" />
        </g>
      ))}

      {/* Oltin yulduzchalar */}
      {STARS.map(([x, y, R], i) => (
        <polygon key={i} points={starPoints(x, y, R)} fill={`url(#${id}-star)`} stroke="#b97a0c" strokeWidth=".5" strokeLinejoin="round" />
      ))}

      {/* Miltillovchi chiroqlar */}
      {bulbPts.map((b, i) => (
        <g key={i} className="winter-bulb" style={{ animationDelay: `${b.delay}s` }}>
          <circle cx={b.x} cy={b.y + 3} r="7" fill={b.color} opacity=".25" />
          <circle cx={b.x} cy={b.y + 3} r="2.6" fill={b.color} />
          <circle cx={b.x - 0.7} cy={b.y + 2.3} r="0.9" fill="#fff" />
        </g>
      ))}

      {/* Osilgan yaltiroq sharlar */}
      {BAUBLES.map((b, i) => <BaubleSvg key={i} id={id} b={b} i={i} />)}
    </svg>
  );
}

export function WinterGarland() {
  return (
    <>
      <Corner id="wgl" className="winter-corner winter-corner-l" />
      <Corner id="wgr" className="winter-corner winter-corner-r" />
    </>
  );
}
