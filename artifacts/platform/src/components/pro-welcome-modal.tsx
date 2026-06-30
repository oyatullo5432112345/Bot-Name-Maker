import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";

function daysLeft(isoDate: string): number {
  const ms = new Date(isoDate).getTime();
  if (isNaN(ms)) return 0;
  return Math.max(0, Math.ceil((ms - Date.now()) / 86400000));
}

function isProActive(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  const ms = new Date(isoDate).getTime();
  if (isNaN(ms)) return false;
  return ms > Date.now();
}

export function ProWelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isProActive(user?.pro_expires_at)) return;
    const key = `pro_welcome_shown_${user!.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setOpen(true);
  }, [user?.id, user?.pro_expires_at]);

  if (!open || !user?.pro_expires_at) return null;

  const days = daysLeft(user.pro_expires_at);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setOpen(false)}
      >
        {/* Card */}
        <div
          className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Stars background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: 1 + (i % 3),
                  height: 1 + (i % 3),
                  left: `${(i * 17 + 5) % 95}%`,
                  top: `${(i * 23 + 8) % 80}%`,
                  opacity: 0.3 + (i % 4) * 0.15,
                  animation: `twinkle ${2 + (i % 3)}s ease-in-out ${(i * 0.3) % 2}s infinite`,
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.9; }
            }
            @keyframes float-star {
              0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
              50% { transform: translateY(-8px) rotate(10deg) scale(1.1); }
            }
            @keyframes shine {
              0% { left: -100%; }
              100% { left: 200%; }
            }
          `}</style>

          <div className="relative z-10 p-8 text-center">
            {/* Star icon */}
            <div
              className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                animation: "float-star 3s ease-in-out infinite",
                boxShadow: "0 0 40px rgba(245,158,11,0.5)",
              }}
            >
              ⭐
            </div>

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
            >
              <span>PRO VERSIYA</span>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
              3 oy Pro faollashtirildi!
            </h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>
              Xush kelibsiz, <span className="font-semibold text-white">{user.full_name}</span>!<br />
              Sizga maxsus Pro status berildi.
            </p>

            {/* Days counter */}
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <p className="text-5xl font-black mb-1" style={{ color: "#f59e0b" }}>{days}</p>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>kun qoldi</p>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6 text-left">
              {[
                "Barcha funksiyalarga to'liq kirish",
                "Maxsus ⭐ Pro nishon",
                "Birinchi foydalanuvchilar orasida",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                  <span style={{ color: "#f59e0b" }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            {/* Button */}
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
            >
              <span className="relative z-10">Boshlash 🚀</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
