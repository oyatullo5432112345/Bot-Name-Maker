import { useState, useEffect } from "react";
import { X, Tv } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "wc2026_banner_v3";

/* ── O'yinchi siluet SVG ─────────────────────────────────── */
function PlayerSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 120" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Bosh */}
      <circle cx="30" cy="12" r="9" />
      {/* Tana */}
      <path d="M18 28 Q20 22 30 22 Q40 22 42 28 L46 58 Q44 62 30 62 Q16 62 14 58 Z" />
      {/* Chap qo'l */}
      <path d="M18 30 Q8 38 6 52 Q8 56 13 54 Q16 44 20 36 Z" />
      {/* O'ng qo'l — to'p tepmoqda */}
      <path d="M42 30 Q56 40 58 52 Q56 56 51 54 Q48 44 40 36 Z" />
      {/* Chap oyoq */}
      <path d="M22 60 Q18 80 16 100 Q18 106 24 104 Q28 86 30 66 Z" />
      {/* O'ng oyoq */}
      <path d="M38 60 Q42 80 46 98 Q44 106 38 104 Q34 86 30 66 Z" />
    </svg>
  );
}

function GKSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 130" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="12" r="9" />
      <path d="M22 28 Q24 22 35 22 Q46 22 48 28 L52 58 Q50 63 35 63 Q20 63 18 58 Z" />
      {/* Ikki tomoniga qo'l yozgan — darvozabon */}
      <path d="M22 30 Q4 36 2 46 Q4 52 10 50 Q16 42 22 36 Z" />
      <path d="M48 30 Q66 36 68 46 Q66 52 60 50 Q54 42 48 36 Z" />
      <path d="M26 62 Q22 82 20 104 Q22 110 28 108 Q32 88 35 68 Z" />
      <path d="M44 62 Q48 82 50 104 Q48 110 42 108 Q38 88 35 68 Z" />
    </svg>
  );
}

/* ── To'p SVG ─────────────────────────────────────────────── */
function BallSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <polygon points="20,4 24,14 20,18 16,14" fill="currentColor" opacity="0.6" />
      <polygon points="20,36 24,26 20,22 16,26" fill="currentColor" opacity="0.6" />
      <polygon points="4,20 14,16 18,20 14,24" fill="currentColor" opacity="0.6" />
      <polygon points="36,20 26,16 22,20 26,24" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/* ── Fon animatsiyalari ───────────────────────────────────── */
const BG_PLAYERS = [
  { x: "5%",  delay: 0,   dur: 14, scale: 1.1, opacity: 0.13, comp: "player" },
  { x: "22%", delay: 3,   dur: 18, scale: 0.9, opacity: 0.10, comp: "gk"     },
  { x: "42%", delay: 1.5, dur: 16, scale: 1.2, opacity: 0.12, comp: "player" },
  { x: "62%", delay: 5,   dur: 12, scale: 0.85,opacity: 0.09, comp: "gk"     },
  { x: "78%", delay: 2,   dur: 20, scale: 1.0, opacity: 0.11, comp: "player" },
  { x: "90%", delay: 6,   dur: 15, scale: 0.8, opacity: 0.08, comp: "player" },
];

const BG_BALLS = [
  { x: "15%", y: "20%", delay: 0,   dur: 8,  size: 28 },
  { x: "55%", y: "10%", delay: 2.5, dur: 11, size: 22 },
  { x: "80%", y: "60%", delay: 1,   dur: 9,  size: 18 },
  { x: "35%", y: "70%", delay: 4,   dur: 13, size: 24 },
];

