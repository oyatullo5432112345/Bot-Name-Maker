// ============================================================
//  "SAYOHAT" — umumiy animatsiyali vizual qismlar (SVG)
//  Rasm/video fayl yuklanmaydi — hammasi kod bilan chiziladi.
// ============================================================
import { Star } from "lucide-react";
import { Link } from "wouter";

export const sayohatStyles = `
  @keyframes drift      { from { transform: translateX(-10%); } to { transform: translateX(110%); } }
  @keyframes floaty     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes bobble     { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
  @keyframes wavehand   { 0%,100% { transform: rotate(8deg); } 50% { transform: rotate(-22deg); } }
  @keyframes pulseNode  { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,.5); } 50% { transform: scale(1.08); box-shadow: 0 0 18px 4px rgba(255,255,255,.35); } }
  @keyframes popIn      { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes shimmer    { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes risefade   { 0% { transform: translateY(14px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

  .s-cloud  { animation: drift linear infinite; }
  .s-floaty { animation: floaty 3s ease-in-out infinite; }
  .s-bobble { animation: bobble 2.6s ease-in-out infinite; }
  .s-wave   { transform-origin: 70% 70%; animation: wavehand 1.4s ease-in-out infinite; }
  .s-node-live { animation: pulseNode 2s ease-in-out infinite; }
  .s-pop    { animation: popIn .5s cubic-bezier(.2,1.4,.5,1) both; }
  .s-rise   { animation: risefade .5s ease-out both; }
`;

// ------------------------------------------------------------
//  Bek / Lola — oddiy, chiroyli SVG xarakter
// ------------------------------------------------------------
export function Avatar({
  character,
  size = 96,
  wave = false,
}: {
  character: "bek" | "lola";
  size?: number;
  wave?: boolean;
}) {
  const isLola = character === "lola";
  const skin = "#F7C9A0";
  const body = isLola ? "#DB2777" : "#2563EB";
  const bodyDark = isLola ? "#9D174D" : "#1E40AF";
  const hair = isLola ? "#4C1D95" : "#111827";

  return (
    <svg viewBox="0 0 100 120" width={size} height={(size * 120) / 100} style={{ overflow: "visible" }}>
      {/* soya */}
      <ellipse cx="50" cy="114" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />

      {/* tana */}
      <path d="M30 72 Q50 64 70 72 L74 104 Q50 112 26 104 Z" fill={body} />
      <path d="M30 72 Q50 64 70 72 L71 82 Q50 76 29 82 Z" fill={bodyDark} opacity="0.5" />

      {/* chap qo'l */}
      <rect x="22" y="74" width="9" height="26" rx="4.5" fill={skin} />
      {/* o'ng qo'l (salom beradi) */}
      <g className={wave ? "s-wave" : undefined}>
        <rect x="69" y="74" width="9" height="26" rx="4.5" fill={skin} />
        <circle cx="73.5" cy="74" r="6" fill={skin} />
      </g>

      {/* bo'yin */}
      <rect x="45" y="56" width="10" height="12" rx="4" fill={skin} />

      {/* soch (orqa) */}
      {isLola ? (
        <path d="M24 44 Q24 14 50 14 Q76 14 76 44 L76 60 Q70 50 68 44 Q68 26 50 26 Q32 26 32 44 Q30 50 24 60 Z" fill={hair} />
      ) : (
        <path d="M27 42 Q27 15 50 15 Q73 15 73 42 L73 48 Q66 34 50 34 Q34 34 27 48 Z" fill={hair} />
      )}

      {/* bosh */}
      <circle cx="50" cy="42" r="22" fill={skin} />

      {/* soch (old) */}
      {isLola ? (
        <path d="M28 40 Q30 20 50 20 Q70 20 72 40 Q64 30 50 30 Q36 30 28 40 Z" fill={hair} />
      ) : (
        <path d="M30 38 Q33 22 50 22 Q67 22 70 38 Q60 30 50 30 Q40 30 30 38 Z" fill={hair} />
      )}
      {isLola && <circle cx="74" cy="34" r="6" fill="#F472B6" stroke="#fff" strokeWidth="1.5" />}

      {/* ko'zlar */}
      <circle cx="42" cy="44" r="3.2" fill="#1F2937" />
      <circle cx="58" cy="44" r="3.2" fill="#1F2937" />
      <circle cx="43" cy="43" r="1" fill="#fff" />
      <circle cx="59" cy="43" r="1" fill="#fff" />

      {/* yonoqlar */}
      <circle cx="36" cy="50" r="3" fill="#FB7185" opacity="0.5" />
      <circle cx="64" cy="50" r="3" fill="#FB7185" opacity="0.5" />

      {/* tabassum */}
      <path d="M43 52 Q50 59 57 52" fill="none" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------
//  Suzuvchi bulutlar
// ------------------------------------------------------------
function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <svg width={70 * scale} height={34 * scale} viewBox="0 0 70 34" fill="#ffffff">
      <ellipse cx="22" cy="22" rx="18" ry="12" />
      <ellipse cx="40" cy="18" rx="20" ry="15" />
      <ellipse cx="54" cy="24" rx="14" ry="10" />
    </svg>
  );
}

