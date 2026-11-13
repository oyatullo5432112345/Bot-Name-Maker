// Test yoki so'rovnomani topshirish sahifasi
import { useCallback, useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Play, Clock, CheckCircle2, ArrowRight, ArrowLeft, ShieldAlert, Trophy, Sparkles,
  EyeOff, MessageSquareText, HeartHandshake, ClipboardCheck, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/use-auth";
import { mApi, letter, DIFFICULTY_LABEL, type Difficulty, type Kind } from "./api";

interface TakeQuestion { id: string; question: string; options: string[] | null; difficulty: Difficulty; time_seconds: number | null }
interface TakeTest {
  id: string; kind: Kind; title: string; subject: string; quarter: number; duration_minutes: number;
  has_options: boolean; is_anonymous: boolean; timed: boolean; pause_seconds: number;
}
interface TakeData { test: TakeTest; questions: TakeQuestion[] }
interface SubmitResult { kind: Kind; submitted?: boolean; score?: number; total?: number; percentage?: number }
type Answer = number | string;
type Stage = "intro" | "countdown" | "run" | "done";

function ScoreRing({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const color = value >= 85 ? "#10b981" : value >= 60 ? "#0ea5e9" : value >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke={color}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl font-black tabular-nums">{Math.round(value)}%</span></div>
    </div>
  );
}

export default function MonitoringTakePage() {
  const [, params] = useRoute("/monitoring/:id");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const testId = params?.id;

  const [stage, setStage] = useState<Stage>("intro");
  const [count, setCount] = useState(5);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [inPause, setInPause] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Taymer va yuborish eskirgan qiymat bilan ishlamasligi uchun ref'lar
  const answersRef = useRef<Record<string, Answer>>({});
  const idxRef = useRef(0);
  const submittingRef = useRef(false);
  const advanceRef = useRef<(auto: boolean) => void>(() => undefined);

  const { data, isLoading, error } = useQuery<TakeData>({
    queryKey: ["monitoring-take", testId],
    queryFn: () => mApi<TakeData>(`/tests/${testId}/take`),
    enabled: !!testId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const test = data?.test;
  const questions = data?.questions ?? [];
  const isSurvey = test?.kind === "survey";
  const q = questions[idx];

  const setAnswer = (id: string, v: Answer) => {
    answersRef.current = { ...answersRef.current, [id]: v };
    setAnswers(answersRef.current);
  };

  const submit = useCallback(async () => {
    if (!test || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = questions.map((qq) => {
        const v = answersRef.current[qq.id];
        return test.has_options
          ? { question_id: qq.id, chosen_index: typeof v === "number" ? v : undefined }
          : { question_id: qq.id, text_answer: typeof v === "string" ? v.trim() : undefined };
      });
      const r = await mApi<SubmitResult>(`/tests/${test.id}/submit`, { method: "POST", body: JSON.stringify({ answers: payload }) });
      setResult(r);
      setStage("done");
      void qc.invalidateQueries({ queryKey: ["monitoring-student-home"] });
    } catch (e) {
      setSubmitError((e as Error).message);
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [test, questions, qc]);

  const advance = (auto: boolean) => {
    if (!test) return;
    if (idxRef.current >= questions.length - 1) { void submit(); return; }
    if (!isSurvey && test.pause_seconds > 0 && !auto) { setInPause(true); return; }
    idxRef.current += 1;
    setIdx(idxRef.current);
  };
  advanceRef.current = advance;

  const goBack = () => {
    if (idxRef.current === 0) return;
    idxRef.current -= 1;
    setIdx(idxRef.current);
  };

  // Boshlanishdan oldingi 5 soniyalik sanash
  useEffect(() => {
    if (stage !== "countdown") return;
    if (count <= 0) { setStage("run"); return; }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [stage, count]);

  // Savol uchun vaqt (faqat testda)
  useEffect(() => {
    if (stage !== "run" || inPause || !test || isSurvey || !test.timed || !q?.time_seconds) { setTimeLeft(null); return; }
    const end = Date.now() + q.time_seconds * 1000;
    setTimeLeft(q.time_seconds);
    const id = setInterval(() => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) { clearInterval(id); setTimeLeft(0); advanceRef.current(true); }
      else setTimeLeft(left);
    }, 250);
    return () => clearInterval(id);
  }, [stage, inPause, idx, q?.id, q?.time_seconds, test, isSurvey]);

  // Savollar orasidagi pauza
  useEffect(() => {
    if (!inPause || !test) return;
    const id = setTimeout(() => {
      setInPause(false);
      idxRef.current += 1;
      setIdx(idxRef.current);
    }, test.pause_seconds * 1000);
    return () => clearTimeout(id);
  }, [inPause, test]);

  // ── Yuklanish / xatolik ──
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      </div>
    );
  }
  if (error || !test) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3"><ShieldAlert className="w-8 h-8 text-destructive" /></div>
        <h2 className="text-xl font-bold">Ochib bo'lmadi</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">{(error as Error | null)?.message ?? "Yopilgan yoki mavjud emas."}</p>
        <Button onClick={() => setLocation("/monitoring")} className="mt-5">Orqaga qaytish</Button>
      </div>
    );
  }

  const accent = isSurvey ? "violet" : "primary";

  // ── 1. Kirish ──
  if (stage === "intro") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl overflow-hidden relative shadow-xl">
          <div className={`absolute -top-24 -right-24 w-52 h-52 rounded-full blur-3xl ${isSurvey ? "bg-violet-500/20" : "bg-primary/20"}`} />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-sky-500/10 rounded-full blur-3xl" />
          <CardContent className="p-7 text-center space-y-6 relative">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${isSurvey ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/25" : "bg-gradient-to-br from-primary to-violet-500 shadow-primary/25"}`}>
              {isSurvey ? <MessageSquareText className="w-8 h-8 text-white" /> : <ClipboardCheck className="w-8 h-8 text-primary-foreground" />}
            </div>
            <div className="space-y-2">
              <span className={`inline-block text-[11px] font-semibold rounded-full px-3 py-1 ${isSurvey ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-primary/10 text-primary"}`}>
                {isSurvey ? "So'rovnoma" : `${test.subject} · ${test.quarter}-chorak`}
              </span>
              <h1 className="text-2xl font-black leading-tight">{test.title}</h1>
            </div>

            {isSurvey ? (
              <div className="rounded-2xl bg-violet-500/5 border border-violet-500/20 p-4 text-sm text-left space-y-2">
                <p className="flex gap-2"><Sparkles className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" /> To'g'ri yoki noto'g'ri javob yo'q — o'z fikringizni tanlang.</p>
                <p className="flex gap-2">
                  {test.is_anonymous ? <EyeOff className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" /> : <Eye className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />}
                  {test.is_anonymous ? "So'rovnoma anonim: ismingiz saqlanmaydi." : "Javobingiz ismingiz bilan saqlanadi."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-muted/50 border px-4 py-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Topshiruvchi</p>
                <p className="text-xl font-black mt-0.5">{user?.full_name ?? "O'quvchi"}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className="rounded-xl border bg-card p-3"><p className="text-muted-foreground">Savollar</p><p className="font-bold text-base">{questions.length} ta</p></div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-muted-foreground">{isSurvey ? "Vaqt" : "Tartib"}</p>
                <p className="font-bold text-base">{isSurvey ? "Cheklanmagan" : test.timed ? "Savolga vaqt bor" : "Vaqtsiz"}</p>
              </div>
            </div>

            <Button size="lg" className={`w-full gap-2 text-base font-bold ${isSurvey ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
              onClick={() => { setStage(isSurvey ? "run" : "countdown"); setCount(5); }}>
              <Play className="w-5 h-5 fill-current" /> {isSurvey ? "Boshlash" : "Testni boshlash"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 2. Sanash ──
  if (stage === "countdown") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-4 border-primary/30 animate-ping absolute" />
          <div className="w-44 h-44 rounded-full border-4 border-primary bg-primary/10 flex items-center justify-center z-10">
            <span className="text-7xl font-black text-primary tabular-nums">{count}</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-8">Tayyormisiz?</h2>
        <p className="text-muted-foreground text-sm mt-1">Test bir ozdan so'ng boshlanadi…</p>
      </div>
    );
  }

  // ── 4. Yakun ──
  if (stage === "done") {
    const showScore = !isSurvey && result?.percentage !== undefined;
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl overflow-hidden">
          <CardContent className="p-8 space-y-6">
            {showScore ? (
              <>
                <ScoreRing value={result!.percentage!} />
                <div className="space-y-1">
                  <h2 className="text-2xl font-black flex items-center justify-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Test yakunlandi</h2>
                  <p className="text-sm text-muted-foreground">{user?.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 py-3"><p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{result!.score}</p><p className="text-xs text-muted-foreground">to'g'ri</p></div>
                  <div className="rounded-2xl bg-rose-500/10 py-3"><p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{(result!.total ?? 0) - (result!.score ?? 0)}</p><p className="text-xs text-muted-foreground">noto'g'ri</p></div>
                </div>
              </>
            ) : (
              <>
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${isSurvey ? "bg-violet-500/10 text-violet-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                  {isSurvey ? <HeartHandshake className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black">{isSurvey ? "Rahmat!" : "Javoblar qabul qilindi"}</h2>
                  <p className="text-sm text-muted-foreground">{isSurvey ? "Fikringiz biz uchun juda muhim — platformani yaxshilashda foydalanamiz." : "Natijalar o'qituvchi tomonidan e'lon qilinadi."}</p>
                </div>
              </>
            )}
            <Button onClick={() => setLocation("/monitoring")} className="w-full">Monitoring sahifasiga qaytish</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 3. Savollar ──
  if (!q) return null;
  const current = answers[q.id];
  const hasAnswer = test.has_options ? typeof current === "number" : typeof current === "string" && current.trim().length > 0;
  const isLast = idx === questions.length - 1;
  const lowTime = timeLeft !== null && timeLeft <= 5;

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-4 px-1">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Savol {idx + 1} / {questions.length}</span>
          {timeLeft !== null && (
            <span className={`flex items-center gap-1 font-mono text-sm px-2.5 py-0.5 rounded-full border tabular-nums ${lowTime ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse" : "bg-muted"}`}>
              <Clock className="w-3.5 h-3.5" /> {timeLeft}s
            </span>
          )}
        </div>
        <Progress value={((idx + 1) / questions.length) * 100} className={`h-2.5 ${accent === "violet" ? "[&>div]:bg-violet-500" : ""}`} />
      </div>

      {inPause ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold">Javobingiz qabul qilindi</h3>
            <p className="text-xs text-muted-foreground">Keyingi savol yuklanmoqda…</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              {!isSurvey && (
                <span className="inline-block text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">{DIFFICULTY_LABEL[q.difficulty]} daraja</span>
              )}
              <h2 className="text-lg sm:text-xl font-bold leading-relaxed">{q.question}</h2>
            </div>

            {test.has_options ? (
              <div className="grid gap-2.5">
                {(q.options ?? []).map((opt, oi) => {
                  const sel = current === oi;
                  return (
                    <button
                      key={oi} type="button" onClick={() => setAnswer(q.id, oi)}
                      className={`w-full p-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all flex items-center gap-3 ${
                        sel
                          ? isSurvey ? "border-violet-500 bg-violet-500/10 shadow-md shadow-violet-500/10" : "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
                    >
                      <span className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${sel ? (isSurvey ? "bg-violet-500 text-white" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground"}`}>{letter(oi)}</span>
                      <span className="flex-1">{opt}</span>
                      {sel && <CheckCircle2 className={`w-5 h-5 shrink-0 ${isSurvey ? "text-violet-500" : "text-primary"}`} />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Input
                placeholder="Javobingizni yozing…" value={typeof current === "string" ? current : ""}
                onChange={(e) => setAnswer(q.id, e.target.value)} className="h-12 text-base" autoFocus
              />
            )}

            {submitError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{submitError}</p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              {isSurvey && idx > 0 ? (
                <Button variant="ghost" onClick={goBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Orqaga</Button>
              ) : <span />}
              <Button
                onClick={() => advance(false)} disabled={submitting || (!hasAnswer && !submitError)}
                className={`gap-2 px-6 font-bold ${isSurvey ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLast ? (submitError ? "Qayta yuborish" : isSurvey ? "Yuborish" : "Yakunlash") : "Keyingisi"}
                {!isLast && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
