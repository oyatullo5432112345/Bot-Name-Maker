import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Trophy } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question { id: string; question: string; options: string[] }
interface TakeData {
  test: { id: string; title: string; subject: string; duration_minutes: number };
  questions: Question[];
}
interface LeaderboardRow {
  place: number; student_name: string; class_name: string;
  score: number; total: number; is_me: boolean;
}

export default function MonitoringTakePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const testId = params.id;

  const [data, setData] = useState<TakeData | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/take`, { headers: authH() });
        const json = await r.json();
        if (!r.ok) { setError(json.error ?? "Xatolik yuz berdi"); return; }
        setData(json as TakeData);
      } catch {
        setError("Server bilan bog'lanishda muammo");
      }
    })();
  }, [testId]);

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: data.questions.map((q) => ({
          question_id: q.id,
          chosen_index: answers[q.id] ?? -1,
        })),
      };
      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/submit`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok) { setError(json.error ?? "Xatolik yuz berdi"); return; }
      if (typeof json.score === "number") {
        setResult({ score: json.score, total: json.total });
        const lb = await fetch(`${API_BASE}/monitoring/tests/${testId}/leaderboard`, { headers: authH() });
        if (lb.ok) setLeaderboard(await lb.json());
      } else {
        setResult({ score: -1, total: data.questions.length });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <XCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
        <p className="font-medium">{error}</p>
        <button
          onClick={() => setLocation("/monitoring")}
          className="mt-4 text-sm text-primary underline"
        >
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
    return (
      <div className="max-w-xl mx-auto space-y-6 text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
        <div>
          <h2 className="text-xl font-bold">Test yakunlandi!</h2>
          {result.score >= 0 ? (
            <p className="text-muted-foreground mt-1">
              Natijangiz: <span className="font-bold text-foreground">{result.score} / {result.total}</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">Javoblaringiz qabul qilindi. Natija keyinroq e'lon qilinadi.</p>
          )}
        </div>

        {leaderboard && (
          <div className="text-left rounded-xl border divide-y">
            {leaderboard.slice(0, 10).map((row) => (
              <div
                key={row.place}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${row.is_me ? "bg-primary/10" : ""}`}
              >
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

        <button
          onClick={() => setLocation("/monitoring")}
          className="text-sm text-primary underline"
        >
          Monitoring ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">{data.test.subject} — {data.test.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {answeredCount}/{data.questions.length} savolga javob berildi
        </p>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border p-4">
            <p className="font-medium mb-3">{qi + 1}. {q.question}</p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    answers[q.id] === oi
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
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
