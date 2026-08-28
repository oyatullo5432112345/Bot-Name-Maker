import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, HelpCircle, CheckCircle2, XCircle, RotateCcw, Award } from "lucide-react";

// Maktab dasturiga mos namuna savollar
const SAMPLE_QUESTIONS = [
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
];

export default function ZukkoPlayPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const grade = params.get("grade") || "5-7";
  const level = params.get("level") || "1";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const q = SAMPLE_QUESTIONS[currentIndex];

  // Vaqt taymeri
  useEffect(() => {
    if (isFinished || selectedOption !== null) return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // Vaqt tugasa xato hisoblanadi
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished, selectedOption]);

  // Javobni tekshirish
  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    if (index === q.correct) {
      setScore((s) => s + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < SAMPLE_QUESTIONS.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setDisabledOptions([]);
        setShowHint(false);
        setTimeLeft(30);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  // 50/50 Yordami
  const handleFiftyFifty = () => {
    if (disabledOptions.length > 0) return;
    const wrongIndexes = q.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== q.correct);
    
    // Tasodifiy 2 ta xato javobni olib tashlash
    const shuffled = wrongIndexes.sort(() => 0.5 - Math.random());
    setDisabledOptions([shuffled[0], shuffled[1]]);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      
      {/* Tepadagi Panel */}
      <div className="flex items-center justify-between">
        <Link href="/games/zukko">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-bold transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full">
            {grade}-sinf | {level}-Bosqich
          </span>
        </div>
      </div>

      {!isFinished ? (
        <div className="space-y-5">
          
          {/* Progress va Taymer */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>Savol: {currentIndex + 1}/{SAMPLE_QUESTIONS.length}</span>
              <span className={timeLeft < 10 ? "text-rose-400 font-black animate-pulse" : "text-amber-400"}>
                ⏱️ {timeLeft} soniya
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / SAMPLE_QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Yordam Tugmalari */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleFiftyFifty}
              disabled={disabledOptions.length > 0}
              className="px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 font-extrabold text-xs disabled:opacity-40 cursor-pointer"
            >
              🪄 50/50
            </button>
            <button
              onClick={() => setShowHint(!showHint)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-xs cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Maslahat</span>
            </button>
          </div>

          {/* Maslahat Bloki */}
          {showHint && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs animate-fadeIn">
              💡 {q.hint}
            </div>
          )}

          {/* Savol Kartochkasi */}
          <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-lg text-center">
            <h3 className="font-extrabold text-base sm:text-lg text-foreground leading-snug">
              {q.question}
            </h3>
          </div>

          {/* Variantlar */}
          <div className="grid grid-cols-1 gap-2.5">
            {q.options.map((opt, idx) => {
              const isDisabled = disabledOptions.includes(idx);
              const isSelected = selectedOption === idx;
              const isCorrect = idx === q.correct;

              let btnStyle = "bg-card hover:bg-secondary border-border/60 text-foreground";
              if (selectedOption !== null) {
                if (isCorrect) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold";
                else if (isSelected) btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300 font-extrabold";
              }

              return (
                <button
                  key={idx}
                  disabled={isDisabled || selectedOption !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${btnStyle} ${
                    isDisabled ? "opacity-20 cursor-not-allowed" : ""
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
        /* NATIJA OYNASI */
        <div className="p-6 rounded-3xl border border-sky-500/30 bg-card text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-black text-xl">Bosqich Yakunlandi!</h2>
            <p className="text-xs text-muted-foreground mt-1">Siz {SAMPLE_QUESTIONS.length} ta savoldan {score} tasiga to'g'ri javob berdingiz.</p>
          </div>

          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setIsFinished(false);
                setSelectedOption(null);
                setTimeLeft(30);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary font-bold text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta o'ynash</span>
            </button>
            <Link href="/games/zukko">
              <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer">
                Bosh sahifa
              </button>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
