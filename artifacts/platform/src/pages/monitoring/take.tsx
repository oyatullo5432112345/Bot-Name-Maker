import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, CheckCircle2, Trophy, Loader2, Play, Sparkles, ArrowRight, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// Tokenni barcha mumkin bo'lgan kalit so'zlardan izlash
const getToken = () => 
  localStorage.getItem("talim_auth_token") || 
  localStorage.getItem("token") || 
  localStorage.getItem("auth_token") || 
  "";

const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Question {
  id: string;
  question: string;
  options: string[];
  difficulty: "oson" | "orta" | "qiyin";
  time_seconds: number | null;
}

interface TestData {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  has_options: boolean;
  is_anonymous: boolean;
  timed: boolean;
  pause_seconds: number;
  questions: Question[];
}

export default function MonitoringTakePage() {
  const [, params] = useRoute("/monitoring/take/:id");
  const [, setLocation] = useLocation();
  const testId = params?.id;

  // Foydalanuvchi ma'lumotlari
  const userString = localStorage.getItem("talim_user") || localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const studentName = currentUser?.name || currentUser?.full_name || "O'quvchi";

  // Test Holatlari: "intro" -> "countdown" -> "testing" -> "completed"
  const [stage, setStage] = useState<"intro" | "countdown" | "testing" | "completed">("intro");
  const [countdown, setCountdown] = useState<number>(5);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [inPause, setInPause] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const { data: test, isLoading, error } = useQuery<TestData>({
    queryKey: ["monitoring-take", testId],
    queryFn: async () => {
      if (!testId) throw new Error("Test ID topilmadi");

      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}`, { 
        headers: authH() 
      });

      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || "Test topilmadi yoki test yopilgan.");
      }

      return r.json();
    },
    enabled: !!testId,
  });

  // 5 soniyalik countdown taymeri
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stage === "countdown") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        setStage("testing");
      }
    }
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  // Savol taymeri
  useEffect(() => {
    if (stage !== "testing" || !test || inPause) return;
    const q = test.questions?.[currentQIndex];
    if (!test.timed || !q?.time_seconds) return;

    setQuestionTimeLeft(q.time_seconds);
    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleNextQuestion(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQIndex, stage, inPause, test]);

  const handleStartCountdown = () => {
    setStage("countdown");
    setCountdown(5);
  };

  const handleNextQuestion = (isAuto = false) => {
    if (!test || !test.questions) return;
    const q = test.questions[currentQIndex];

    const currentAns = test.has_options ? selectedOption : textAnswer;
    const newAnswers = { ...answers, [q.id]: currentAns };
    setAnswers(newAnswers);

    setSelectedOption(null);
    setTextAnswer("");

    if (currentQIndex < test.questions.length - 1) {
      if (test.pause_seconds > 0 && !isAuto) {
        setInPause(true);
        setTimeout(() => {
          setInPause(false);
          setCurrentQIndex(prev => prev + 1);
        }, test.pause_seconds * 1000);
      } else {
        setCurrentQIndex(prev => prev + 1);
      }
    } else {
      finishTest(newAnswers);
    }
  };

  const finishTest = async (finalAnswers: Record<string, any>) => {
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/submit`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await r.json();
      setResultData(data);
      setStage("completed");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Monitoring testi yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-12 h-12 text-destructive mb-2" />
        <h2 className="text-xl font-bold">Testni yuklab bo'lmadi</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {error instanceof Error ? error.message : "Test yopilgan, qulflangan yoki mavjud emas."}
        </p>
        <Button onClick={() => setLocation("/monitoring")} className="mt-4">
          Orqaga qaytish
        </Button>
      </div>
    );
  }

  // 1. ISMNI CHIROLI EFEKT VA INTRO
  if (stage === "intro") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-primary/20 bg-gradient-to-b from-card/80 to-card backdrop-blur-xl shadow-2xl overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

          <CardContent className="p-8 text-center space-y-8 relative z-10">
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                {test.subject} • {test.quarter}-Chorak Monitoringi
              </span>
              <h1 className="text-2xl font-black">{test.title}</h1>
            </div>

            <div className="relative group mx-auto max-w-md">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x" />
              <div className="relative px-6 py-6 bg-card rounded-xl border border-primary/20 flex flex-col items-center justify-center space-y-1">
                <Sparkles className="w-6 h-6 text-primary animate-bounce mb-1" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Test topshiruvchi</p>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600 tracking-wide">
                  {studentName}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs bg-muted/40 p-4 rounded-xl border border-border/50">
              <div>
                <p className="text-muted-foreground">Savollar soni:</p>
                <p className="font-bold text-sm">{test.questions?.length || 0} ta</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vaqt tartibi:</p>
                <p className="font-bold text-sm">{test.timed ? "Sekundli taymer" : "Vaqt cheklovsiz"}</p>
              </div>
            </div>

            <Button size="lg" onClick={handleStartCountdown} className="w-full text-base font-bold gap-2 shadow-lg shadow-primary/25 hover:scale-[1.02] transition-transform">
              <Play className="w-5 h-5 fill-current" /> Testni Boshlash
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. 5 SONYALIK DYNAMIC COUNTDOWN
  if (stage === "countdown") {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-4 border-primary/30 animate-ping absolute" />
          <div className="w-44 h-44 rounded-full border-4 border-primary bg-primary/10 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md z-10">
            <span className="text-7xl font-black text-primary animate-pulse">{countdown}</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-8 animate-bounce">Tayyormisiz?</h2>
        <p className="text-muted-foreground text-sm mt-1">Test bir ozdan so'ng boshlanadi...</p>
      </div>
    );
  }

  // 3. YAKUNLANGAN NATIJA SAHIFASI
  if (stage === "completed" && resultData) {
    const percentage = resultData.percentage || Math.round((resultData.score / resultData.total) * 100);
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-primary/20 text-center shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black">Test Yakunlandi!</h2>
              <p className="text-sm text-muted-foreground">{studentName}, natijangiz bilan tanishing</p>
            </div>

            <div className="py-6 bg-muted/30 rounded-2xl border border-border/50">
              <span className="text-5xl font-black text-primary">{percentage}%</span>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                To'g'ri javoblar: <span className="text-foreground font-bold">{resultData.score}</span> / {resultData.total}
              </p>
            </div>

            <Button onClick={() => setLocation("/monitoring")} className="w-full">
              Bosh sahifaga qaytish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. TEST TOPSHIRISH (TESTING)
  const q = test.questions?.[currentQIndex];
  const totalQuestions = test.questions?.length || 1;
  const progressPercent = ((currentQIndex + 1) / totalQuestions) * 100;

  if (!q) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Savol {currentQIndex + 1} / {totalQuestions}</span>
          {test.timed && questionTimeLeft !== null && (
            <span className={`flex items-center gap-1 font-mono text-sm px-2.5 py-0.5 rounded-full border ${
              questionTimeLeft <= 5 ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse" : "bg-muted border-border"
            }`}>
              <Clock className="w-3.5 h-3.5" /> {questionTimeLeft}s
            </span>
          )}
        </div>
        <Progress value={progressPercent} className="h-2.5 bg-muted" />
      </div>

      {inPause ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold">Javobingiz qabul qilindi!</h3>
            <p className="text-xs text-muted-foreground">Keyingi savol yuklanmoqda...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 shadow-xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                {q.difficulty === "oson" ? "Oson" : q.difficulty === "qiyin" ? "Qiyin" : "O'rta"} daraja
              </span>
              <h2 className="text-lg sm:text-xl font-bold leading-relaxed">{q.question}</h2>
            </div>

            {test.has_options ? (
              <div className="grid gap-3">
                {q.options?.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-4 rounded-xl border-2 text-left font-medium text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Javobingizni bu yerga yozing..."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleNextQuestion(false)}
                disabled={(test.has_options ? selectedOption === null : !textAnswer.trim()) || submitting}
                className="gap-2 px-6 font-bold"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {currentQIndex === totalQuestions - 1 ? "Testni yakunlash" : "Keyingisi"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
