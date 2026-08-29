import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles, Clock, CheckCircle2, XCircle, Trophy, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

// Web Audio API yordamida dinamik sound effektlar
const playWheelSound = (type: "spin" | "correct" | "wrong" | "win" | "tick") => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "tick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === "correct" || type === "win") {
      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      osc.frequency.setValueAtTime(1046.5, now + 0.36);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc.start();
      osc.stop(now + 0.7);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.setValueAtTime(90, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Audio renderlash muammosi bo'lganda e'tiborsiz qoldiriladi
  }
};

interface Segment { label: string; weight: number; color: string; question?: string; correct_answer?: string; points?: number }
interface WheelGame {
  id: string; title: string; segments: Segment[]; time_limit_seconds: number | null;
  team_count: number; team_scores: { name: string; score: number }[]; current_team: number;
  session_status: "not_started" | "playing" | "finished";
}
const TEAM_COLORS = ["#3b82f6", "#ec4899", "#22c55e", "#f59e0b"];

type Phase = "idle" | "spinning" | "revealed" | "answering" | "judging";

export default function WheelSpinPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<Segment | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [judgePoints, setJudgePoints] = useState(10);
  const [showConfetti, setShowConfetti] = useState(false);
  const spinCountRef = useRef(0);

  const { data: game, isLoading } = useQuery<WheelGame>({
    queryKey: ["wheel-game", params.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/wheel-games/${params.id}`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
    refetchInterval: phase === "idle" ? 5000 : false,
  });

  useEffect(() => {
    if (timeLeft === null || phase !== "answering") return;
    if (timeLeft <= 0) return;
    const id = setTimeout(() => {
      if (timeLeft <= 5) playWheelSound("tick");
      setTimeLeft((s) => (s !== null ? s - 1 : s));
    }, 1000);
    return () => clearTimeout(id);
  }, [timeLeft, phase]);

  const startSession = async () => {
    await fetch(`${API_BASE}/wheel-games/${params.id}/session/start`, { method: "POST", headers: authH() });
    setPhase("idle");
    qc.invalidateQueries({ queryKey: ["wheel-game", params.id] });
  };

  const handleSpin = async () => {
    if (!game || phase === "spinning") return;
    setWinner(null);
    setPhase("spinning");
    setAnswerText("");
    setTimeLeft(null);

    const audioInterval = setInterval(() => {
      playWheelSound("tick");
    }, 120);

    setTimeout(() => {
      clearInterval(audioInterval);
    }, 3800);

    const r = await fetch(`${API_BASE}/wheel-games/${params.id}/spin`, { method: "POST", headers: authH() });
    const json = await r.json();
    const idx = json.winner_index as number;

    const segAngle = 360 / game.segments.length;
    const targetAngle = 360 - (idx * segAngle + segAngle / 2);
    spinCountRef.current += 1;
    const fullSpins = 6 + spinCountRef.current;
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360);
    setRotation(finalRotation);

    setTimeout(() => {
      const w = json.winner as Segment;
      setWinner(w);
      setJudgePoints(w.points ?? 10);
      playWheelSound("correct");

      if (w.question) {
        setPhase("revealed");
        if (game.time_limit_seconds) setTimeLeft(game.time_limit_seconds);
      } else {
        setPhase("idle");
      }
    }, 4200);
  };

  const startAnswering = () => {
    setPhase("answering");
    if (game?.time_limit_seconds) setTimeLeft(game.time_limit_seconds);
    else setTimeLeft(20);
  };

  const submitAnswer = () => {
    setPhase("judging");
  };

  const applyJudgement = async (outcome: "correct" | "incorrect" | "skip") => {
    if (outcome === "correct") {
      playWheelSound("win");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else if (outcome === "incorrect") {
      playWheelSound("wrong");
    }

    await fetch(`${API_BASE}/wheel-games/${params.id}/judge`, {
      method: "POST",
      headers: authH(),
      body: JSON.stringify({ outcome, points: outcome === "skip" ? 0 : judgePoints }),
    });
    setPhase("idle");
    setWinner(null);
    qc.invalidateQueries({ queryKey: ["wheel-game", params.id] });
  };

  const finishGame = async () => {
    await fetch(`${API_BASE}/wheel-games/${params.id}/session/finish`, { method: "POST", headers: authH() });
    playWheelSound("win");
    qc.invalidateQueries({ queryKey: ["wheel-game", params.id] });
  };

  if (isLoading || !game) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-rose-500" /></div>;
  }

  if (game.session_status === "finished") {
    const sorted = [...game.team_scores].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
          <Trophy className="w-20 h-20 mx-auto text-amber-400 relative z-10 animate-bounce" />
        </div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
          🎉 {sorted[0]?.name} g'olib bo'ldi!
        </h1>
        <div className="space-y-2.5 max-w-xs mx-auto">
          {sorted.map((t, i) => (
            <div key={t.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md px-5 py-3 shadow-lg">
              <span className="font-bold text-sm flex items-center gap-2">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎗️"} {t.name}
              </span>
              <span className="font-black text-rose-400">{t.score} ball</span>
            </div>
          ))}
        </div>
        <Button onClick={startSession} className="gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 rounded-xl font-bold">
          <RotateCcw className="w-4 h-4" /> Qayta o'ynash
        </Button>
        <div><Link href="/games/wheel" className="text-sm text-rose-400 hover:underline">Ro'yxatga qaytish</Link></div>
      </div>
    );
  }

  const n = game.segments.length;
  const segAngle = 360 / n;
  const size = 320;
  const r = size / 2;

  const slicePath = (i: number) => {
    const start = (i * segAngle - 90) * (Math.PI / 180);
    const end = ((i + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = r + r * Math.cos(start), y1 = r + r * Math.sin(start);
    const x2 = r + r * Math.cos(end), y2 = r + r * Math.sin(end);
    const large = segAngle > 180 ? 1 : 0;
    return `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-center pb-12 relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-4xl animate-bounce flex gap-3">
            <span>🎉</span><span>⭐</span><span>✨</span><span>🏆</span><span>🎉</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/games/wheel" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/60 px-3 py-1.5 rounded-xl border border-border/50 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Orqaga
        </Link>
        {game.session_status === "not_started" ? (
          <Button size="sm" onClick={startSession} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl shadow-md">
            <Play className="w-3.5 h-3.5" /> Boshlash
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={finishGame} className="gap-1.5 text-xs font-bold rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            <Trophy className="w-3.5 h-3.5" /> Yakunlash
          </Button>
        )}
      </div>

      <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent">
        {game.title}
      </h1>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${game.team_count}, 1fr)` }}>
        {game.team_scores.map((t, i) => {
          const isCurrent = game.current_team === i && game.session_status === "playing";
          return (
            <div
              key={i}
              className={`rounded-2xl border-2 p-3 text-center transition-all duration-300 relative overflow-hidden ${
                isCurrent ? "shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-105 bg-card" : "bg-card/40 border-border/60 opacity-80"
              }`}
              style={{ borderColor: TEAM_COLORS[i] }}
            >
              {isCurrent && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping m-1.5" />
              )}
              <p className="text-[11px] font-black truncate uppercase tracking-wider" style={{ color: TEAM_COLORS[i] }}>
                {t.name}
              </p>
              <p className="text-2xl font-black mt-0.5">{t.score}</p>
            </div>
          );
        })}
      </div>

      {phase === "idle" || phase === "spinning" ? (
        <div className="space-y-6">
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-[0_4px_10px_rgba(239,68,68,0.8)]">
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-rose-500" />
            </div>

            <svg
              viewBox={`0 0 ${size} ${size}`} width={size} height={size}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: phase === "spinning" ? "transform 4.2s cubic-bezier(0.15, 0.8, 0.15, 0.99)" : undefined
              }}
              className="drop-shadow-2xl rounded-full border-4 border-white/10"
            >
              {game.segments.map((s, i) => {
                const mid = (i * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
                const lx = r + (r * 0.62) * Math.cos(mid);
                const ly = r + (r * 0.62) * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={slicePath(i)} fill={s.color} stroke="#1e293b" strokeWidth={2.5} />
                    {s.question && (
                      <circle cx={r + (r * 0.85) * Math.cos(mid)} cy={r + (r * 0.85) * Math.sin(mid)} r={5} fill="white" className="animate-pulse" />
                    )}
                    <text
                      x={lx} y={ly} fill="white" fontSize={n > 8 ? 10 : 12} fontWeight={800}
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${i * segAngle + segAngle / 2}, ${lx}, ${ly})`}
                    >
                      {s.label.length > 12 ? s.label.slice(0, 11) + "…" : s.label}
                    </text>
                  </g>
                );
              })}
              <circle cx={r} cy={r} r={r * 0.12} fill="#0f172a" stroke="#f43f5e" strokeWidth={4} />
              <circle cx={r} cy={r} r={r * 0.05} fill="#f43f5e" />
            </svg>
          </div>

          <Button
            size="lg"
            onClick={handleSpin}
            disabled={phase === "spinning" || game.session_status !== "playing"}
            className="w-full py-6 text-base font-black gap-2 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-xl shadow-rose-500/25 rounded-2xl active:scale-95 transition-all"
          >
            {phase === "spinning" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {phase === "spinning" ? "Charxpalak aylanmoqda..." : "Aylantirish!"}
          </Button>

          {winner && phase === "idle" && (
            <div className="p-4 rounded-2xl bg-card border border-rose-500/30 animate-in fade-in zoom-in-95 duration-300 space-y-1">
              <p className="text-xs text-muted-foreground font-bold">Tanlangan bo'lim:</p>
              <p className="text-2xl font-black" style={{ color: winner.color }}>{winner.label}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border-2 p-6 space-y-5 bg-card/90 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300" style={{ borderColor: winner?.color }}>
          <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-3xl shadow-inner">
            🎯
          </div>
          <p className="font-black text-2xl" style={{ color: winner?.color }}>{winner?.label}</p>

          {phase === "revealed" && (
            <div className="space-y-4">
              <p className="font-extrabold text-lg text-foreground">{winner?.question}</p>
              {timeLeft !== null && (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono font-black text-sm ${timeLeft <= 5 ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40" : "bg-sky-500/20 text-sky-300 border border-sky-500/40"}`}>
                  <Clock className="w-4 h-4" /> {timeLeft} soniya
                </div>
              )}
              <Button onClick={startAnswering} className="w-full py-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                Javob berishga tayyormiz
              </Button>
            </div>
          )}

          {phase === "answering" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">{winner?.question}</p>
              <div className="flex justify-center">
                <span className={`rounded-full px-4 py-1 font-mono font-black text-sm ${timeLeft !== null && timeLeft <= 5 ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40" : "bg-sky-500/20 text-sky-300 border border-sky-500/40"}`}>
                  {timeLeft}s qoldi
                </span>
              </div>
              <Input
                placeholder="Javobni kiriting..."
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                className="text-center text-base font-bold rounded-xl py-5 border-border/80 focus:border-rose-500"
                autoFocus
              />
              <Button onClick={submitAnswer} className="w-full py-5 rounded-xl font-bold bg-gradient-to-r from-rose-500 to-pink-600">
                Tasdiqlash
              </Button>
            </div>
          )}

          {phase === "judging" && (
            <div className="space-y-4 text-left">
              <div className="rounded-2xl bg-secondary/50 p-4 space-y-2 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase">O'quvchi javobi:</p>
                <p className="font-bold text-base text-foreground">{answerText || "(bo'sh)"}</p>
                {winner?.correct_answer && (
                  <>
                    <hr className="border-border/40 my-2" />
                    <p className="text-xs font-bold text-muted-foreground uppercase">To'g'ri javob:</p>
                    <p className="font-black text-emerald-400">{winner.correct_answer}</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-xl border border-border/40">
                <label className="text-xs font-bold text-muted-foreground shrink-0">Beriladigan ball:</label>
                <Input type="number" min={0} max={100} value={judgePoints} onChange={e => setJudgePoints(Number(e.target.value))} className="h-9 text-sm font-bold rounded-lg text-center" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl py-5 shadow-lg shadow-emerald-600/20" onClick={() => applyJudgement("correct")}>
                  <CheckCircle2 className="w-4 h-4" /> To'g'ri (+{judgePoints})
                </Button>
                <Button className="flex-1 gap-1.5 font-bold rounded-xl py-5" variant="destructive" onClick={() => applyJudgement("incorrect")}>
                  <XCircle className="w-4 h-4" /> Xato (-{judgePoints})
                </Button>
              </div>

              <button onClick={() => applyJudgement("skip")} className="text-xs font-semibold text-muted-foreground w-full text-center hover:underline pt-1">
                O'tkazib yuborish (0 ball)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
