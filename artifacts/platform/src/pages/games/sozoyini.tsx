import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { SOZ_OYINI_LEVELS } from "@/data/game-data";
import { submitScore } from "@/lib/game-score";
import { ChevronLeft, RotateCcw, CheckCircle2, XCircle, Trophy } from "lucide-react";

type GameState = "playing" | "correct" | "wrong" | "completed";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function SozOyini() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [letters, setLetters] = useState<{ char: string; used: boolean; id: number }[]>([]);
  const [selected, setSelected] = useState<{ char: string; id: number }[]>([]);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [totalWins, setTotalWins] = useState(0);

  const level = SOZ_OYINI_LEVELS[currentLevel]!;

  const initLevel = useCallback((lvlIndex: number) => {
    const word = SOZ_OYINI_LEVELS[lvlIndex]!.word;
    const shuffled = shuffle(word.split("").map((char, i) => ({ char, used: false, id: i })));
    setLetters(shuffled);
    setSelected([]);
    setGameState("playing");
  }, []);

  useEffect(() => { initLevel(currentLevel); }, [currentLevel, initLevel]);

  const handleLetterClick = (letter: { char: string; used: boolean; id: number }) => {
    if (letter.used || gameState !== "playing") return;
    const newSelected = [...selected, { char: letter.char, id: letter.id }];
    setLetters((prev) => prev.map((l) => l.id === letter.id ? { ...l, used: true } : l));
    setSelected(newSelected);

    const formed = newSelected.map((l) => l.char).join("");
    if (formed.length === level.word.length) {
      if (formed === level.word) {
        setGameState("correct");
        const newScore = score + 5;
        setScore(newScore);
        setTotalWins((w) => w + 1);
        void submitScore("sozoyini", 5, `Level ${level.level} yutildi`);
      } else {
        setGameState("wrong");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setGameState("playing");
          setLetters((prev) => prev.map((l) => ({ ...l, used: false })));
          setSelected([]);
        }, 900);
      }
    }
  };

  const handleRemoveLast = () => {
    if (selected.length === 0 || gameState !== "playing") return;
    const last = selected[selected.length - 1]!;
    setSelected((prev) => prev.slice(0, -1));
    setLetters((prev) => prev.map((l) => l.id === last.id ? { ...l, used: false } : l));
  };

  const handleNext = () => {
    if (currentLevel < SOZ_OYINI_LEVELS.length - 1) {
      setCurrentLevel((c) => c + 1);
    } else {
      setGameState("completed");
    }
  };

  if (gameState === "completed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="text-6xl">🏆</div>
        <div>
          <h2 className="text-2xl font-bold">Tabriklaymiz!</h2>
          <p className="text-muted-foreground mt-1">Barcha 30 ta bosqichni yutdingiz!</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-8 py-4">
          <div className="text-4xl font-bold text-yellow-600">{score}</div>
          <div className="text-sm text-yellow-700 mt-1">ball to'plandi</div>
        </div>
        <Link href="/games">
          <button className="bg-violet-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-violet-700 transition-colors">
            O'yinlar ro'yxatiga qaytish
          </button>
        </Link>
      </div>
    );
  }

  const progress = (currentLevel / SOZ_OYINI_LEVELS.length) * 100;

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
            <span className="font-medium">Bosqich {level.level}/30</span>
            <span className="text-violet-600 font-bold">{score} ball</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
        <div className="text-5xl">{level.emoji}</div>
        <div>
          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{level.category}</span>
          <p className="text-muted-foreground text-sm mt-2">{level.hint}</p>
        </div>

        <div
          className={`min-h-14 flex items-center justify-center gap-1.5 flex-wrap transition-all ${shake ? "animate-bounce" : ""}`}
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground/50 text-sm">Harflarni bosib so'z hosil qiling...</span>
          ) : (
            selected.map((l, i) => (
              <div
                key={`${l.id}-${i}`}
                className={`w-10 h-12 flex items-center justify-center rounded-xl text-lg font-bold border-2 transition-all
                  ${gameState === "correct" ? "bg-emerald-100 border-emerald-400 text-emerald-700" : 
                    gameState === "wrong" ? "bg-red-100 border-red-400 text-red-600" :
                    "bg-white border-violet-300 text-violet-700 shadow-sm"}`}
              >
                {l.char}
              </div>
            ))
          )}
        </div>

        {gameState === "correct" && (
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">To'g'ri! +5 ball</span>
          </div>
        )}
        {gameState === "wrong" && (
          <div className="flex items-center justify-center gap-2 text-red-500">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Noto'g'ri, qayta urining!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {letters.map((letter) => (
          <button
            key={letter.id}
            onClick={() => handleLetterClick(letter)}
            disabled={letter.used || gameState !== "playing"}
            className={`h-12 rounded-xl text-lg font-bold border-2 transition-all active:scale-95
              ${letter.used ? "bg-muted/50 border-muted text-muted-foreground/30 cursor-default" :
                "bg-white border-violet-200 text-violet-800 hover:bg-violet-50 hover:border-violet-400 shadow-sm cursor-pointer"}`}
          >
            {letter.char}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleRemoveLast}
          disabled={selected.length === 0 || gameState !== "playing"}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border hover:bg-muted transition-colors text-sm disabled:opacity-40"
        >
          <RotateCcw className="w-4 h-4" />
          Oxirgi harfni o'chir
        </button>
        {gameState === "correct" && (
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {currentLevel < 29 ? "Keyingi bosqich →" : "Tugatish 🏆"}
          </button>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Trophy className="w-3 h-3 inline mr-1" />
        Jami: {totalWins} bosqich yutildi
      </div>
    </div>
  );
}
