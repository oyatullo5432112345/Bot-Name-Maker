import { useEffect, useState } from "react";

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "yuklanmoqda..." }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState(".");

  // Fake progress: tez boshlanib, sekin tugaydi
  useEffect(() => {
    const steps = [
      { target: 30, duration: 400 },
      { target: 55, duration: 600 },
      { target: 72, duration: 700 },
      { target: 85, duration: 900 },
      { target: 93, duration: 1200 },
      { target: 97, duration: 2000 },
    ];

    let current = 0;
    let timer: ReturnType<typeof setTimeout>;

    function runStep(index: number) {
      if (index >= steps.length) return;
      const { target, duration } = steps[index];
      const start = current;
      const diff = target - start;
      const startTime = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        current = Math.round(start + diff * eased);
        setProgress(current);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          timer = setTimeout(() => runStep(index + 1), 80);
        }
      };
      requestAnimationFrame(tick);
    }

    runStep(0);
    return () => clearTimeout(timer);
  }, []);

  // Uchta nuqta animatsiyasi
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 420);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d2137 70%, #0f172a 100%)",
        gap: 0,
      }}
    >
      {/* Glow orbs */}
      <div style={{
        position: "absolute", width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
        top: "10%", left: "10%", filter: "blur(40px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        bottom: "10%", right: "10%", filter: "blur(40px)", pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{
        width: 88, height: 88, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28,
        boxShadow: "0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.4)",
        animation: "logo-pulse 2.5s ease-in-out infinite",
      }}>
        <img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, objectFit: "contain" }} />
      </div>

      {/* Maktab nomi */}
      <p style={{
        color: "rgba(147,197,253,0.85)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
        Toshloq tumani 3-maktab
      </p>
      <h1 style={{
        color: "white",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        marginBottom: 36,
        textShadow: "0 0 30px rgba(99,179,237,0.35)",
      }}>
        Ta'lim Platform
      </h1>

      {/* Progress area */}
      <div style={{ width: "min(300px, 80vw)", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Foiz ko'rsatkichi */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            color: "rgba(147,197,253,0.7)",
            fontSize: 13,
            fontWeight: 500,
            fontStyle: "italic",
          }}>
            {label}{dots}
          </span>
          <span style={{
            color: "rgba(96,165,250,1)",
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            minWidth: 40,
            textAlign: "right",
          }}>
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%",
          height: 6,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%",
            borderRadius: 9999,
            background: "linear-gradient(90deg, #3b82f6, #6366f1, #06b6d4)",
            width: `${progress}%`,
            transition: "width 0.12s ease-out",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Shimmer effect */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              animation: "shimmer 1.4s linear infinite",
              backgroundSize: "200% 100%",
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 60px rgba(99,102,241,0.4), 0 8px 32px rgba(0,0,0,0.4); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
