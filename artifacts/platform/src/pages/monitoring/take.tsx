import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock, CheckCircle2, AlertCircle, FileText, Send,
  HelpCircle, User, Award, ArrowLeft, Loader2, Sparkles, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

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
  questionText?: string;
  options?: string[];
  difficulty?: string;
  time_seconds?: number;
}

interface TestData {
  id: string;
  title: string;
  subject: string;
  quarter: number;
  duration_minutes: number;
  has_options: boolean;
  is_anonymous: boolean;
  timed: boolean;
  questions: Question[];
}

interface ResultData {
  score: number;
  total: number;
  percentage: number;
  answers: Array<{
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}

export default function MonitoringStudentPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);

  // Ochiq testlar ro'yxatini olish
  const { data: openTests = [], isLoading: loadingTests } = useQuery<TestData[]>({
    queryKey: ["monitoring-open-tests"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests/open`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  // Tanlangan test tafsilotlarini va savollarini olish
  const { data: testDetail, isLoading: loadingDetail } = useQuery<TestData>({
    queryKey: ["monitoring-test-detail", activeTestId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests/${activeTestId}`, { headers: authH() });
      if (!r.ok) throw new Error("Test ma'lumotlarini yuklab bo'lmadi");
      return r.json();
    },
    enabled: !!activeTestId,
  });

  // Vaqt hisoblagichi (Vaqtli testlar uchun)
  useEffect(() => {
    if (testDetail?.duration_minutes && timeLeft === null) {
      setTimeLeft(testDetail.duration_minutes * 60);
    }

    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmitAnswers(); // Vaqt tugagach avtomatik topshirish
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testDetail, timeLeft]);

  const handleSelectOption = (qIdx: number, val: any) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: val }));
  };

  const handleSubmitAnswers = async () => {
    if (!activeTestId || !testDetail) return;

    if (!testDetail.is_anonymous && (!studentName.trim() || !selectedClass.trim())) {
      toast({
        title: "Ma'lumotlar yetarli emas",
        description: "Iltimos, ism va sinfingizni kiriting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = testDetail.questions.map((q, idx) => {
        const ans = answers[idx];
        if (testDetail.has_options) {
          return { question_id: q.id, selected_index: ans !== undefined ? Number(ans) : null };
        } else {
          return { question_id: q.id, answer_text: ans || "" };
        }
      });

      const payload = {
        student_name: studentName.trim() || "Anonim",
        class_name: selectedClass.trim() || "Biriktirilmagan",
        answers: formattedAnswers,
      };

      const r = await fetch(`${API_BASE}/monitoring/tests/${activeTestId}/submit`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(payload),
      });

      const json = await r.json();
      if (!r.ok) {
        toast({ title: "Xatolik", description: json.error || "Natijani saqlashda xatolik", variant: "destructive" });
        return;
      }

      setResult(json);
      toast({ title: "Muvaffaqiyatli!", description: "Test javoblaringiz qabul qilindi." });
      qc.invalidateQueries({ queryKey: ["monitoring-open-tests"] });
    } catch (e) {
      console.error(e);
      toast({ title: "Xatolik", description: "Server bilan bog'lanishda muammo", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 1. Testlar ro'yxati sahifasi
  if (!activeTestId) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mavjud Monitoring Testlari</h1>
          <p className="text-muted-foreground text-sm mt-1">O'zingizga tegishli fanni tanlang va testni topshiring</p>
        </div>

        {loadingTests ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : openTests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Hozirda faol monitoring testlari mavjud emas.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {openTests.map((t) => (
              <Card key={t.id} className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => setActiveTestId(t.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{t.quarter}-chorak</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {t.duration_minutes} daqiqa
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2">{t.subject}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground">{t.title}</p>
                  <Button className="w-full mt-2" size="sm">Testni boshlash</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Natijalar sahifasi
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <Card className="text-center p-6">
          <Award className="w-16 h-16 text-primary mx-auto mb-2 animate-bounce" />
          <h2 className="text-2xl font-bold">Test Yakunlandi!</h2>
          <p className="text-muted-foreground text-sm mt-1">Sizning natijangiz quyidagicha:</p>

          <div className="my-6 p-4 bg-muted/40 rounded-2xl flex justify-around items-center">
            <div>
              <p className="text-xs text-muted-foreground">To'g'ri javoblar</p>
              <p className="text-2xl font-bold text-emerald-600">{result.score} / {result.total}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Foiz ko'rsatkichi</p>
              <p className="text-2xl font-bold text-primary">{result.percentage}%</p>
            </div>
          </div>

          <Button onClick={() => { setActiveTestId(null); setResult(null); setAnswers({}); setTimeLeft(null); }} variant="outline" className="w-full">
            Bosh sahifaga qaytish
          </Button>
        </Card>
      </div>
    );
  }

  // 3. Testni yechish sahifasi
  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <button onClick={() => setActiveTestId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      {loadingDetail || !testDetail ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-xl font-bold">{testDetail.subject}</h1>
              <p className="text-sm text-muted-foreground">{testDetail.title}</p>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold text-sm">
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {!testDetail.is_anonymous && (
            <Card className="p-4 bg-muted/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Ism va Familiyangiz</Label>
                  <Input placeholder="Ismingizni kiriting" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sinfingiz</Label>
                  <Input placeholder="Masalan: 9-A" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} />
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-6">
            {testDetail.questions.map((q, qIdx) => {
              const questionText = q.question || q.questionText || "";
              return (
                <Card key={q.id || qIdx} className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <p className="font-semibold text-sm sm:text-base leading-relaxed">{questionText}</p>
                  </div>

                  {testDetail.has_options && q.options ? (
                    <RadioGroup
                      value={answers[qIdx] !== undefined ? String(answers[qIdx]) : ""}
                      onValueChange={(val) => handleSelectOption(qIdx, val)}
                      className="pl-8 space-y-2 mt-2"
                    >
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center space-x-2 border rounded-lg p-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
                          <RadioGroupItem value={String(oIdx)} id={`q${qIdx}_opt${oIdx}`} />
                          <Label htmlFor={`q${qIdx}_opt${oIdx}`} className="flex-1 cursor-pointer font-normal text-sm">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="pl-8 mt-2">
                      <Input
                        placeholder="Javobingizni yozing..."
                        value={answers[qIdx] || ""}
                        onChange={(e) => handleSelectOption(qIdx, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Button onClick={handleSubmitAnswers} disabled={submitting} className="w-full gap-2 py-6 text-base font-semibold">
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <Send className="w-4 h-4" /> Javoblarni topshirish
          </Button>
        </>
      )}
    </div>
  );
}
