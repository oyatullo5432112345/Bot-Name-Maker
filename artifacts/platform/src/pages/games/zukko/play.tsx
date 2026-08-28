import { useState } from "react";
import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Star, ArrowLeft, Coins } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question { id: string; question: string; options: string[] }
interface Result { score: number; total: number; stars: number; coins_earned: number }

export default function ZukkoPlayPage() {
  const params = useParams<{ level: string }>();
  const [, setLocation] = useLocation();
  const level = params.level;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${API_BASE}/riddles/level/${level}`, { headers: authH() });
      const json = await r.json();
      if (!r.ok) {
        setError(json.pro_required ? "Bu bosqich faqat Pro foydalanuvchilar uchun" : (json.error ?? "Xatolik"));
        return;
      }
      setQuestions(json.questions);
    })();
  }, [level]);

  const current = questions?.[qIndex];

  const selectOption = (i: number) => {
    if (showFeedback || !current) return;
    setSelected(i);
    setShowFeedback(true);
    setAnswers(a => ({ ...a, [current.id]: i }));
    setTimeout(() => {
      if (questions && qIndex < questions.length - 1) {
        setQIndex(q => q + 1);
        setSelected(null);
        setShowFeedback(false);
      } else {
        void handleSubmit({ ...answers, [current.id]: i });
      }
    }, 900);
  };

  const handleSubmit = async (finalAnswers: Record<string, number>) => {
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/riddles/level/${level}/submit`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ answers: Object.entries(finalAnswers).map(([question_id, chosen_index]) => ({ question_id, chosen_index })) }),
      });
      const json = await r.json();
      if (r.ok) setResult(json);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/pro" className="text-primary underline text-sm">Pro versiyani ko'rish</Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto text-center py-14 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3].map(s => (
            <Star key={s} className={`w-10 h-10 ${s <= result.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
              style={{ animation: s <= result.stars ? `pop 0.4s ease ${s * 0.15}s both` : undefined }} />
          ))}
        </div>
        <style>{`@keyframes pop { 0% { transform: scale(0); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }`}</style>
        <div>
          <h2 className="text-xl font-bold">{level}-bosqich yakunlandi!</h2>
          <p className="text-muted-foreground text-sm mt-1">{result.score}/{result.total} to'g'ri javob</p>
        </div>
        {result.coins_earned > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-amber-400 font-semibold text-sm">
            <Coins className="w-4 h-4" /> +{result.coins_earned} tanga
          </div>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <Link href="/games/zukko">
            <button className="px-5 py-2.5 rounded-xl border font-medium text-sm">Bosqichlarga qaytish</button>
          </Link>
          <button
            onClick={() => setLocation(`/games/zukko/${Number(level) + 1}`)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
          >
            Keyingi bosqich →
          </button>
        </div>
      </div>
    );
  }

  if (!questions || submitting) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!current) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/games/zukko" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Chiqish
      </Link>

      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-center">{qIndex + 1} / {questions.length}-savol</p>

      <div key={current.id} className="rounded-2xl border p-6 animate-in fade-in slide-in-from-right-2 duration-300">
        <p className="font-semibold text-lg text-center mb-5">{current.question}</p>
        <div className="grid gap-2.5">
          {current.options.map((opt, oi) => {
            const isSelected = selected === oi;
            return (
              <button
                key={oi}
                onClick={() => selectOption(oi)}
                disabled={showFeedback}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isSelected ? "border-violet-500 bg-violet-500/10" : "hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
