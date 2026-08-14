import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Trophy, Clock, Infinity as InfinityIcon } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question { id: string; question: string; options: string[]; difficulty: string; time_seconds: number | null }
interface TakeData {
  test: {
    id: string; title: string; subject: string; duration_minutes: number;
    has_options: boolean; timed: boolean; pause_seconds: number;
  };
  questions: Question[];
  server_now: string;
}
interface LeaderboardRow {
  place: number; student_name: string; class_name: string;
  score: number; total: number; is_me: boolean;
}
interface SubmitResult { score: number; total: number; percentage: number; correct_count: number; incorrect_count: number }

function ResultRing({ percentage }: { percentage: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(percentage), 100);
    return () => clearTimeout(t);
  }, [percentage]);
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  const color = percentage >= 80 ? "#22c55e" : percentage >= 60 ? "#3b82f6" : percentage >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
}

type Answer = { chosen_index?: number; text_answer?: string };

export default function MonitoringTakePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const testId = params.id;

  const [data, setData] = useState<TakeData | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [qIndex, setQIndex] = useState(0);
  const [qSecondsLeft, setQSecondsLeft] = useState<number | null>(null);
  const [pauseLeft, setPauseLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | { score: -1; total: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const submittedRef = useRef(false);
  const advancingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/take`, { headers: authH() });
        const json = await r.json();
        if (!r.ok) { setError(json.error ?? "Xatolik yuz berdi"); return; }
        const td = json as TakeData;
        setData(td);
        if (td.test.timed) {
          setQSecondsLeft(td.questions[0]?.time_seconds ?? 30);
        }
      } catch {
        setError("Server bilan bog'lanishda muammo");
      }
    })();
  }, [testId]);

  const currentQuestion = data?.questions[qIndex];
  const isLast = data ? qIndex === data.questions.length - 1 : false;

  const goNext = () => {
    if (advancingRef.current || !data) return;
    advancingRef.current = true;
    if (isLast) {
      void handleSubmit();
      return;
    }
    const doAdvance = () => {
      setQIndex((i) => i + 1);
      const nextQ = data.questions[qIndex + 1];
      if (data.test.timed) setQSecondsLeft(nextQ?.time_seconds ?? 30);
      setPauseLeft(null);
      advancingRef.current = false;
    };
    if (data.test.pause_seconds > 0) {
      setPauseLeft(data.test.pause_seconds);
    } else {
      doAdvance();
    }
  };

  // ── Pauza sanog'i (javob belgilangach, keyingi savolga o'tishdan oldin) ──
  useEffect(() => {
    if (pauseLeft === null || !data) return;
    if (pauseLeft <= 0) {
      setQIndex((i) => i + 1);
      const nextQ = data.questions[qIndex + 1];
      if (data.test.timed) setQSecondsLeft(nextQ?.time_seconds ?? 30);
      setPauseLeft(null);
      advancingRef.current = false;
      return;
    }
    const id = setTimeout(() => setPauseLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseLeft]);

  // ── Har savol uchun taймer ──
  useEffect(() => {
    if (!data || !data.test.timed || result || pauseLeft !== null) return;
    if (qSecondsLeft === null) return;
    if (qSecondsLeft <= 0) {
      goNext();
      return;
    }
    const id = setTimeout(() => setQSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qSecondsLeft, result, pauseLeft]);

  const selectOption = (oi: number) => {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: { chosen_index: oi } }));
  };
  const setTextAnswer = (val: string) => {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: { text_answer: val } }));
  };

  const handleSubmit = async () => {
    if (!data || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        answers: data.questions.map((q) => ({
          question_id: q.id,
          chosen_index: answers[q.id]?.chosen_index,
          text_answer: answers[q.id]?.text_answer,
        })),
      };
      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/submit`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok) { setError(json.error ?? "Xatolik yuz berdi"); submittedRef.current = false; return; }
      if (typeof json.score === "number") {
        setResult(json as SubmitResult);
        const lb = await fetch(`${API_BASE}/monitoring/tests/${testId}/leaderboard`, { headers: authH() });
        if (lb.ok) setLeaderboard(await lb.json());
      } else {
        setResult({ score: -1, total: data.questions.length });
      }
    } finally {
      setSubmitting(false);
      advancingRef.current = false;
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <XCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
        <p className="font-medium">{error}</p>
        <button onClick={() => setLocation("/monitoring")} className="mt-4 text-sm text-primary underline">
          Monitoring ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (result) {
    const hasScore = result.score >= 0;
    return (
      <div className="max-w-xl mx-auto space-y-6 text-center py-8 animate-in fade-in zoom-in-95 duration-500">
        {hasScore ? (
          <>
            <ResultRing percentage={(result as SubmitResult).percentage} />
            <div>
              <h2 className="text-xl font-bold">Test yakunlandi! 🎉</h2>
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {(result as SubmitResult).correct_count} to'g'ri
                </span>
                <span className="flex items-center gap-1.5 text-red-500 font-semibold text-sm">
                  <XCircle className="w-4 h-4" /> {(result as SubmitResult).incorrect_count} xato
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <div>
              <h2 className="text-xl font-bold">Test yakunlandi!</h2>
              <p className="text-muted-foreground mt-1">Javoblaringiz qabul qilindi. Natija keyinroq e'lon qilinadi.</p>
            </div>
          </>
        )}

        {leaderboard && (
          <div className="text-left rounded-xl border divide-y">
            {leaderboard.slice(0, 10).map((row) => (
              <div key={row.place} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${row.is_me ? "bg-primary/10" : ""}`}>
                <span className="w-6 text-center font-bold text-muted-foreground">
                  {row.place <= 3 ? (row.place === 1 ? "🥇" : row.place === 2 ? "🥈" : "🥉") : row.place}
                </span>
                <span className="flex-1 font-medium truncate">{row.student_name}</span>
                <span className="text-muted-foreground">{row.class_name}</span>
                <span className="font-bold">{row.score}/{row.total}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setLocation("/monitoring")} className="text-sm text-primary underline">
          Monitoring ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  // ── Pauza ekrani ──
  if (pauseLeft !== null) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-3xl font-black text-primary tabular-nums">{pauseLeft}</span>
        </div>
        <p className="font-medium">Keyingi savolga tayyorlaning...</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const answeredCount = Object.keys(answers).length;
  const currentAnswer = answers[currentQuestion.id];
  const mm = qSecondsLeft !== null ? Math.floor(qSecondsLeft / 60) : 0;
  const ss = qSecondsLeft !== null ? qSecondsLeft % 60 : 0;
  const timeLow = qSecondsLeft !== null && qSecondsLeft <= 10;
  const canAdvance = data.test.has_options ? currentAnswer?.chosen_index !== undefined : !!currentAnswer?.text_answer?.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">{data.test.subject}</h1>
          <p className="text-muted-foreground text-xs">{qIndex + 1}/{data.questions.length}-savol • {answeredCount} javob berildi</p>
        </div>
        {data.test.timed ? (
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono font-bold text-sm tabular-nums ${
            timeLow ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted text-muted-foreground text-xs font-medium">
            <InfinityIcon className="w-3.5 h-3.5" /> Vaqt cheklovsiz
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((qIndex + 1) / data.questions.length) * 100}%` }} />
      </div>

      <div key={currentQuestion.id} className="rounded-xl border p-5 animate-in fade-in slide-in-from-right-2 duration-300">
        <p className="font-semibold text-lg mb-4">{currentQuestion.question}</p>
        {data.test.has_options ? (
          <div className="grid gap-2">
            {currentQuestion.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => selectOption(oi)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  currentAnswer?.chosen_index === oi ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            autoFocus
            placeholder="Javobingizni yozing..."
            value={currentAnswer?.text_answer ?? ""}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>

      <button
        onClick={goNext}
        disabled={submitting || !canAdvance}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isLast ? <Trophy className="w-4 h-4" /> : null}
        {isLast ? "Yakunlash" : "Keyingi savol"}
      </button>
    </div>
  );
}
