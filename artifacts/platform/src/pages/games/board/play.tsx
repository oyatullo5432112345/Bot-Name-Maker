import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Trophy, RotateCcw, Loader2, Gift, Skull, Zap,
  HelpCircle, TrendingDown, CheckCircle2, XCircle, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { playSound } from "@/lib/game-sounds";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Cell {
  id: string; position: number; type: "question"|"bonus"|"penalty"|"lose"|"steal";
  question: string | null; options: string[] | null; correct_index: number | null;
  points: number; steal_percent: number; time_seconds: number | null;
  revealed: boolean; claimed_by_team: number | null;
}
interface Game {
  id: string; title: string; team_count: number; cell_count: number;
  session_status: "not_started"|"playing"|"finished";
  team_scores: { name: string; score: number }[]; current_team: number;
}

const TYPE_ICON: Record<Cell["type"], typeof HelpCircle> = {
  question: HelpCircle, bonus: Gift, penalty: TrendingDown, lose: Skull, steal: Zap,
};
const TEAM_COLORS = ["#3b82f6", "#ec4899", "#22c55e"];

export default function BoardGamePlayPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeCell, setActiveCell] = useState<Cell | null>(null);
  const [resolving, setResolving] = useState(false);
  const [stealTarget, setStealTarget] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ game: Game; cells: Cell[] }>({
    queryKey: ["board-game", params.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/board-games/${params.id}`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
    refetchInterval: 4000,
  });

  const playedWinSoundRef = useRef(false);
  useEffect(() => {
    if (data?.game.session_status === "finished") {
      if (!playedWinSoundRef.current) {
        playedWinSoundRef.current = true;
        playSound("win");
      }
    } else {
      playedWinSoundRef.current = false;
    }
  }, [data?.game.session_status]);

  const startSession = async () => {
    await fetch(`${API_BASE}/board-games/${params.id}/session/start`, { method: "POST", headers: authH() });
    qc.invalidateQueries({ queryKey: ["board-game", params.id] });
  };

  const openCell = async (cell: Cell) => {
    if (cell.claimed_by_team !== null || data?.game.session_status !== "playing") return;
    const r = await fetch(`${API_BASE}/board-games/${params.id}/cells/${cell.id}/reveal`, { method: "POST", headers: authH() });
    const full = await r.json();
    setActiveCell(full);
    setStealTarget(null);
    qc.invalidateQueries({ queryKey: ["board-game", params.id] });
  };

  const resolve = async (outcome: "correct" | "incorrect" | "ack" | "steal", targetTeam?: number) => {
    if (!activeCell) return;
    setResolving(true);
    try {
      if (outcome === "correct") playSound("correct");
      else if (outcome === "incorrect") playSound("wrong");
      else if (outcome === "steal") playSound("steal");
      else if (activeCell.type === "lose") playSound("lose");
      else if (activeCell.type === "bonus") playSound("win");
      else playSound("click");

      await fetch(`${API_BASE}/board-games/${params.id}/cells/${activeCell.id}/resolve`, {
        method: "POST", headers: authH(), body: JSON.stringify({ outcome, target_team: targetTeam }),
      });
      setActiveCell(null);
      qc.invalidateQueries({ queryKey: ["board-game", params.id] });
    } finally {
      setResolving(false);
    }
  };

  if (isLoading || !data) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { game, cells } = data;
  const cols = Math.ceil(Math.sqrt(game.cell_count));

  if (game.session_status === "finished") {
    const winner = [...game.team_scores].sort((a, b) => b.score - a.score)[0];
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <Trophy className="w-16 h-16 mx-auto text-amber-500" />
        <h1 className="text-2xl font-black">🎉 {winner?.name} g'olib bo'ldi!</h1>
        <div className="space-y-2 max-w-xs mx-auto">
          {[...game.team_scores].sort((a, b) => b.score - a.score).map((t, i) => (
            <div key={t.name} className="flex items-center justify-between rounded-lg border px-4 py-2">
              <span className="font-medium">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {t.name}</span>
              <span className="font-bold">{t.score} HP</span>
            </div>
          ))}
        </div>
        <Button onClick={startSession} className="gap-2"><RotateCcw className="w-4 h-4" /> Qayta o'ynash</Button>
        <div><Link href="/games/board" className="text-sm text-primary underline">Arxivga qaytish</Link></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <Link href="/games/board" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Arxivga qaytish
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">{game.title}</h1>
        {game.session_status === "not_started" ? (
          <Button onClick={startSession} className="gap-2"><Play className="w-4 h-4" /> O'yinni boshlash</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startSession} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Qayta boshlash</Button>
        )}
      </div>

      {/* Jamoalar va navbat */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${game.team_count}, 1fr)` }}>
        {game.team_scores.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl border-2 p-3 text-center transition-all ${game.current_team === i && game.session_status === "playing" ? "shadow-lg scale-105" : ""}`}
            style={{ borderColor: TEAM_COLORS[i], background: game.current_team === i ? `${TEAM_COLORS[i]}15` : undefined }}
          >
            <p className="text-xs font-semibold" style={{ color: TEAM_COLORS[i] }}>
              {t.name} {game.current_team === i && game.session_status === "playing" && "• navbatda"}
            </p>
            <p className="text-2xl font-black mt-1">{t.score}</p>
          </div>
        ))}
      </div>

      {/* Doska */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((c) => {
          const Icon = TYPE_ICON[c.type];
          const claimed = c.claimed_by_team !== null;
          return (
            <button
              key={c.id}
              onClick={() => openCell(c)}
              disabled={claimed || game.session_status !== "playing"}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 font-bold transition-all ${
                claimed
                  ? "opacity-30"
                  : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground hover:scale-105 active:scale-95 shadow"
              }`}
              style={claimed ? { borderColor: TEAM_COLORS[c.claimed_by_team!], borderWidth: 2 } : undefined}
            >
              {claimed ? <Icon className="w-4 h-4" /> : <span className="text-lg">{c.position + 1}</span>}
            </button>
          );
        })}
      </div>

      {/* Katakcha modali */}
      <Dialog open={!!activeCell} onOpenChange={(o) => !o && setActiveCell(null)}>
        <DialogContent className="max-w-md">
          {activeCell && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => { const Icon = TYPE_ICON[activeCell.type]; return <Icon className="w-5 h-5" />; })()}
                  {activeCell.type === "question" && "Savol"}
                  {activeCell.type === "bonus" && "🎁 Bonus!"}
                  {activeCell.type === "penalty" && "⚠️ Jarima"}
                  {activeCell.type === "lose" && "💀 Yutqazdingiz!"}
                  {activeCell.type === "steal" && "⚡ O'g'irlash imkoniyati"}
                </DialogTitle>
              </DialogHeader>

              {activeCell.type === "question" && (
                <div className="space-y-3">
                  <p className="font-semibold text-lg">{activeCell.question}</p>
                  <div className="grid gap-1.5">
                    {activeCell.options?.map((opt, oi) => (
                      <div key={oi} className={`px-3 py-2 rounded-lg border text-sm ${oi === activeCell.correct_index ? "border-emerald-400 bg-emerald-50 font-medium" : ""}`}>
                        {opt} {oi === activeCell.correct_index && "✓"}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">To'g'ri javob berilsa +{activeCell.points} HP</p>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => resolve("correct")} disabled={resolving}>
                      <CheckCircle2 className="w-4 h-4" /> To'g'ri
                    </Button>
                    <Button className="flex-1 gap-1.5" variant="destructive" onClick={() => resolve("incorrect")} disabled={resolving}>
                      <XCircle className="w-4 h-4" /> Xato
                    </Button>
                  </div>
                </div>
              )}

              {activeCell.type === "bonus" && (
                <div className="text-center space-y-3 py-2">
                  <p className="text-3xl font-black text-emerald-600">+{activeCell.points} HP</p>
                  <Button onClick={() => resolve("ack")} disabled={resolving} className="w-full">Davom etish</Button>
                </div>
              )}
              {activeCell.type === "penalty" && (
                <div className="text-center space-y-3 py-2">
                  <p className="text-3xl font-black text-red-600">-{activeCell.points} HP</p>
                  <Button onClick={() => resolve("ack")} disabled={resolving} className="w-full">Davom etish</Button>
                </div>
              )}
              {activeCell.type === "lose" && (
                <div className="text-center space-y-3 py-2">
                  <p className="text-muted-foreground">Ballaringiz nolga tushadi</p>
                  <Button onClick={() => resolve("ack")} disabled={resolving} className="w-full">Davom etish</Button>
                </div>
              )}
              {activeCell.type === "steal" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">Qaysi jamoadan {activeCell.steal_percent}% ball o'g'irlanadi?</p>
                  <div className="grid gap-2">
                    {game.team_scores.map((t, i) => i !== game.current_team && (
                      <button
                        key={i}
                        onClick={() => setStealTarget(i)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium ${stealTarget === i ? "border-primary bg-primary/10" : ""}`}
                      >
                        {t.name} ({t.score} HP)
                      </button>
                    ))}
                  </div>
                  <Button className="w-full" disabled={stealTarget === null || resolving} onClick={() => resolve("steal", stealTarget!)}>
                    O'g'irlash
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
