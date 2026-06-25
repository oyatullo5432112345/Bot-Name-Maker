import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

interface BirthdayPerson {
  full_name: string;
  type: "staff" | "student";
  info: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Direktor", teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari", zavuch: "Zavuch", zam_direktor: "Direktor o'rinbosari",
  kutubxonachi: "Kutubxonachi", mudir: "Mudir",
};

function Confetti({ count = 60 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      life: 1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.life -= 0.004;
        if (p.y < canvas.height + 20 && p.life > 0) alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

export function BirthdayBanner() {
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("birthday_dismissed") === new Date().toDateString()
  );

  const { data: people = [] } = useQuery<BirthdayPerson[]>({
    queryKey: ["birthdays-today"],
    queryFn: async () => {
      const t = getToken();
      if (!t) return [];
      const r = await fetch(`${API_BASE}/birthdays/today`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) return [];
      return r.json() as Promise<BirthdayPerson[]>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const show = people.length > 0 && !dismissed;

  function dismiss() {
    sessionStorage.setItem("birthday_dismissed", new Date().toDateString());
    setDismissed(true);
  }

  return (
    <>
      <AnimatePresence>
        {show && (
          <>
            <Confetti />
            <motion.div
              key="birthday-banner"
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="fixed top-4 left-1/2 z-[101] w-full max-w-sm px-4"
              style={{ transform: "translateX(-50%)" }}
            >
              <div
                className="rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #6C3FC8 0%, #E040FB 50%, #FF6B6B 100%)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div className="px-5 pt-4 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                      className="text-4xl"
                    >
                      🎂
                    </motion.div>
                    <button
                      onClick={dismiss}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-white font-bold text-base mb-1">
                    🎉 Bugun tug'ilgan kun!
                  </p>

                  <div className="space-y-2 mt-3">
                    {people.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="flex items-center gap-2.5 bg-white/15 rounded-xl px-3 py-2.5"
                      >
                        <span className="text-xl">{p.type === "staff" ? "👨‍🏫" : "🎓"}</span>
                        <div>
                          <p className="text-white text-sm font-bold">{p.full_name}</p>
                          <p className="text-white/70 text-xs">
                            {p.type === "staff"
                              ? (ROLE_LABELS[p.info] ?? p.info)
                              : `${p.info} sinf o'quvchisi`}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-white/60 text-xs mt-3 text-center">
                    Sizga omad va muvaffaqiyatlar tilaymiz! 🌟
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
