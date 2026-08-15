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
    const id = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : s)), 1000);
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

    const r = await fetch(`${API_BASE}/wheel-games/${params.id}/spin`, { method: "POST", headers: authH() });
    const json = await r.json();
    const idx = json.winner_index as number;

    const segAngle = 360 / game.segments.length;
    const targetAngle = 360 - (idx * segAngle + segAngle / 2);
    spinCountRef.current += 1;
    const fullSpins = 5 + spinCountRef.current;
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360);
    setRotation(finalRotation);

    setTimeout(() => {
      const w = json.winner as Segment;
      setWinner(w);
      setJudgePoints(w.points ?? 10);
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
    setTimeLeft(19);
  };

  const submitAnswer = () => {
    setPhase("judging");
  };

  const applyJudgement = async (outcome: "correct" | "incorrect" | "skip") => {
    await fetch(`${API_BASE}/wheel-games/${params.id}/judge`, {
      method: "POST", headers: authH(),
      body: JSON.stringify({ outcome, points: outcome === "skip" ? 0 : judgePoints }),
    });
    setPhase("idle");
    setWinner(null);
    qc.invalidateQueries({ queryKey: ["wheel-game", params.id] });
  };

  const finishGame = async () => {
    await fetch(`${API_BASE}/wheel-games/${params.id}/session/finish`, { method: "POST", headers: authH() });
    qc.invalidateQueries({ queryKey: ["wheel-game", params.id] });
  };

  if (isLoading || !game) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (game.session_status === "finished") {
    const sorted = [...game.team_scores].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <Trophy className="w-16 h-16 mx-auto text-amber-500" />
        <h1 className="text-2xl font-black">🎉 {sorted[0]?.name} g'olib bo'ldi!</h1>
        <div className="space-y-2 max-w-xs mx-auto">
          {sorted.map((t, i) => (
            <div key={t.name} className="flex items-center justify-between rounded-lg border px-4 py-2">
              <span className="font-medium">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎗️"} {t.name}</span>
              <span className="font-bold">{t.score} ball</span>
            </div>
          ))}
        </div>
        <Button onClick={startSession} className="gap-2"><RotateCcw className="w-4 h-4" /> Qayta o'ynash</Button>
        <div><Link href="/games/wheel" className="text-sm text-primary underline">Ro'yxatga qaytish</Link></div>
      </div>
    );
  }

  const n = game.segments.length;
  const segAngle = 360 / n;
  const size = 300;
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
    <div className="max-w-md mx-auto space-y-5 text-center pb-10">
      <Link href="/games/wheel" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">{game.title}</h1>
        {game.session_status === "not_started" ? (
          <Button size="sm" onClick={startSession} className="gap-1.5"><Play className="w-3.5 h-3.5" /> Boshlash</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={finishGame} className="gap-1.5"><Trophy className="w-3.5 h-3.5" /> Yakunlash</Button>
        )}
      </div>

      {/* Jamoalar */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${game.team_count}, 1fr)` }}>
        {game.team_scores.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl border-2 p-2.5 text-center transition-all ${game.current_team === i && game.session_status === "playing" ? "shadow-lg scale-105" : ""}`}
            style={{ borderColor: TEAM_COLORS[i], background: game.current_team === i ? `${TEAM_COLORS[i]}15` : undefined }}
          >
            <p className="text-[11px] font-semibold truncate" style={{ color: TEAM_COLORS[i] }}>
              {t.name} {game.current_team === i && "•"}
            </p>
            <p className="text-xl font-black">{t.score}</p>
          </div>
        ))}
      </div>

      {phase === "idle" || phase === "spinning" ? (
        <>
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-red-500" />
            </div>
            <svg
              viewBox={`0 0 ${size} ${size}`} width={size} height={size}
              style={{ transform: `rotate(${rotation}deg)`, transition: phase === "spinning" ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : undefined }}
              className="drop-shadow-xl"
            >
              {game.segments.map((s, i) => {
                const mid = (i * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
                const lx = r + (r * 0.62) * Math.cos(mid);
                const ly = r + (r * 0.62) * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={slicePath(i)} fill={s.color} stroke="white" strokeWidth={2} />
                    {s.question && (
                      <circle cx={r + (r * 0.85) * Math.cos(mid)} cy={r + (r * 0.85) * Math.sin(mid)} r={5} fill="white" opacity={0.85} />
                    )}
                    <text
                      x={lx} y={ly} fill="white" fontSize={n > 8 ? 10 : 13} fontWeight={700}
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${i * segAngle + segAngle / 2}, ${lx}, ${ly})`}
                    >
                      {s.label.length > 12 ? s.label.slice(0, 11) + "…" : s.label}
                    </text>
                  </g>
                );
              })}
              <circle cx={r} cy={r} r={r * 0.09} fill="white" stroke="#e5e7eb" strokeWidth={3} />
            </svg>
          </div>
          <Button size="lg" onClick={handleSpin} disabled={phase === "spinning" || game.session_status !== "playing"} className="gap-2">
            {phase === "spinning" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {phase === "spinning" ? "Aylanmoqda..." : "Aylantirish"}
          </Button>
          {winner && phase === "idle" && (
            <div className="animate-in fade-in zoom-in-95 duration-500 space-y-1">
              <p className="text-sm text-muted-foreground">Natija:</p>
              <p className="text-2xl font-black" style={{ color: winner.color }}>{winner.label}</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border-2 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-500" style={{ borderColor: winner?.color }}>
          <div className="text-3xl">🎯</div>
          <p className="font-black text-2xl" style={{ color: winner?.color }}>{winner?.label}</p>

          {phase === "revealed" && (
            <>
              <p className="font-semibold text-lg">{winner?.question}</p>
              {timeLeft !== null && (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono font-bold text-sm ${timeLeft <= 5 ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"}`}>
                  <Clock className="w-3.5 h-3.5" /> {timeLeft}s
                </div>
              )}
              <Button onClick={startAnswering} className="w-full">Javob berishga tayyor</Button>
            </>
          )}

          {phase === "answering" && (
            <>
              <p className="text-sm text-muted-foreground">{winner?.question}</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className={`rounded-full px-3 py-1 font-mono font-bold text-sm ${timeLeft !== null && timeLeft <= 5 ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"}`}>
                  {timeLeft}s qoldi
                </span>
              </div>
              <Input placeholder="Javobni shu yerga yozing..." value={answerText} onChange={e => setAnswerText(e.target.value)} className="text-center" autoFocus />
              <Button onClick={submitAnswer} className="w-full">Tasdiqlash</Button>
            </>
          )}

          {phase === "judging" && (
            <div className="space-y-3 text-left">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">O'quvchi javobi:</p>
                <p className="font-medium">{answerText || "(bo'sh)"}</p>
                {winner?.correct_answer && (
                  <>
                    <p className="text-xs text-muted-foreground pt-1.5">To'g'ri javob:</p>
                    <p className="font-medium text-emerald-600">{winner.correct_answer}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Ball:</label>
                <Input type="number" min={0} max={100} value={judgePoints} onChange={e => setJudgePoints(Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => applyJudgement("correct")}>
                  <CheckCircle2 className="w-4 h-4" /> To'g'ri (+{judgePoints})
                </Button>
                <Button className="flex-1 gap-1.5" variant="destructive" onClick={() => applyJudgement("incorrect")}>
                  <XCircle className="w-4 h-4" /> Xato (-{judgePoints})
                </Button>
              </div>
              <button onClick={() => applyJudgement("skip")} className="text-xs text-muted-foreground w-full text-center">O'tkazib yuborish (ball berilmaydi)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