export function WorldCupBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl overflow-hidden shadow-2xl select-none"
          style={{ minHeight: 180 }}
        >
          {/* ── Asosiy gradient fon ─── */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #0b1f3a 0%, #0e2d50 40%, #0b2a1e 100%)",
            }}
          />
          {/* O'zbekiston bayrog'i rangli chiziq */}
          <div className="absolute top-0 left-0 right-0 h-1 flex">
            <div className="flex-1 bg-[#1C6CA8]" />
            <div className="flex-1 bg-white/60" />
            <div className="flex-1 bg-[#1DB954]" />
          </div>

          {/* ── Fonda o'yinchi siluetlari ─── */}
          {BG_PLAYERS.map((p, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 text-white"
              style={{ left: p.x, opacity: p.opacity, scale: p.scale }}
              animate={{ y: [8, -8, 8] }}
              transition={{
                duration: p.dur,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {p.comp === "gk" ? (
                <GKSilhouette className="h-28 sm:h-36 w-auto" />
              ) : (
                <PlayerSilhouette className="h-24 sm:h-32 w-auto" />
              )}
            </motion.div>
          ))}

          {/* ── Fonda aylanuvchi to'plar ─── */}
          {BG_BALLS.map((b, i) => (
            <motion.div
              key={i}
              className="absolute text-white/20"
              style={{ left: b.x, top: b.y, width: b.size, height: b.size }}
              animate={{ rotate: 360 }}
              transition={{
                duration: b.dur,
                delay: b.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <BallSVG className="w-full h-full" />
            </motion.div>
          ))}

          {/* ── Asosiy kontent ─── */}
          <div className="relative z-10 p-5 sm:p-6">
            {/* Yopish */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sarlavha */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 mb-1"
            >
              <span className="text-3xl sm:text-4xl">🇺🇿</span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight tracking-tight">
                  O'ZBEKISTON JAHON CHEMPIONATIDA!
                </h2>
                <p className="text-yellow-300/90 text-xs font-semibold mt-0.5">
                  FIFA World Cup 2026 · AQSh / Kanada / Meksika ⚽
                </p>
              </div>
            </motion.div>

            {/* ── O'tgan o'yinlar (kichik) ─── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-4"
            >
              {[
                { tur: "1-tur", text: "🇺🇿 O'zbekiston vs Kolumbiya 🇨🇴", score: "1 : 3", win: false },
                { tur: "2-tur", text: "🇵🇹 Portugaliya vs O'zbekiston 🇺🇿", score: "5 : 0", win: false },
              ].map((m) => (
                <div key={m.tur} className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="text-white/40 font-medium">{m.tur}:</span>
                  <span>{m.text}</span>
                  <span className="font-bold text-white/50 font-mono">{m.score}</span>
                </div>
              ))}
            </motion.div>

            {/* ── 3-tur: asosiy kard ─── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
              className="relative rounded-xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(90deg, rgba(28,108,168,0.55) 0%, rgba(29,185,84,0.45) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {/* Yonuvchi chiziq effekti */}
              <motion.div
                className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
                style={{ background: "linear-gradient(180deg, #1C6CA8, #1DB954)" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Chapda */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-yellow-300 bg-yellow-300/15 px-2 py-0.5 rounded-full border border-yellow-300/30">
                      3-TUR
                    </span>
                    <span className="text-xs text-white/50">· Guruh bosqichi</span>
                  </div>

                  {/* Jamoa nomi + skor */}
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl">🇺🇿</div>
                      <div className="text-white font-bold text-xs sm:text-sm mt-0.5">O'zbekiston</div>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="text-xl sm:text-2xl font-extrabold text-white font-mono bg-white/10 rounded-lg px-3 py-1 border border-white/20"
                      >
                        VS
                      </motion.div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl">🇨🇩</div>
                      <div className="text-white font-bold text-xs sm:text-sm mt-0.5">Kongo</div>
                    </div>
                  </div>
                </div>

                {/* O'ngda — vaqt + tugma */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-white/50 text-xs">Sana</div>
                    <div className="text-white font-bold text-sm">23-iyun · 04:30</div>
                  </div>
                  <motion.a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{
                      background: "linear-gradient(90deg, #1C6CA8, #1DB954)",
                      boxShadow: "0 0 12px rgba(28,108,168,0.5)",
                    }}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Tomosha qiling
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
