import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Clock, Pause } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question {
  id: string;
  question: string;
  options?: string[];
}

interface TakeData {
  test: {
    id: string;
    title: string;
    subject: string;
    duration_minutes: number;
    has_options: boolean;
    timed: boolean;
    pause_seconds: number;
  };
  questions: Question[];
}

export default function MonitoringTakePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const testId = params.id;

  const [data, setData] = useState<TakeData | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, { chosen_index?: number; text_answer?: string }>>({});
  const [qIndex, setQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Vaqt va Pauza state-lari
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTime, setPauseTime] = useState(0);

  // Testni yuklash
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/take`, { headers: authH() });
        const json = await r.json();
        if (!r.ok) { setError(json.error ?? "Testni yuklab bo'lmadi"); return; }
        setData(json);
        if (json.test.timed && json.test.duration_minutes > 0) {
          setTimeLeft(json.test.duration_minutes * 60);
        }
      } catch {
        setError("Server bilan bog'lanishda muammo");
      }
    })();
  }, [testId]);

  // Umumiy taymer sanashi
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Vaqt tugasa avto-topshirish
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result]);

  // Pauza taymeri
  useEffect(() => {
    if (!isPaused || pauseTime <= 0) return;
    const pTimer = setInterval(() => {
      setPauseTime((prev) => {
        if (prev <= 1) {
          clearInterval(pTimer);
          setIsPaused(false);
          setQIndex((i) => i + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(pTimer);
  }, [isPaused, pauseTime]);

  const handleSubmit = async () => {
    if (!data || submitting) return;
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
      const res = await r.json();
      setResult(res);
    } catch {
      setError("Natijani yuborishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!data) return;
    const isLast = qIndex === data.questions.length - 1;

    if (isLast) {
      handleSubmit();
    } else {
      if (data.test.pause_seconds > 0) {
        setPauseTime(data.test.pause_seconds);
        setIsPaused(true);
      } else {
        setQIndex((i) => i + 1);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <XCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
        <p className="font-semibold">{error}</p>
        <button onClick={() => setLocation("/monitoring")} className="mt-4 text-sm text-primary underline">
          Orqaga qaytish
        </button>
      </div>
    );
  }

  if (!data) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold">Test Yakunlandi!</h2>
        <p className="text-muted-foreground text-sm">To'plangan ball: <b>{result.score}</b> / {result.total}</p>
        <button onClick={() => setLocation("/monitoring")} className="text-sm text-primary underline">
          Monitoring ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  const currentQ = data.questions[qIndex];
  const isLast = qIndex === data.questions.length - 1;

  if (isPaused) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4 border rounded-xl p-6">
        <Pause className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
        <h3 className="text-xl font-bold">Pauza (Kutib turing)</h3>
        <p className="text-sm text-muted-foreground">Keyingi savol ochilishiga {pauseTime} sekund qoldi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 p-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="font-bold text-lg">{data.test.subject}</h1>
          <p className="text-xs text-muted-foreground">{qIndex + 1} / {data.questions.length}-savol</p>
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-1.5 font-bold text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="p-4 border rounded-xl space-y-4">
        <p className="font-semibold text-base">{currentQ?.question}</p>
        {data.test.has_options && currentQ?.options ? (
          <div className="grid gap-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentQ.id]: { chosen_index: idx } })}
                className={`p-3 text-left border rounded-lg text-sm transition-all ${
                  answers[currentQ.id]?.chosen_index === idx ? "border-primary bg-primary/10 font-bold" : "hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Javobingiz..."
            value={answers[currentQ?.id]?.text_answer || ""}
            onChange={(e) => setAnswers({ ...answers, [currentQ.id]: { text_answer: e.target.value } })}
          />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Yuklanmoqda..." : isLast ? "Yakunlash" : "Keyingi Savol"}
      </button>
    </div>
  );
}
