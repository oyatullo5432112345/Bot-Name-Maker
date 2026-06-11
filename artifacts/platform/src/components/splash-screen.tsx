import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onDone: () => void;
}

const REGION_TEXT = "Farg'ona viloyati";
const DISTRICT_TEXT = "Toshloq tumani";
const PLATFORM_TEXT = "Ta'lim Platformasiga";
const WELCOME_TEXT = "Xush kelibsiz!";
const SPEAK_TEXT = "Fargʻona viloyati Toshloq tumani Taʼlim Platformasiga Xush kelibsiz!";

function Particles() {
  const particles = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((i) => {
        const size = 2 + Math.random() * 4;
        const x = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 4 + Math.random() * 5;
        const opacity = 0.15 + Math.random() * 0.5;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: size,
              height: size,
              left: `${x}%`,
              bottom: "-10px",
              opacity,
            }}
            animate={{
              y: [0, -(600 + Math.random() * 400)],
              opacity: [opacity, 0],
              x: [0, (Math.random() - 0.5) * 80],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}

function GlowOrb({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "show" | "out">("in");
  const spokenRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 400);
    const t2 = setTimeout(() => setPhase("out"), 5200);
    const t3 = setTimeout(() => onDone(), 6400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  useEffect(() => {
    if (phase !== "show" || spokenRef.current) return;
    spokenRef.current = true;
    if (!("speechSynthesis" in window)) return;

    const trySpeak = () => {
      const utt = new SpeechSynthesisUtterance(SPEAK_TEXT);
      utt.lang = "uz-UZ";
      utt.rate = 0.88;
      utt.pitch = 1.05;
      utt.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const uzVoice = voices.find((v) => v.lang.startsWith("uz"));
      const ruVoice = voices.find((v) => v.lang.startsWith("ru"));
      if (uzVoice) utt.voice = uzVoice;
      else if (ruVoice) { utt.voice = ruVoice; utt.lang = "ru-RU"; }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null; };
    }

    return () => { window.speechSynthesis.cancel(); };
  }, [phase]);

  const wordVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { delay: 0.5 + i * 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const lineVariants = {
    hidden: { opacity: 0, scaleX: 0 },
    visible: { opacity: 1, scaleX: 1, transition: { delay: 2.0, duration: 0.6, ease: "easeOut" } },
  };

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d2137 70%, #0f172a 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)", transition: { duration: 1.1, ease: "easeInOut" } }}
        >
          <GlowOrb className="w-96 h-96 bg-blue-500 -top-24 -left-24" />
          <GlowOrb className="w-80 h-80 bg-indigo-600 -bottom-20 -right-20" />
          <GlowOrb className="w-64 h-64 bg-cyan-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <Particles />

          <div className="relative z-10 flex flex-col items-center gap-0 px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-8"
            >
              <div className="relative w-24 h-24 mx-auto">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 blur-xl opacity-60"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl border border-white/10">
                  <span className="text-4xl">🏫</span>
                </div>
              </div>
            </motion.div>

            <motion.p
              custom={0}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
              className="text-blue-300 text-lg md:text-xl font-medium tracking-widest uppercase mb-1"
            >
              {REGION_TEXT}
            </motion.p>

            <motion.p
              custom={1}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
              className="text-cyan-300 text-xl md:text-2xl font-semibold tracking-wider mb-3"
            >
              {DISTRICT_TEXT}
            </motion.p>

            <motion.div variants={lineVariants} initial="hidden" animate="visible" className="origin-center">
              <div className="w-48 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mb-5" />
            </motion.div>

            <motion.h1
              custom={2}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
              className="text-white text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-2"
              style={{ textShadow: "0 0 40px rgba(99,179,237,0.4)" }}
            >
              {PLATFORM_TEXT}
            </motion.h1>

            <motion.h2
              custom={3}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent mt-1"
              style={{ textShadow: "none" }}
            >
              {WELCOME_TEXT}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.6, duration: 0.6 }}
              className="mt-10 flex items-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
