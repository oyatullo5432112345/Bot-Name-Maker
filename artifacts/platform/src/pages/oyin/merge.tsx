import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Merge o'yini (web) — bir xil darajali ikki plitkani birlashtirib kuchaytirasan.
// Urush yo'q. Bos → tanla, yana bos → bir xil bo'lsa birlashadi; bo'sh katakka ko'chadi.

const COLS = 5;
const ROWS = 6;
const GOAL = 8;
const BEST_KEY = "beklola_merge_best";

function tileStyle(level: number): CSSProperties {
  const hue = (18 + level * 32) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 85% 58%), hsl(${(hue + 28) % 360} 80% 46%))`,
    boxShadow: "0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  };
}

export default function MergeGame() {
  const { toast } = useToast();
  const [cells, setCells] = useState<number[]>(() => Array(COLS * ROWS).fill(0));
  const [selected, setSelected] = useState<number>(-1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [moves, setMoves] = useState(0);

  const spawn = useCallback((grid: number[], level: number): boolean => {
    const empties: number[] = [];
    grid.forEach((v, i) => { if (v === 0) empties.push(i); });
    if (empties.length === 0) return false;
    grid[empties[Math.floor(Math.random() * empties.length)]!] = level;
    return true;
  }, []);

  const reset = useCallback(() => {
    const grid = Array(COLS * ROWS).fill(0);
    for (let i = 0; i < 4; i++) spawn(grid, 1);
    setCells(grid); setSelected(-1); setScore(0); setMoves(0);
  }, [spawn]);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) ?? "0") || 0); } catch { /* ignore */ }
    reset();
  }, [reset]);

  const saveBest = (lvl: number) => {
    if (lvl > best) { setBest(lvl); try { localStorage.setItem(BEST_KEY, String(lvl)); } catch { /* ignore */ } }
  };

  const tap = (i: number) => {
    setCells((prev) => {
      const grid = prev.slice();
      if (grid[i] === 0) {
        if (selected >= 0 && grid[selected] > 0) {
          grid[i] = grid[selected]!; grid[selected] = 0; setSelected(-1); setMoves((m) => m + 1);
        }
        return grid;
      }
      if (selected === i) { setSelected(-1); return grid; }
      if (selected < 0 || grid[selected] === 0) { setSelected(i); return grid; }

      if (grid[selected] === grid[i]) {
        const nl = grid[i]! + 1;
        grid[i] = nl; grid[selected] = 0; setSelected(-1);
        setScore((s) => s + (1 << nl));
        setMoves((m) => m + 1);
        saveBest(nl);
        if (nl >= GOAL) toast({ title: `🎉 ${nl}-daraja! Bek & Lola kuchaydi!` });
        return grid;
      }
      setSelected(i);
      return grid;
    });
  };

  const addTile = () => {
    setCells((prev) => {
      const grid = prev.slice();
      if (!spawn(grid, 1)) { toast({ variant: "destructive", title: "Joy yo'q!", description: "Birlashtiring yoki qaytadan boshlang." }); return prev; }
      setMoves((m) => m + 1);
      return grid;
    });
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <Link href="/intellektual" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-amber-500">🏆 {score}</span>
          <span className="text-violet-500">⬆ {best}</span>
          <span className="text-muted-foreground">🔁 {moves}</span>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-extrabold">🧩 Merge — kuchaytir</h1>
        <p className="text-xs text-muted-foreground">Bir xil ikkitasini bos → birlashadi. Maqsad: {GOAL}-daraja.</p>
      </div>

      <div className="mx-auto grid gap-2 w-fit p-3 rounded-2xl bg-slate-900/60 border border-border"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {cells.map((lv, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            className="w-[clamp(44px,15vw,64px)] h-[clamp(44px,15vw,64px)] rounded-xl flex items-center justify-center font-extrabold text-white text-lg transition-transform select-none"
            style={{
              ...(lv > 0 ? tileStyle(lv) : { background: "rgba(255,255,255,0.05)" }),
              transform: i === selected ? "scale(1.12)" : "scale(1)",
              outline: i === selected ? "3px solid white" : "none",
            }}>
            {lv > 0 ? (lv >= GOAL ? `${lv}⭐` : lv) : ""}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={addTile}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition">
          <Plus className="w-4 h-4" /> Yangi plitka
        </button>
        <button onClick={reset}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary font-bold text-sm active:scale-95 transition">
          <RotateCcw className="w-4 h-4" /> Boshidan
        </button>
      </div>
    </div>
  );
}
