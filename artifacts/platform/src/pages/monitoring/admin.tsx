import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Lock, Unlock, Users, Loader2, BarChart3,
  ListChecks, PenLine, CalendarClock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface TestRow {
  id: string; title: string; subject: string; class_name: string | null;
  quarter: number; academic_year: string; status: string; has_options: boolean;
  is_anonymous: boolean; attempts_count: number; scheduled_open_at: string | null;
}

interface DraftQuestion {
  question: string;
  options: string[];
  correct_index: number;
  correct_text: string;
  difficulty: "oson" | "orta" | "qiyin";
  customTime: boolean;
  time_seconds: number;
}

const DIFFICULTY_TIME: Record<DraftQuestion["difficulty"], number> = { oson: 20, orta: 40, qiyin: 60 };
const EMPTY_QUESTION = (): DraftQuestion => ({
  question: "", options: ["", ""], correct_index: 0, correct_text: "",
  difficulty: "orta", customTime: false, time_seconds: DIFFICULTY_TIME.orta,
});

function sortClassNames(list: { name: string }[]): string[] {
  return [...list.map(c => c.name)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export default function MonitoringAdminPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: classesData } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const classNames = sortClassNames((classesData as { name: string }[] | undefined) ?? []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasOptions, setHasOptions] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState<string>("__all__");
  const [quarter, setQuarter] = useState(1);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [duration, setDuration] = useState(30);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [timed, setTimed] = useState(true);
  const [pauseEnabled, setPauseEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([EMPTY_QUESTION()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resultsFor, setResultsFor] = useState<string | null>(null);

  const { data: tests = [], isLoading } = useQuery<TestRow[]>({
    queryKey: ["monitoring-tests-admin"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<TestRow[]>;
    },
  });

  const { data: results = [] } = useQuery<Array<{ student_name: string; class_name: string; score: number; total: number; percentage: number }>>({
    queryKey: ["monitoring-results", resultsFor],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests/${resultsFor}/results`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!resultsFor,
  });

  const resetForm = () => {
    setTitle(""); setSubject(""); setClassName("__all__"); setQuarter(1);
    setDuration(30); setIsAnonymous(false); setHasOptions(true);
    setScheduleEnabled(false); setScheduledAt(""); setTimed(true); setPauseEnabled(false);
    setQuestions([EMPTY_QUESTION()]); setSaveError("");
  };

  const handleCreate = async () => {
    setSaveError("");
    if (!title.trim() || !subject.trim()) { setSaveError("Sarlavha va fanni kiriting"); return; }
    if (scheduleEnabled && !scheduledAt) { setSaveError("Avto-ochilish vaqtini tanlang"); return; }

    const cleanQuestions = questions
      .filter(q => q.question.trim())
      .filter(q => hasOptions ? q.options.every(o => o.trim()) : q.correct_text.trim());

    if (cleanQuestions.length === 0) {
      setSaveError(hasOptions ? "Kamida 1 ta to'liq savol (variantlari bilan) qo'shing" : "Kamida 1 ta savol va to'g'ri javobini kiriting");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/monitoring/tests`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          class_name: className === "__all__" ? null : className,
          quarter,
          academic_year: academicYear,
          duration_minutes: duration,
          is_anonymous: isAnonymous,
          show_result_immediately: true,
          has_options: hasOptions,
          scheduled_open_at: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
          timed,
          pause_seconds: pauseEnabled ? 5 : 0,
          questions: cleanQuestions.map(q => ({
            ...(hasOptions
              ? { question: q.question, options: q.options, correct_index: q.correct_index }
              : { question: q.question, correct_text: q.correct_text }),
            difficulty: q.difficulty,
            time_seconds: timed ? (q.customTime ? q.time_seconds : DIFFICULTY_TIME[q.difficulty]) : null,
          })),
        }),
      });
      const json = await r.json();
      if (!r.ok) { setSaveError(json.error ?? "Xatolik yuz berdi"); return; }
      resetForm();
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["monitoring-tests-admin"] });
      toast({ title: "Test yaratildi", description: scheduleEnabled ? "Belgilangan vaqtda avtomatik ochiladi" : "Hozircha qulfda — ochish uchun 🔓 tugmasini bosing" });
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (t: TestRow) => {
    const next = t.status === "open" ? "closed" : "open";
    await fetch(`${API_BASE}/monitoring/tests/${t.id}/status`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ status: next }),
    });
    qc.invalidateQueries({ queryKey: ["monitoring-tests-admin"] });
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Bu testni butunlay o'chirasizmi?")) return;
    await fetch(`${API_BASE}/monitoring/tests/${id}`, { method: "DELETE", headers: authH() });
    qc.invalidateQueries({ queryKey: ["monitoring-tests-admin"] });
  };

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };
  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q;
      const options = [...q.options]; options[oIdx] = val;
      return { ...q, options };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chorak Monitoring</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sinf va fan bo'yicha test yarating, qulfdan oching, natijalarni kuzating</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/monitoring/analytics">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Tahlil va reyting
            </Button>
          </Link>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Yangi test
          </Button>
        </div>
      </div>

      {/* ── Testlar ro'yxati ── */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Hali test yaratilmagan. "Yangi test" tugmasini bosing.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tests.map((t) => {
            const isOpen = t.status === "open";
            const isScheduled = t.status === "draft" && !!t.scheduled_open_at;
            return (
              <Card key={t.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          {t.quarter}-chorak
                        </span>
                        <span className="text-xs font-medium bg-muted rounded-full px-2 py-0.5 flex items-center gap-1">
                          {t.has_options ? <ListChecks className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
                          {t.has_options ? "Variantli" : "Variantsiz"}
                        </span>
                      </div>
                      <h3 className="font-bold mt-1.5 truncate">{t.subject}</h3>
                      <p className="text-muted-foreground text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.class_name ?? "Barcha sinflar"}</p>
                    </div>
                    <button
                      onClick={() => toggleLock(t)}
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isOpen ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title={isOpen ? "Yopish (qulflash)" : "Ochish (qulfdan chiqarish)"}
                    >
                      {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </button>
                  </div>

                  {isScheduled && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Avto-ochiladi: {new Date(t.scheduled_open_at!).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t.attempts_count} ta yechilgan</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setResultsFor(resultsFor === t.id ? null : t.id)} className="text-primary font-medium">
                        Natijalar
                      </button>
                      <button onClick={() => deleteTest(t.id)} className="text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {resultsFor === t.id && (
                    <div className="rounded-lg bg-muted/40 divide-y -mx-1">
                      {results.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">Hali natija yo'q</p>
                      ) : results.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                          <span className="flex-1 truncate">{r.student_name}</span>
                          <span className="text-muted-foreground">{r.class_name}</span>
                          <span className="font-semibold">{r.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Yangi test — Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi monitoring testi</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Test turi */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHasOptions(true)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${hasOptions ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <ListChecks className={`w-5 h-5 mb-1 ${hasOptions ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm">Variantli</p>
                <p className="text-xs text-muted-foreground">Test — javob variantlaridan tanlanadi</p>
              </button>
              <button
                onClick={() => setHasOptions(false)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${!hasOptions ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <PenLine className={`w-5 h-5 mb-1 ${!hasOptions ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm">Variantsiz</p>
                <p className="text-xs text-muted-foreground">Yozma — o'quvchi javobni o'zi yozadi</p>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Test sarlavhasi</Label>
                <Input placeholder="Masalan: 1-chorak yakuniy" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fan</Label>
                <Input placeholder="Matematika" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sinf</Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Barcha sinflar</SelectItem>
                    {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chorak</Label>
                <Select value={String(quarter)} onValueChange={v => setQuarter(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(q => <SelectItem key={q} value={String(q)}>{q}-chorak</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>O'quv yili</Label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Davomiyligi (daqiqa)</Label>
                <Input type="number" min={5} max={180} value={duration} onChange={e => setDuration(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Anonim rejim</p>
                <p className="text-xs text-muted-foreground">O'quvchilar bir-birining ismini ko'rmaydi</p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Vaqt cheklovi</p>
                <p className="text-xs text-muted-foreground">O'chirilsa — o'quvchi istagancha vaqt sarflaydi (taymersiz)</p>
              </div>
              <Switch checked={timed} onCheckedChange={setTimed} />
            </div>

            {timed && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Savollar orasida pauza</p>
                  <p className="text-xs text-muted-foreground">Javob belgilagach, keyingi savolga o'tishdan oldin 5 soniya kutadi</p>
                </div>
                <Switch checked={pauseEnabled} onCheckedChange={setPauseEnabled} />
              </div>
            )}

            <div className="rounded-lg border px-3 py-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Avtomatik ochilish</p>
                  <p className="text-xs text-muted-foreground">Belgilangan vaqtda test o'zi qulfdan chiqadi</p>
                </div>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              </div>
              {scheduleEnabled && (
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              )}
            </div>

            {/* Savollar */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Savollar</p>
              {questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{qi + 1}</span>
                    <Input
                      placeholder="Savol matni"
                      value={q.question}
                      onChange={e => updateQuestion(qi, { question: e.target.value })}
                      className="flex-1"
                    />
                    <button onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))} className="text-red-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {timed && (
                    <div className="pl-8 flex items-center gap-2 flex-wrap">
                      {(["oson", "orta", "qiyin"] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => updateQuestion(qi, { difficulty: d, time_seconds: q.customTime ? q.time_seconds : DIFFICULTY_TIME[d] })}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                            q.difficulty === d
                              ? d === "oson" ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                : d === "orta" ? "bg-amber-100 border-amber-300 text-amber-700"
                                : "bg-red-100 border-red-300 text-red-700"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {d === "oson" ? "Oson" : d === "orta" ? "O'rta" : "Qiyin"}
                        </button>
                      ))}
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                        <input type="checkbox" checked={q.customTime} onChange={e => updateQuestion(qi, { customTime: e.target.checked })} />
                        Vaqtni o'zim belgilayman
                      </label>
                      {q.customTime ? (
                        <Input
                          type="number" min={5} max={600}
                          value={q.time_seconds}
                          onChange={e => updateQuestion(qi, { time_seconds: Number(e.target.value) })}
                          className="w-20 h-7 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{DIFFICULTY_TIME[q.difficulty]} soniya</span>
                      )}
                    </div>
                  )}

                  {hasOptions ? (
                    <div className="pl-8 space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={q.correct_index === oi}
                            onChange={() => updateQuestion(qi, { correct_index: oi })}
                            title="To'g'ri javob"
                            className="accent-primary"
                          />
                          <Input
                            placeholder={`Variant ${oi + 1}`}
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => updateQuestion(qi, { options: [...q.options, ""] })}
                        className="text-xs text-primary font-medium"
                      >
                        + Variant qo'shish
                      </button>
                    </div>
                  ) : (
                    <div className="pl-8">
                      <Input
                        placeholder="To'g'ri javob (o'quvchi shu matnni yozishi kerak)"
                        value={q.correct_text}
                        onChange={e => updateQuestion(qi, { correct_text: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setQuestions(qs => [...qs, EMPTY_QUESTION()])}
                className="text-sm text-primary flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Savol qo'shish
              </button>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Testni yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
