import { useState, useEffect, useRef } from "react";
import { X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "wc2026_banner_dismissed";

const MATCHES = [
  { opponent: "🇸🇦 Saudiya Arabistoni", score: "2 – 0", result: "G'alaba" },
  { opponent: "🇦🇪 BAA",               score: "2 – 1", result: "G'alaba" },
  { opponent: "🇶🇦 Qatar",             score: "3 – 1", result: "G'alaba" },
  { opponent: "🇰🇷 Janubiy Koreya",    score: "1 – 1", result: "Durrang"  },
  { opponent: "🇮🇷 Eron",              score: "1 – 0", result: "G'alaba" },
];

function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: ["#1C6CA8", "#FFFFFF", "#1DB954", "#F5C518", "#E63946"][
        Math.floor(Math.random() * 5)
      ],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            rotate: p.rotate,
          }}
          animate={{ y: ["0%", "120vh"], opacity: [1, 1, 0], rotate: p.rotate + 360 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export function WorldCupBanner() {
  const [visible, setVisible] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Gradient fon — O'zbekiston bayrog'i ranglari */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #1C6CA8 0%, #1C6CA8 33%, #ffffff 33%, #ffffff 66%, #1DB954 66%, #1DB954 100%)",
              opacity: 0.18,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f2a4a] via-[#1a3a60] to-[#0d2b1f]" />

          <Confetti count={36} />

          <div className="relative z-10 p-5 sm:p-6">
            {/* Yopish tugmasi */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-white/50 hover:text-white/90 transition-colors"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Asosiy kontent */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Emoji & Trophy */}
              <motion.div
                animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
                transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
                className="text-5xl sm:text-6xl select-none shrink-0"
              >
                🏆
              </motion.div>

              <div className="flex-1 text-center sm:text-left">
                {/* Sarlavha */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-2xl">🇺🇿</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                      O'ZBEKISTON — JAHON CHEMPIONATIDA!
                    </h2>
                    <span className="text-2xl">⚽</span>
                  </div>
                  <p className="text-white/80 text-sm sm:text-base font-medium">
                    <span className="text-yellow-300 font-bold">FIFA World Cup 2026</span>
                    {" "}— AQSh, Kanada, Meksika 🎉
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    Tarixiy yutuq! O'zbekiston birinchi marta jahon chempionatiga yo'l oldi!
                  </p>
                </motion.div>

                {/* Natijalar toggle */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-3"
                >
                  <button
                    onClick={() => setShowMatches((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-300 hover:text-yellow-200 transition-colors border border-yellow-300/40 hover:border-yellow-300/70 rounded-full px-3 py-1"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {showMatches ? "Natijalarni yashirish" : "O'yin natijalari"}
                  </button>
                </motion.div>

                {/* Natijalar jadvali */}
                <AnimatePresence>
                  {showMatches && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {MATCHES.map((m, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs"
                            style={{
                              background:
                                m.result === "G'alaba"
                                  ? "rgba(29,185,84,0.18)"
                                  : "rgba(255,255,255,0.08)",
                              border:
                                m.result === "G'alaba"
                                  ? "1px solid rgba(29,185,84,0.35)"
                                  : "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            <span className="text-white/90 font-medium truncate">{m.opponent}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-white font-bold font-mono">{m.score}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  m.result === "G'alaba"
                                    ? "bg-green-500/30 text-green-300"
                                    : "bg-white/10 text-white/60"
                                }`}
                              >
                                {m.result === "G'alaba" ? "✓" : "="}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* O'ng tomon — bayroq rangli chiziqlar */}
              <div className="hidden lg:flex flex-col gap-1 shrink-0 self-stretch justify-center">
                {["#1C6CA8", "#FFFFFF", "#1DB954"].map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                    style={{ backgroundColor: c, originX: 1 }}
                    className="w-2 h-10 rounded-full opacity-80"
                  />
                ))}
              </div>
            </div>

            {/* Pastki tasmalar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2 text-xs"
            >
              {[
                "⚽ AFIF kvalifikatsiyasi",
                "🌍 FIFA World Cup 2026",
                "🇺🇿 Tarixiy natija",
                "💪 Jamoamiz faxri!",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
