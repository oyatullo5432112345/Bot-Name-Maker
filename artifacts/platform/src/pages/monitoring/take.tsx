import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, Loader2, 
  Send, HelpCircle, ShieldAlert 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

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
  options: string[] | null;
  points: number;
}

interface TestData {
  id: string;
  title: string;
  subject: string;
  status: string;
  duration_minutes: number;
  has_options: boolean;
  is_anonymous: boolean;
  quarter: number | null;
  timed: boolean;
  pause_seconds: number | null;
  questions: Question[];
  server_now: string;
}

export default function MonitoringTakePage() {
  const { id: testId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // 1. Test ma'lumotlarini olish (URL va response struktura to'g'rilandi)
  const { data: test, isLoading, error } = useQuery<TestData>({
    queryKey: ["monitoring-test-take", testId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/take`, { 
        headers: authH() 
      });
      
      if (!r.ok) {
        throw new Error("Test ma'lumotlarini yuklab bo'lmadi");
      }

      const data = await r.json();

      // Backend qaytargan { test, questions, server_now } ni tekislash
      return {
        ...data.test,
        questions: data.questions ?? [],
        server_now: data.server_now,
      };
    },
    enabled: !!testId,
  });

  // Taymer mantig'i
  useEffect(() => {
    if (started && test?.duration_minutes && timeLeft === null) {
      setTimeLeft(test.duration_minutes * 60);
    }
  }, [started, test, timeLeft]);

  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft]);

  // Testni topshirish
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));

      const r = await fetch(`${API_BASE}/monitoring/tests/${testId}/submit`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      const json = await r.json();
      if (!r.ok) {
        throw new Error(json.error || "Topshirishda xatolik yuz berdi");
      }
      return json;
    },
    onSuccess: () => {
      toast({
        title: "Test topshirildi!",
        description: "Natijalaringiz muvaffaqiyatli saqlandi.",
      });
      setLocation("/monitoring");
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: err.message,
      });
    },
  });

  const handleAutoSubmit = () => {
    toast({
      variant: "destructive",
      title: "Vaqt tugadi!",
      description: "Test avtomatik ravishda topshirilmoqda...",
    });
    submitMutation.mutate();
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Test yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center space-y-4 bg-card rounded-2xl border">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">Testni yuklab bo'lmadi</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Xatolik yuz berdi"}
        </p>
        <Link href="/monitoring">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Monitoringga qaytish
          </Button>
        </Link>
      </div>
    );
  }

  // Kirish / Kirishdan oldingi ma'lumotlar sahifasi (Intro)
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <Link href="/monitoring" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {test.subject || "Umumiy fan"}
              </span>
              {test.quarter && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {test.quarter}-chorak
                </span>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">{test.title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50 text-sm">
              <div>
                <p className="text-muted-foreground">Savollar soni:</p>
                <p className="font-bold text-base">{test.questions?.length ?? 0} ta</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vaqt cheklovi:</p>
                <p className="font-bold text-base">
                  {test.duration_minutes ? `${test.duration_minutes} daqiqa` : "Cheklanmagan"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Oshkoralik:</p>
                <p className="font-bold text-base">
                  {test.is_anonymous ? "Anonim test" : "Ochiq test"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Javob turi:</p>
                <p className="font-bold text-base">
                  {test.has_options ? "Variantli (A/B/C/D)" : "Yozma javob"}
                </p>
              </div>
            </div>

            <Button 
              className="w-full font-bold text-base py-6 shadow-lg shadow-primary/20" 
              onClick={() => setStarted(true)}
            >
              Testni boshlash
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Yuqori Panel va Taymer */}
      <div className="sticky top-4 z-10 flex items-center justify-between p-4 rounded-xl bg-card border shadow-md backdrop-blur-md bg-card/90">
        <div>
          <h2 className="font-bold text-sm sm:text-base line-clamp-1">{test.title}</h2>
          <p className="text-xs text-muted-foreground">
            Bajarildi: {Object.keys(answers).length} / {test.questions.length}
          </p>
        </div>

        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
            timeLeft < 300 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-primary/10 text-primary"
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Savollar ro'yxati */}
      <div className="space-y-4">
        {test.questions.map((q, idx) => (
          <Card key={q.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-base font-semibold flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{q.question}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              {test.has_options && q.options && q.options.length > 0 ? (
                <RadioGroup 
                  value={answers[q.id] || ""} 
                  onValueChange={(val) => handleAnswerChange(q.id, val)}
                  className="space-y-2"
                >
                  {q.options.map((opt, oIdx) => {
                    const optKey = String.fromCharCode(65 + oIdx); // A, B, C, D
                    return (
                      <div 
                        key={oIdx} 
                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                          answers[q.id] === opt 
                            ? "border-primary bg-primary/5 font-medium" 
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => handleAnswerChange(q.id, opt)}
                      >
                        <RadioGroupItem value={opt} id={`q-${q.id}-${oIdx}`} />
                        <Label htmlFor={`q-${q.id}-${oIdx}`} className="cursor-pointer flex-1 text-sm leading-snug">
                          <span className="font-bold mr-2">{optKey})</span>
                          {opt}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <Textarea
                  placeholder="Javobingizni shu yerga yozing..."
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="min-h-[100px]"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Yakunlash tugmasi */}
      <Card className="p-4 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Barcha savollarga javob berganingizga ishonch hosil qiling.
        </p>
        <Button 
          size="lg"
          onClick={() => submitMutation.mutate()} 
          disabled={submitMutation.isPending}
          className="gap-2 font-bold shadow-lg shadow-primary/20 shrink-0"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Testni topshirish
        </Button>
      </Card>
    </div>
  );
}
