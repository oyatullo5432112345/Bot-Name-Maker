// Yuz skaneri halqasi: 60 ta tik (bajarilgani yashil), markazda yuz ovali, pastda ko'rsatma.
// Kamera ustiga qo'yiladi (pointer-events yo'q — tugmalarga xalaqit bermaydi).

export function FaceRingOverlay({ done, total, hint }: { done: number; total: number; hint: string }) {
  const frac = total ? Math.min(1, done / total) : 0;
  const TICKS = 60;
  const lit = Math.round(frac * TICKS);
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const r1 = 118, r2 = i % 5 === 0 ? 136 : 132;
    const x1 = 200 + r1 * Math.cos(a), y1 = 150 + r1 * Math.sin(a);
    const x2 = 200 + r2 * Math.cos(a), y2 = 150 + r2 * Math.sin(a);
    return { x1, y1, x2, y2, on: i < lit };
  });

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <style>{`
        @keyframes ft-scan { 0%{transform:translateY(-70px)} 100%{transform:translateY(70px)} }
        @keyframes ft-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
      `}</style>
      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <clipPath id="ft-oval"><ellipse cx="200" cy="150" rx="66" ry="88" /></clipPath>
        </defs>
        {/* fon xira */}
        <rect width="400" height="300" fill="rgba(2,6,23,.35)" />
        {/* ticklar */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.on ? "#34e0a1" : "rgba(255,255,255,.28)"}
            strokeWidth={t.on ? 3.4 : 2.2} strokeLinecap="round"
            style={t.on ? { filter: "drop-shadow(0 0 4px #34e0a1)" } : undefined} />
        ))}
        {/* yuz ovali (yo'riqnoma) */}
        <ellipse cx="200" cy="150" rx="66" ry="88" fill="none"
          stroke={frac >= 1 ? "#34e0a1" : "rgba(125,243,255,.8)"} strokeWidth="2.5" strokeDasharray="6 6"
          style={{ animation: "ft-pulse 2.4s ease-in-out infinite" }} />
        {/* skanerlash chizig'i */}
        <g clipPath="url(#ft-oval)">
          <rect x="130" y="150" width="140" height="3" fill="#bdf8ff" opacity=".9"
            style={{ animation: "ft-scan 1.6s ease-in-out infinite alternate" }} />
        </g>
      </svg>

      {/* pastki ko'rsatma va hisoblagich */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white text-center">
        <div className="font-semibold text-sm sm:text-base drop-shadow">{hint}</div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold tabular-nums">
          <span className="text-emerald-400">{done}</span>/{total} burchak
        </div>
      </div>
    </div>
  );
}
