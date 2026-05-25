import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { JUMBOQ_LIST } from "@/data/game-data";
import { submitScore } from "@/lib/game-score";
import { ChevronLeft, CheckCircle2, XCircle, Clock, Trophy } from "lucide-react";

type Phase = "playing" | "answered" | "finished";

function getRandomQuestions(count: number) {
  const shuffled = [...JUMBOQ_LIST].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function Jumboq() {
  const [questions] = useState(() => getRandomQuestions(10));
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const question = questions[current]!;

  const handleAnswer = useCallback((optionIndex: number) => {
    if (phase !== "playing") return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === question.answer;
    if (isCorrect) {
      setScore((s) => s + 5);
      setCorrect((c) => c + 1);
    }
    setPhase("answered");
  }, [phase, question.answer]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, handleAnswer]);

  const handleNext = async () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setPhase("playing");
      setTimeLeft(15);
    } else {
      setPhase("finished");
      const won = correct >= questions.length / 2;
      if (won) {
        await submitScore("jumboq", 5, `Jumboq yutildi (${correct}/${questions.length})`);
      } else {
        await submitScore("jumboq", -2, `Jumboq yutqizildi (${correct}/${questions.length})`);
      }
    }
  };

  if (phase === "finished") {
    const won = correct >= questions.length / 2;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">{won ? "🏆" : "😔"}</div>
        <div>
          <h2 className="text-2xl font-bold">{won ? "Ajoyib!" : "Qo'lga kirmadi"}</h2>
          <p className="text-muted-foreground mt-1">
            {correct}/{questions.length} to'g'ri javob
          </p>
        </div>
        <div className={`rounded-xl px-8 py-4 border ${won ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
          <div className={`text-4xl font-bold ${won ? "text-yellow-600" : "text-red-500"}`}>
            {won ? `+${score}` : "-2"}
          </div>
          <div className={`text-sm mt-1 ${won ? "text-yellow-700" : "text-red-600"}`}>ball</div>
        </div>
        <div className="flex gap-3">
          <Link href="/games/jumboq">
            <button className="bg-amber-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors">
              Qayta o'ynash
            </button>
          </Link>
          <Link href="/games">
            <button className="border px-5 py-2.5 rounded-lg font-medium hover:bg-muted transition-colors">
              O'yinlarga
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = ((current) / questions.length) * 100;
  const timeColor = timeLeft <= 5 ? "text-red-500" : timeLeft <= 10 ? "text-amber-500" : "text-emerald-600";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/games">
          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Savol {current + 1}/{questions.length}</span>
            <span className="text-amber-600 font-bold">{score} ball</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-4xl">{question.emoji}</div>
          <div className={`flex items-center gap-1.5 font-bold text-lg ${timeColor}`}>
            <Clock className="w-5 h-5" />
            {timeLeft}s
          </div>
        </div>
        <p className="text-lg font-semibold leading-relaxed">{question.question}</p>

        {phase === "playing" && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 linear"
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {question.options.map((option, i) => {
          let cls = "w-full p-3.5 rounded-xl border-2 text-left font-medium text-sm transition-all";
          if (phase === "answered") {
            if (i === question.answer) cls += " bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (i === selected) cls += " bg-red-50 border-red-400 text-red-600";
            else cls += " bg-muted/30 border-muted text-muted-foreground";
          } else {
            cls += " bg-card border-border hover:border-amber-400 hover:bg-amber-50 cursor-pointer active:scale-[0.98]";
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={phase !== "playing"} className={cls}>
              <span className="mr-2 text-muted-foreground">
                {["A", "B", "C", "D"][i]}.
              </span>
              {option}
              {phase === "answered" && i === question.answer && (
                <CheckCircle2 className="w-4 h-4 inline ml-2 text-emerald-600" />
              )}
              {phase === "answered" && i === selected && i !== question.answer && (
                <XCircle className="w-4 h-4 inline ml-2 text-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {phase === "answered" && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          {current < questions.length - 1 ? "Keyingi savol →" : "Natijani ko'rish 🏆"}
        </button>
      )}

      <div className="flex justify-center gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${i < current ? "w-4 bg-amber-400" : i === current ? "w-6 bg-amber-600" : "w-4 bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}
