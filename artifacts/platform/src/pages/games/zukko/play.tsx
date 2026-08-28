import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, HelpCircle, CheckCircle2, XCircle, RotateCcw, Award, Sparkles, Snowflake } from "lucide-react";

// Maktab dasturiga mos namuna savollar bazasi
const QUESTIONS_DATABASE: Record<string, Array<{ id: number; question: string; options: string[]; correct: number; hint: string }>> = {
  "5-7": [
    {
      id: 1,
      question: "O'zbekistonda eng teran va eng yirik suv omborlaridan biri qaysi?",
      options: ["Chorvoq", "Kattaqo'rg'on", "Tuyamo'yin", "Andijon"],
      correct: 0,
      hint: "U Toshkent viloyatida joylashgan bo'lib, tog'lar bilan o'ralgan.",
    },
    {
      id: 2,
      question: "Qaysi gaz o'simliklar fotosintez jarayonida ajratib chiqariladi?",
      options: ["Karbonat angidrid", "Kislorod", "Azot", "Vodorod"],
      correct: 1,
      hint: "Insonlar va hayvonlar nafas olishi uchun o'ta zarur gaz.",
    },
  ],
  "8-9": [
    {
      id: 1,
      question: "Pifagor teoremasi qaysi turdagi uchburchaklar uchun o'rinli?",
      options: ["Teng tomonli", "O'tkir burchakli", "To'g'ri burchakli", "Teng yonli"],
      correct: 2,
      hint: "Burchaklaridan biri ayni 90 gradusga teng bo'ladi.",
    },
  ],
  "10-11": [
    {
      id: 1,
      question: "Dmitriy Mendeleyev kimyoviy elementlar davriy sistemasini qaysi yili kashf etgan?",
      options: ["1869-yil", "1905-yil", "1789-yil", "1921-yil"],
      correct: 0,
      hint: "XIX asrning ikkinchi yarmida, 1870-yilga yaqin vaqtda.",
    },
  ],
};

// Ovozli effektlar (Web Audio API orqali sintez qilingan tovushlar)
const playSound = (type: "correct" | "wrong" | "freeze" | "click") => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "correct") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "freeze") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Brauzer audio qo'llab-quvvatlamasa jim o'tadi
  }
};

const customStyles = `
  @keyframes shakeEffect {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }

  @keyframes pulseGreen {
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
    70% { box-shadow: 0 0 20px 8px rgba(34, 197, 94, 0.2); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  @keyframes pulseRed {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
    70% { box-shadow: 0 0 20px 8px rgba(239, 68, 68, 0.2); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  .animate-shake { animation: shakeEffect 0.4s ease-in-out; }
  .glow-correct { animation: pulseGreen 0.8s ease-in-out infinite; }
  .glow-wrong { animation: pulseRed 0.8s ease-in-out infinite; }
`;

