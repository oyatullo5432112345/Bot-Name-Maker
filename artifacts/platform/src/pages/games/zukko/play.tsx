import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { ArrowLeft, HelpCircle, CheckCircle2, XCircle, RotateCcw, Award, Star, Snowflake, ArrowRight } from "lucide-react";
import { ZUKKO_QUESTIONS } from "./zukkoData";

const playSound = (type: "correct" | "wrong" | "freeze" | "win") => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "correct") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "win") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    }
  } catch {
    // Audio xatosi bo'lsa e'tiborsiz qoldiriladi
  }
};

export default function ZukkoPlayPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);
  const grade = params.get("grade") || "5-7";
  const levelNum = parseInt(params.get("level") || "1", 10);

  const gradeLevels = ZUKKO_QUESTIONS[grade] || ZUKKO_QUESTIONS["5-7"];
  const currentLevelData = gradeLevels.find((l) => l.level === levelNum) || gradeLevels[0];
  const questionsList = currentLevelData.questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [shakeCard, setShakeCard] = useState(false);

  const q = questionsList[currentIndex];

  useEffect(() => {
    if (isFinished || selectedOption !== null || isFrozen) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished, selectedOption, isFrozen]);

  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    let updatedScore = score;

    if (index === q.correct) {
      playSound("correct");
      updatedScore = score + 1;
      setScore(updatedScore);
    } else {
      playSound("wrong");
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 400);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questionsList.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setDisabledOptions([]);
        setShowHint(false);
        setIsFrozen(false);
        setTimeLeft(25);
      } else {
        // Bosqich tugadi -> Natijani saqlash
        setIsFinished(true);
        saveProgress(updatedScore);
      }
    }, 1200);
  };

  // Natija va yulduzchalarni hisoblash hamda LocalStorage'ga yozish
  const saveProgress = (finalScore: number) => {
    if (finalScore >= 4) {
      playSound("win");
      const starsEarned = finalScore === 5 ? 3 : 2; // 5/5 -> 3 yulduz, 4/5 -> 2 yulduz

      const saved = localStorage.getItem("zukko_progress");
      const progress = saved ? JSON.parse(saved) : {};
      const key = `${grade}_lvl_${levelNum}`;

      // Oldingi rekorddan yuqori bo'lsa yangilaydi
      if (!progress[key] || progress[key] < starsEarned) {
        progress[key] = starsEarned;
        localStorage.setItem("zukko_progress", JSON.stringify(progress));
      }
    }
  };

  const handleFiftyFifty = () => {
    if (disabledOptions.length > 0) return;
    const wrongIndexes = q.options.map((_, idx) => idx).filter((idx) => idx !== q.correct);
    const shuffled = wrongIndexes.sort(() => 0.5 - Math.random());
    setDisabledOptions([shuffled[0], shuffled[1]]);
  };

  const isPassed = score >= 4;
  const starsEarned = score === 5 ? 3 : score === 4 ? 2 : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <Link href="/games/zukko">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-bold transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </Link>
        <span className="text-xs font-black bg-sky-500/10 text-sky-400 border border-sky-500/30 px-3 py-1 rounded-full">
          {grade}-sinf | {levelNum}-Bosqich
        </span>
      </div>

      {!isFinished ? (
        <div className="space-y-5">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold text-muted-foreground">
              <span>Savol: {currentIndex + 1}/{questionsList.length}</span>
              <span className={isFrozen ? "text-cyan-400 font-black" : "text-amber-400 font-black"}>
                {isFrozen ? "❄️ Muzlatildi" : `⏱️ ${timeLeft}s`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questionsList.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Yordamlar */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleFiftyFifty}
              disabled={disabledOptions.length > 0}
              className="px-3.5 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 font-black text-xs disabled:opacity-30 cursor-pointer"
            >
              🪄 50/50
            </button>
            <button
              onClick={() => setIsFrozen(true)}
              disabled={isFrozen}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-black text-xs disabled:opacity-30 cursor-pointer flex items-center gap-1"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Muzlatish</span>
            </button>
            <button
              onClick={() => setShowHint(!showHint)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Maslahat</span>
            </button>
          </div>

          {showHint && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-medium">
              💡 {q.hint}
            </div>
          )}

          {/* Savol Karta */}
          <div className={`p-6 rounded-3xl border bg-card text-center transition-all ${shakeCard ? "border-rose-500 bg-rose-950/20" : "border-border"}`}>
            <h3 className="font-extrabold text-base sm:text-lg text-foreground">{q.question}</h3>
          </div>

          {/* Variantlar */}
          <div className="grid grid-cols-1 gap-2.5">
            {q.options.map((opt, idx) => {
              const isDisabled = disabledOptions.includes(idx);
              const isSelected = selectedOption === idx;
              const isCorrect = idx === q.correct;

              let btnStyle = "bg-card border-border/70 text-foreground hover:bg-secondary";
              if (selectedOption !== null) {
                if (isCorrect) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black";
                else if (isSelected) btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300 font-black";
              }

              return (
                <button
                  key={idx}
                  disabled={isDisabled || selectedOption !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${btnStyle} ${
                    isDisabled ? "opacity-20 cursor-not-allowed border-dashed" : ""
                  }`}
                >
                  <span>{opt}</span>
                  {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {selectedOption !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* BOSQICH YAKUNI (Yulduzcha va O'tish sharti) */
        <div className="p-7 rounded-3xl border border-sky-500/30 bg-card text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <h2 className="font-black text-2xl">{isPassed ? "Tabriklaymiz!" : "Urinib ko'ring!"}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Siz 5 ta savoldan <span className="font-bold text-foreground text-sm">{score}</span> tasiga to'g'ri javob berdingiz.
            </p>
          </div>

          {/* Yulduzchalar */}
          {isPassed ? (
            <div className="space-y-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-8 h-8 ${s <= starsEarned ? "fill-amber-400 text-amber-400 animate-bounce" : "text-muted/30"}`}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-emerald-400">Keyingi bosqich ochildi! 🎉</p>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">
              Keyingi bosqichga o'tish uchun kamida 4 ta to'g'ri javob kerak!
            </div>
          )}

          <div className="flex gap-2.5 justify-center pt-2">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setIsFinished(false);
                setSelectedOption(null);
                setTimeLeft(25);
              }}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-secondary font-extrabold text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta urinish</span>
            </button>

            {isPassed && (
              <button
                onClick={() => {
                  setLocation(`/games/zukko/play?grade=${grade}&level=${levelNum + 1}`);
                  setCurrentIndex(0);
                  setScore(0);
                  setIsFinished(false);
                  setSelectedOption(null);
                  setTimeLeft(25);
                }}
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs cursor-pointer shadow-lg"
              >
                <span>Keyingi bosqich</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
