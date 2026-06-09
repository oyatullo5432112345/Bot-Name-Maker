import { useEffect, useRef, useState } from "react";

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#f97316","#8b5cf6","#06b6d4","#84cc16"];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  shape: "circle" | "rect" | "star";
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

function useParticles(active: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const count = 80;
    const initial: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: -10,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      shape: (["circle", "rect", "star"] as const)[Math.floor(Math.random() * 3)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }));

    particlesRef.current = initial;
    setParticles([...initial]);

    const animate = () => {
      particlesRef.current = particlesRef.current.map(p => ({
        ...p,
        x: p.x + p.vx * 0.6,
        y: p.y + p.vy * 0.6,
        vy: p.vy + 0.08,
        rotation: p.rotation + p.rotationSpeed,
        opacity: p.y > 80 ? Math.max(0, p.opacity - 0.02) : p.opacity,
      })).filter(p => p.opacity > 0);

      setParticles([...particlesRef.current]);

      if (particlesRef.current.length > 0) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  return particles;
}

function StarShape({ size, color }: { size: number; color: string }) {
  const s = size;
  const points = Array.from({ length: 5 }, (_, i) => {
    const outer = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const inner = outer + (2 * Math.PI) / 10;
    return `${Math.cos(outer) * s},${Math.sin(outer) * s} ${Math.cos(inner) * s * 0.4},${Math.sin(inner) * s * 0.4}`;
  }).join(" ");
  return (
    <svg width={s * 2} height={s * 2} style={{ overflow: "visible" }}>
      <polygon points={points} fill={color} transform={`translate(${s},${s})`} />
    </svg>
  );
}

interface WelcomeAnimationProps {
  name: string;
  role?: string;
  onDone: () => void;
}

const ROLE_GREETINGS: Record<string, string> = {
  admin: "Administrator",
  director: "Direktor",
  mudir: "Obidov Boburjon",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  kutubxonachi: "Kutubxonachi",
  student: "O'quvchi",
};

const EMOJIS = ["🎉","✨","🌟","🎊","🏫","📚","🎓"];

export function WelcomeAnimation({ name, role, onDone }: WelcomeAnimationProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const particles = useParticles(phase !== "exit");

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 300);
    const t2 = setTimeout(() => setPhase("exit"), 2600);
    const t3 = setTimeout(() => onDoneRef.current(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const roleLabel = role ? ROLE_GREETINGS[role] : "";
  const emoji = useRef(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]).current;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #7c3aed 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.5s ease",
        opacity: phase === "exit" ? 0 : 1,
      }}
    >
      {/* Confetti particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              pointerEvents: "none",
            }}
          >
            {p.shape === "circle" && (
              <div style={{ width: p.size, height: p.size, borderRadius: "50%", background: p.color }} />
            )}
            {p.shape === "rect" && (
              <div style={{ width: p.size * 0.6, height: p.size * 1.4, background: p.color, borderRadius: 2 }} />
            )}
            {p.shape === "star" && <StarShape size={p.size / 2} color={p.color} />}
          </div>
        ))}
      </div>

      {/* Glowing circles background */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            width: `${300 + i * 150}px`,
            height: `${300 + i * 150}px`,
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            animation: `pulse-ring ${2 + i * 0.5}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%,-50%) scale(1.08); opacity: 0.15; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(3deg); opacity: 1; }
          80%  { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes slide-up {
          0%   { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer-text {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        @keyframes bounce-emoji {
          0%, 100% { transform: translateY(0) scale(1); }
          40%       { transform: translateY(-12px) scale(1.2); }
          70%       { transform: translateY(-4px) scale(1.05); }
        }
      `}</style>

      {/* Main content */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "20px", padding: "0 24px", textAlign: "center", position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{
          animation: phase === "show" ? "pop-in 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
          opacity: phase === "enter" ? 0 : 1,
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 0 0 8px rgba(255,255,255,0.05)",
          }}>
            <img src="/logo.png" alt="logo" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Ta'lim Platform text */}
        <div style={{
          animation: phase === "show" ? "slide-up 0.6s ease 0.2s both" : "none",
          opacity: phase === "enter" ? 0 : undefined,
        }}>
          <p style={{
            color: "rgba(255,255,255,0.75)", fontSize: "13px",
            fontWeight: 500, letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: "4px",
          }}>
            Toshloq tumani 3-maktab
          </p>
          <h1 style={{
            color: "white", fontSize: "clamp(28px, 6vw, 42px)",
            fontWeight: 800, letterSpacing: "-0.02em",
            margin: 0, lineHeight: 1.1,
            animation: "shimmer-text 2s ease-in-out infinite",
            textShadow: "0 2px 20px rgba(255,255,255,0.3)",
          }}>
            Ta'lim Platform
          </h1>
        </div>

        {/* Divider */}
        <div style={{
          width: 60, height: 2, background: "rgba(255,255,255,0.3)", borderRadius: 2,
          animation: phase === "show" ? "slide-up 0.6s ease 0.35s both" : "none",
          opacity: phase === "enter" ? 0 : undefined,
        }} />

        {/* Greeting */}
        <div style={{
          animation: phase === "show" ? "slide-up 0.6s ease 0.45s both" : "none",
          opacity: phase === "enter" ? 0 : undefined,
        }}>
          <div style={{ fontSize: "clamp(28px, 7vw, 40px)", animation: "bounce-emoji 1.2s ease-in-out infinite", display: "inline-block" }}>
            {emoji}
          </div>
          <p style={{
            color: "rgba(255,255,255,0.85)", fontSize: "14px",
            fontWeight: 500, margin: "8px 0 4px",
          }}>
            {roleLabel ? `${roleLabel} sifatida xush kelibsiz!` : "Xush kelibsiz!"}
          </p>
          <p style={{
            color: "white", fontSize: "clamp(20px, 5vw, 28px)",
            fontWeight: 700, margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.15)",
          }}>
            {name}
          </p>
        </div>

        {/* Loading dots */}
        <div style={{
          display: "flex", gap: "8px", marginTop: "8px",
          animation: phase === "show" ? "slide-up 0.6s ease 0.6s both" : "none",
          opacity: phase === "enter" ? 0 : undefined,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "rgba(255,255,255,0.6)",
              animation: `bounce-emoji 1s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