export default function ZukkoPlayPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const grade = params.get("grade") || "5-7";
  const level = params.get("level") || "1";

  const questionsList = QUESTIONS_DATABASE[grade] || QUESTIONS_DATABASE["5-7"];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [shakeCard, setShakeCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const q = questionsList[currentIndex] || questionsList[0];

  // Vaqt taymeri
  useEffect(() => {
    if (isFinished || selectedOption !== null || isFrozen) return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished, selectedOption, isFrozen]);

  // Javobni tekshirish va audio/efektlarni ishga tushirish
  const handleAnswer = (index: number) => {
    setSelectedOption(index);

    if (index === q.correct) {
      playSound("correct");
      setScore((s) => s + 1);
      setShowConfetti(true);
    } else {
      playSound("wrong");
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 450);
    }

    setTimeout(() => {
      setShowConfetti(false);
      if (currentIndex + 1 < questionsList.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setDisabledOptions([]);
        setShowHint(false);
        setIsFrozen(false);
        setTimeLeft(30);
      } else {
        setIsFinished(true);
      }
    }, 1400);
  };

  // 50/50 Yordami
  const handleFiftyFifty = () => {
    if (disabledOptions.length > 0) return;
    playSound("click");
    const wrongIndexes = q.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== q.correct);

    const shuffled = wrongIndexes.sort(() => 0.5 - Math.random());
    setDisabledOptions([shuffled[0], shuffled[1]]);
  };

  // Vaqtni Muzlatish (+10 soniya)
  const handleFreezeTime = () => {
    if (isFrozen) return;
    playSound("freeze");
    setIsFrozen(true);
    setTimeLeft((t) => t + 10);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10 relative">
      <style>{customStyles}</style>

      {/* KONFETTI (ZAR) EFEKTI (To'g'ri topilganda ekran tepasida chaqnaydi) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-4xl animate-bounce flex gap-3">
            <span>🎉</span>
            <span>⭐</span>
            <span>✨</span>
            <span>🌟</span>
            <span>🎉</span>
          </div>
        </div>
      )}

      {/* Tepadagi Panel */}
      <div className="flex items-center justify-between">
        <Link href="/games/zukko">
          <button onClick={() => playSound("click")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-bold transition-all cursor-pointer hover:bg-secondary/80">
            <ArrowLeft className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black bg-sky-500/10 text-sky-400 border border-sky-500/30 px-3 py-1 rounded-full shadow-sm">
            {grade}-sinf | {level}-Bosqich
          </span>
        </div>
      </div>

      {!isFinished ? (
        <div className="space-y-5">
          
          {/* Progress va Taymer */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold text-muted-foreground">
              <span>Savol: {currentIndex + 1}/{questionsList.length}</span>
              <span className={`flex items-center gap-1 ${isFrozen ? "text-cyan-400 font-black" : timeLeft < 8 ? "text-rose-400 font-black animate-pulse" : "text-amber-400"}`}>
                {isFrozen ? "❄️ Vaqt muzlatildi" : `⏱️ ${timeLeft}s`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / questionsList.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Yordam Tugmalari */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleFiftyFifty}
              disabled={disabledOptions.length > 0}
              className="px-3.5 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-300 font-black text-xs disabled:opacity-30 cursor-pointer transition-all active:scale-95"
            >
              🪄 50/50
            </button>

            <button
              onClick={handleFreezeTime}
              disabled={isFrozen}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 font-black text-xs disabled:opacity-30 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>+10s</span>
            </button>

            <button
              onClick={() => {
                playSound("click");
                setShowHint(!showHint);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-black text-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Maslahat</span>
            </button>
          </div>

          {/* Maslahat Bloki */}
          {showHint && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold animate-fadeIn flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{q.hint}</span>
            </div>
          )}

          {/* Savol Kartochkasi (Silkinish va Rang Effektlari bilan) */}
          <div 
            className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 text-center bg-card shadow-xl relative overflow-hidden ${
              shakeCard ? "animate-shake border-rose-500 bg-rose-950/20 glow-wrong" : ""
            } ${selectedOption !== null && selectedOption === q.correct ? "border-emerald-500 bg-emerald-950/20 glow-correct" : "border-border/80"}`}
          >
            <h3 className="font-black text-base sm:text-xl text-foreground leading-snug">
              {q.question}
            </h3>
          </div>

          {/* Variantlar */}
          <div className="grid grid-cols-1 gap-2.5">
            {q.options.map((opt, idx) => {
              const isDisabled = disabledOptions.includes(idx);
              const isSelected = selectedOption === idx;
              const isCorrect = idx === q.correct;

              let btnStyle = "bg-card hover:bg-secondary/90 border-border/70 text-foreground";
              
              // Javob tanlangandagi ranglar (Yashil va Qizil)
              if (selectedOption !== null) {
                if (isCorrect) {
                  btnStyle = "bg-emerald-500/25 border-emerald-500 text-emerald-300 font-black shadow-lg shadow-emerald-500/10 scale-[1.01]";
                } else if (isSelected) {
                  btnStyle = "bg-rose-500/25 border-rose-500 text-rose-300 font-black shadow-lg shadow-rose-500/10";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isDisabled || selectedOption !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${btnStyle} ${
                    isDisabled ? "opacity-20 cursor-not-allowed border-dashed" : "active:scale-[0.99]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center text-xs font-black shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </span>

                  {/* Iconlar */}
                  {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {selectedOption !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

        </div>
      ) : (
        /* NATIJA OYNASI */
        <div className="p-6 sm:p-8 rounded-3xl border border-sky-500/30 bg-gradient-to-b from-slate-900 to-card text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <h2 className="font-black text-2xl text-white">Bosqich Yakunlandi!</h2>
            <p className="text-xs text-slate-300 mt-1">Siz {questionsList.length} ta savoldan <span className="font-extrabold text-emerald-400 text-sm">{score}</span> tasiga to'g'ri javob berdingiz.</p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => {
                playSound("click");
                setCurrentIndex(0);
                setScore(0);
                setIsFinished(false);
                setSelectedOption(null);
                setTimeLeft(30);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 font-extrabold text-xs cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta o'ynash</span>
            </button>

            <Link href="/games/zukko">
              <button onClick={() => playSound("click")} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95">
                Bosh sahifa
              </button>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
