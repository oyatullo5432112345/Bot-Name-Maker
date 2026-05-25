import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { FLAG_RACE_FLAGS, dailyShuffled } from "@/data/game-data";
import { submitScore } from "@/lib/game-score";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";

const TOTAL_FLAGS = 15;
const WIN_TARGET = 10;

const BOTS = [
  { name: "Ali", emoji: "🚗", color: "bg-blue-500", accuracy: 0.55 },
  { name: "Zulfiya", emoji: "🚙", color: "bg-pink-500", accuracy: 0.65 },
  { name: "Jasur", emoji: "🏎️", color: "bg-orange-500", accuracy: 0.75 },
];

type Phase = "playing" | "answered" | "finished";

export default function Poyga() {
  const [flags] = useState(() => dailyShuffled(FLAG_RACE_FLAGS).slice(0, TOTAL_FLAGS));
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<number | null>(null);
  const [timer, setTimer] = useState(5);

  const [playerScore, setPlayerScore] = useState(0);
  const [botScores, setBotScores] = useState([0, 0, 0]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWin = useCallback((pScore: number, bScores: number[]) => {
    if (pScore >= WIN_TARGET) return "Siz";
    for (let i = 0; i < bScores.length; i++) {
      if ((bScores[i] ?? 0) >= WIN_TARGET) return BOTS[i]!.name;
    }
    return null;
  }, []);

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (phase !== "playing") return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const flag = flags[current]!;
    const correct = flag.options.indexOf(flag.country);
    const playerCorrect = optionIndex === correct;

    const newBotScores = BOTS.map((bot, i) =>
      botScores[i]! + (Math.random() < bot.accuracy ? 1 : 0)
    );

    const newPlayerScore = playerScore + (playerCorrect ? 1 : 0);
    setSelected(optionIndex);
    setPhase("answered");
    setPlayerScore(newPlayerScore);
    setBotScores(newBotScores);

    const w = checkWin(newPlayerScore, newBotScores);
    if (w) {
      setWinner(w);
      const won = w === "Siz";
      if (won) {
        await submitScore("poyga", 5, `Poyga yutildi`);
      } else {
        await submitScore("poyga", -2, `Poyga yutqizildi — ${w} yutdi`);
      }
      setTimeout(() => setPhase("finished"), 1200);
    } else if (current >= TOTAL_FLAGS - 1) {
      const mostBotScore = Math.max(...newBotScores);
      const won = newPlayerScore > mostBotScore;
      const winnerName = won ? "Siz" : BOTS[newBotScores.indexOf(mostBotScore)]!.name;
      setWinner(winnerName);
      if (won) {
        await submitScore("poyga", 5, `Poyga yutildi (${newPlayerScore}/${TOTAL_FLAGS})`);
      } else {
        await submitScore("poyga", -2, `Poyga yutqizildi — ${winnerName} yutdi`);
      }
      setTimeout(() => setPhase("finished"), 1200);
    }
  }, [phase, flags, current, playerScore, botScores, checkWin]);

  useEffect(() => {
    if (phase !== "playing") return;
    setTimer(5);
    timerRef.current = setTimeout(() => handleAnswer(-1), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, phase, handleAnswer]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  const handleNext = () => {
    if (phase === "finished") return;
    setCurrent((c) => c + 1);
    setSelected(null);
    setPhase("playing");
    setTimer(5);
  };

  const flag = flags[current]!;
  const correctIndex = flag.options.indexOf(flag.country);
  const allScores = [playerScore, ...botScores];
  const maxScore = Math.max(...allScores);

  if (phase === "finished") {
    const won = winner === "Siz";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">{won ? "🏆" : "🏁"}</div>
        <div>
          <h2 className="text-2xl font-bold">{won ? "Birinchi o'rin!" : `${winner} yutdi!`}</h2>
          <p className="text-muted-foreground mt-1">Siz: {playerScore} to'g'ri javob</p>
        </div>
        <div className={`rounded-xl px-8 py-4 border ${won ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
          <div className={`text-4xl font-bold ${won ? "text-yellow-600" : "text-red-500"}`}>
            {won ? "+5" : "-2"}
          </div>
          <div className={`text-sm mt-1 ${won ? "text-yellow-700" : "text-red-600"}`}>ball</div>
        </div>
        <div className="flex gap-3">
          <Link href="/games/poyga">
            <button className="bg-rose-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-rose-700 transition-colors">
              Qayta poyga
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
            <span className="font-medium">Bayroq {current + 1}/{TOTAL_FLAGS}</span>
            <span className={`font-bold text-sm ${timer <= 2 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
              ⏱ {timer}s
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500" style={{ width: `${(current / TOTAL_FLAGS) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground text-center">Poyga holati — Kimning mashinasi oldinda?</p>
        <div className="space-y-2">
          {[
            { name: "Siz", emoji: "🚀", score: playerScore, color: "bg-indigo-500" },
            ...BOTS.map((b, i) => ({ ...b, score: botScores[i]! })),
          ].map((racer) => (
            <div key={racer.name} className="flex items-center gap-2">
              <span className="text-base w-6">{racer.emoji}</span>
              <span className="text-xs font-medium w-14 text-muted-foreground truncate">{racer.name}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${racer.color} rounded-full transition-all duration-700 flex items-center justify-end pr-1`}
                  style={{ width: `${Math.max(4, (racer.score / WIN_TARGET) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold w-6 text-right">{racer.score}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">{WIN_TARGET} ballga birinchi yetgan yutadi</p>
      </div>

      <div className="rounded-2xl border bg-card p-5 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Bu qaysi davlatning bayrog'i?</p>
        <div className="text-8xl py-2">{flag.flag}</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {flag.options.map((option, i) => {
          let cls = "p-3.5 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.97]";
          if (phase === "answered") {
            if (i === correctIndex) cls += " bg-emerald-50 border-emerald-400 text-emerald-700";
            else if (i === selected) cls += " bg-red-50 border-red-400 text-red-600";
            else cls += " bg-muted/30 border-muted text-muted-foreground";
          } else {
            cls += " bg-card border-border hover:border-rose-400 hover:bg-rose-50 cursor-pointer";
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} disabled={phase !== "playing"} className={cls}>
              {option}
              {phase === "answered" && i === correctIndex && <CheckCircle2 className="w-4 h-4 inline ml-1.5 text-emerald-600" />}
              {phase === "answered" && i === selected && i !== correctIndex && <XCircle className="w-4 h-4 inline ml-1.5 text-red-500" />}
            </button>
          );
        })}
      </div>

      {phase === "answered" && !winner && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Keyingi bayroq →
        </button>
      )}
    </div>
  );
}
