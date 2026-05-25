import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { ARQON_QUESTIONS, dailyShuffled } from "@/data/game-data";
import { submitScore } from "@/lib/game-score";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";

type Phase = "countdown" | "question" | "answered" | "finished";

const TOTAL_QUESTIONS = 10;
const ROPE_MAX = 5;
const BOT_ACCURACY = 0.6;

export default function Arqon() {
  const [questions] = useState(() => dailyShuffled(ARQON_QUESTIONS).slice(0, TOTAL_QUESTIONS));
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [ropePos, setRopePos] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [timer, setTimer] = useState(10);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("question"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (phase !== "question") return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = questions[current]!;
    const playerCorrect = optionIndex === q.answer;
    const botCorrect = Math.random() < BOT_ACCURACY;

    setSelected(optionIndex);
    setPhase("answered");

    let delta = 0;
    if (playerCorrect && !botCorrect) delta = 1;
    else if (!playerCorrect && botCorrect) delta = -1;

    setRopePos((r) => Math.max(-ROPE_MAX, Math.min(ROPE_MAX, r + delta)));
    if (playerCorrect) setPlayerScore((s) => s + 1);
    if (botCorrect) setBotScore((s) => s + 1);
  }, [phase, questions, current]);

  useEffect(() => {
    if (phase !== "question") return;
    setTimer(10);
    timerRef.current = setTimeout(() => handleAnswer(-1), 10000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, phase, handleAnswer]);

  useEffect(() => {
    if (phase !== "question") return;
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  const handleNext = async () => {
    if (current < TOTAL_QUESTIONS - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setPhase("question");
      setTimer(10);
    } else {
      setPhase("finished");
      const won = ropePos > 0 || (ropePos === 0 && playerScore >= botScore);
      if (won) {
        await submitScore("arqon", 5, `Arqon yutildi (${playerScore}-${botScore})`);
      } else {
        await submitScore("arqon", -2, `Arqon yutqizildi (${playerScore}-${botScore})`);
      }
    }
  };

  const ropePercent = 50 + (ropePos / ROPE_MAX) * 40;
  const question = questions[current]!;

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <p className="text-muted-foreground">O'yin boshlanmoqda...</p>
        <div className="text-8xl font-bold text-emerald-500 animate-bounce">{countdown}</div>
        <p className="text-sm text-muted-foreground">Bot bilan arqon tortishga tayyor bo'l!</p>
      </div>
    );
  }

  if (phase === "finished") {
    const won = ropePos > 0 || (ropePos === 0 && playerScore >= botScore);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">{won ? "🏆" : "🤖"}</div>
        <div>
          <h2 className="text-2xl font-bold">{won ? "Yutdingiz!" : "Bot yutdi!"}</h2>
          <p className="text-muted-foreground mt-1">
            Siz: {playerScore} • Bot: {botScore}
          </p>
        </div>
        <div className={`rounded-xl px-8 py-4 border ${won ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className={`text-4xl font-bold ${won ? "text-emerald-600" : "text-red-500"}`}>
            {won ? "+5" : "-2"}
          </div>
          <div className={`text-sm mt-1 ${won ? "text-emerald-700" : "text-red-600"}`}>ball</div>
        </div>
        <div className="flex gap-3">
          <Link href="/games/arqon">
            <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
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
            <span className="font-medium">Savol {current + 1}/{TOTAL_QUESTIONS}</span>
            <span className="font-medium text-muted-foreground">{question.category}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500" style={{ width: `${(current / TOTAL_QUESTIONS) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-blue-600">👤 Siz: {playerScore}</span>
          <span className="text-red-500">🤖 Bot: {botScore}</span>
        </div>

        <div className="relative h-12 bg-muted rounded-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="absolute left-0 text-base pl-1">👤</div>
            <div className="absolute right-0 text-base pr-1">🤖</div>
            <div
              className="absolute h-full w-1 bg-gray-400"
              style={{ left: "50%" }}
            />
            <div
              className="absolute h-8 w-8 rounded-full bg-amber-400 border-4 border-amber-600 shadow-lg flex items-center justify-center text-sm transition-all duration-700"
              style={{ left: `calc(${ropePercent}% - 16px)` }}
            >
              🪢
            </div>
            <div
              className="absolute h-1 bg-amber-700 opacity-60"
              style={{ left: "8%", right: "8%", top: "50%", transform: "translateY(-50%)" }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>← Arqonni o'z tomoningga tort</span>
          <div className={`font-bold text-sm ${timer <= 3 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
            {timer}s
          </div>
          <span>Bot tomoni →</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <p className="text-base font-semibold leading-relaxed">{question.question}</p>
        <div className="grid grid-cols-1 gap-2">
          {question.options.map((option, i) => {
            let cls = "w-full p-3 rounded-xl border-2 text-left font-medium text-sm transition-all";
            if (phase === "answered") {
              if (i === question.answer) cls += " bg-emerald-50 border-emerald-400 text-emerald-700";
              else if (i === selected && i !== question.answer) cls += " bg-red-50 border-red-400 text-red-600";
              else cls += " bg-muted/30 border-muted text-muted-foreground";
            } else {
              cls += " bg-card border-border hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer active:scale-[0.98]";
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={phase !== "question"} className={cls}>
                <span className="mr-2 text-muted-foreground">{["A", "B", "C", "D"][i]}.</span>
                {option}
                {phase === "answered" && i === question.answer && <CheckCircle2 className="w-4 h-4 inline ml-2 text-emerald-600" />}
                {phase === "answered" && i === selected && i !== question.answer && <XCircle className="w-4 h-4 inline ml-2 text-red-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {phase === "answered" && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          {current < TOTAL_QUESTIONS - 1 ? "Keyingi savol →" : "Natijani ko'rish"}
        </button>
      )}
    </div>
  );
}