export function Clouds() {
  const rows = [
    { top: "8%", dur: 34, scale: 1, op: 0.85 },
    { top: "24%", dur: 48, scale: 0.7, op: 0.6 },
    { top: "40%", dur: 60, scale: 1.2, op: 0.5 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {rows.map((r, i) => (
        <div
          key={i}
          className="s-cloud absolute"
          style={{ top: r.top, animationDuration: `${r.dur}s`, opacity: r.op, animationDelay: `${-i * 8}s` }}
        >
          <Cloud scale={r.scale} />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
//  Sahna foni — gradient osmon + quyosh + tepaliklar
// ------------------------------------------------------------
export function SceneBg({ color, accent }: { color: string; accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${accent}22 0%, ${color}44 55%, ${color}66 100%)` }} />
      {/* quyosh */}
      <div className="absolute s-floaty" style={{ right: "10%", top: "8%" }}>
        <div className="w-16 h-16 rounded-full" style={{ background: `radial-gradient(circle, #FDE68A, ${accent})`, boxShadow: `0 0 40px ${accent}aa` }} />
      </div>
      <Clouds />
      {/* tepaliklar */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 90" preserveAspectRatio="none" style={{ height: 90 }}>
        <path d="M0 60 Q100 20 200 55 Q300 85 400 45 L400 90 L0 90 Z" fill={color} opacity="0.55" />
        <path d="M0 75 Q120 45 240 70 Q320 86 400 65 L400 90 L0 90 Z" fill={color} opacity="0.85" />
      </svg>
    </div>
  );
}

// ------------------------------------------------------------
//  Qulflangan ekran (o'yin vaqtincha yopilganda)
// ------------------------------------------------------------
export function LockedScreen() {
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-4">
      <style>{sayohatStyles}</style>
      <div className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg s-floaty" style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>
        <span className="text-5xl">🔒</span>
      </div>
      <h2 className="font-black text-2xl">Sayohat tez kunda!</h2>
      <p className="text-sm text-muted-foreground">O'yin hozircha qulflangan. Tez orada ochiladi — kuzatib boring! 🧭</p>
      <Link href="/dashboard">
        <button className="px-5 py-3 rounded-2xl bg-secondary text-sm font-bold cursor-pointer">Bosh sahifaga</button>
      </Link>
    </div>
  );
}

// ------------------------------------------------------------
//  Yulduzlar qatori
// ------------------------------------------------------------
export function StarRow({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={s <= value ? "fill-amber-400 text-amber-400" : "text-white/25"}
        />
      ))}
    </div>
  );
}
