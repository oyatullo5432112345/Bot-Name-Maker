import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Trophy, Clock } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question { id: string; question: string; options: string[] }
interface TakeData {
  test: { id: string; title: string; subject: string; duration_minutes: number; has_options: boolean };
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

export default function MonitoringTakePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const testId = params.id;

  const [data, setData] = useState<TakeData | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | { score: -1; total: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/take`, { headers: authH() });
        const json = await r.json();
        if (!r.ok) { setError(json.error ?? "Xatolik yuz berdi"); return; }
        setData(json as TakeData);
        setSecondsLeft((json as TakeData).test.duration_minutes * 60);
      } catch {
        setError("Server bilan bog'lanishda muammo");
      }
    })();
  }, [testId]);

  const handleSubmit = async () => {
    if (!data || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        answers: data.questions.map((q) => (
          data.test.has_options
            ? { question_id: q.id, chosen_index: answers[q.id] ?? -1 }
            : { question_id: q.id, text_answer: textAnswers[q.id] ?? "" }
        )),
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
    }
  };

  // ── Taymer: har soniyada kamayadi, vaqt tugasa avtomatik yuboriladi ──
  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      void handleSubmit();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

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

  const answeredCount = data.test.has_options
    ? Object.keys(answers).length
    : Object.values(textAnswers).filter(v => v.trim()).length;

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;
  const timeLow = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur border-b flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">{data.test.subject}</h1>
          <p className="text-muted-foreground text-xs">{answeredCount}/{data.questions.length} savolga javob berildi</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono font-bold text-sm tabular-nums ${
          timeLow ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border p-4">
            <p className="font-medium mb-3">{qi + 1}. {q.question}</p>
            {data.test.has_options ? (
              <div className="grid gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      answers[q.id] === oi ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Javobingizni yozing..."
                value={textAnswers[q.id] ?? ""}
                onChange={(e) => setTextAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || answeredCount < data.questions.length}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
        Javoblarni yuborish
      </button>
    </div>
  );
}
