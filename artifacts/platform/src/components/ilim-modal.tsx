// Ilim O'quv Markazi — "Tez kunda" modal
// Platformaga kirganida bir marta avtomatik ko'rinadi
// Sidebar tugmasi ham ochishi mumkin

export function IlimModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes ilim-float {
          0%, 100% { transform: translateY(0px) rotate(-3deg) scale(1); }
          50%       { transform: translateY(-10px) rotate(3deg) scale(1.05); }
        }
        @keyframes ilim-pulse-green {
          0%, 100% { opacity: 1; text-shadow: 0 0 12px #22c55e88; }
          50%       { opacity: 0.6; text-shadow: 0 0 24px #22c55ecc; }
        }
        @keyframes ilim-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes ilim-slide-up {
          0%   { opacity: 0; transform: translateY(32px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ilim-orbit {
          0%   { transform: rotate(0deg)   translateX(38px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #0d1b2a 0%, #112240 55%, #0a3d62 100%)",
            animation: "ilim-slide-up 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Stars */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 22 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: 1 + (i % 3),
                  height: 1 + (i % 3),
                  left: `${(i * 19 + 7) % 94}%`,
                  top:  `${(i * 27 + 5) % 88}%`,
                  animation: `ilim-twinkle ${1.5 + (i % 4) * 0.6}s ease-in-out ${(i * 0.28) % 2.5}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Glow blobs */}
          <div
            className="absolute -top-12 -left-12 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, #22c55e22 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, #3b82f622 0%, transparent 70%)" }}
          />

          <div className="relative z-10 p-8 text-center">

            {/* Orbiting stars around icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Orbiting dot 1 */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "ilim-orbit 4s linear infinite" }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              </div>
              {/* Orbiting dot 2 */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "ilim-orbit 4s linear 2s infinite" }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: "#60a5fa", boxShadow: "0 0 5px #60a5fa" }} />
              </div>

              {/* Book icon */}
              <div
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{
                    background: "linear-gradient(135deg, #1e40af, #1d4ed8, #2563eb)",
                    boxShadow: "0 0 30px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
                    animation: "ilim-float 3.5s ease-in-out infinite",
                  }}
                >
                  📚
                </div>
              </div>
            </div>

            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{
                background: "linear-gradient(135deg, #166534, #15803d)",
                color: "#bbf7d0",
                border: "1px solid #22c55e44",
                boxShadow: "0 0 12px #22c55e22",
              }}
            >
              🎓 O'quv Markazi
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
              Ilim O'quv Markazi
            </h2>

            {/* Subtitle */}
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
              Bilimga intilganlar uchun maxsus platforma
            </p>

            {/* "Coming soon" card */}
            <div
              className="rounded-2xl p-5 mb-6 text-left space-y-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <p className="text-sm text-white leading-relaxed">
                Ushbu bo'lim hozirda tayyorlanmoqda.
              </p>

              <p
                className="text-base font-bold"
                style={{ animation: "ilim-pulse-green 2s ease-in-out infinite", color: "#22c55e" }}
              >
                ✨ Tez kunda ishga tushadi!
              </p>

              <div className="space-y-1.5 pt-1">
                {[
                  "📖 Yangi kurslar va darsliklar",
                  "🏆 Sertifikatlar va diplomlar",
                  "🎯 Interaktiv vazifalar",
                  "🚀 Va ko'p narsalar kutmoqda!",
                ].map(item => (
                  <p key={item} className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {item}
                  </p>
                ))}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "white",
                boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
