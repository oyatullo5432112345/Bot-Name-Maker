// Test / so'rovnoma yaratish va tahrirlash oynasi
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Loader2, FileText, ChevronUp, ChevronDown, X, Lock, Check,
  CalendarClock, EyeOff, Timer, Hourglass, ListChecks, PenLine, MessageSquareText, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  mApi, emptyQuestion, sortClassNames, quarterNow, academicYearNow, toLocalInput, letter,
  DIFFICULTY_TIME, DIFFICULTY_LABEL, newKey,
  type DraftQuestion, type FullTest, type Kind, type Difficulty,
} from "./api";
import { parseQuestions, type ImportMode } from "./import-parser";
import type { SurveyTemplate } from "./survey-templates";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: Kind;
  editId: string | null;
  template: SurveyTemplate | null;
  onSaved: () => void;
}

function Toggle({ icon: Icon, title, hint, checked, onChange, disabled }: {
  icon: typeof Timer; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-3 rounded-xl border p-3 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-accent/40"} transition-colors`}>
      <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

export function TestBuilder({ open, onOpenChange, kind, editId, template, onSaved }: Props) {
  const { toast } = useToast();
  const { data: classesData } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const classNames = useMemo(
    () => sortClassNames(((classesData as { name: string }[] | undefined) ?? []).map((c) => c.name)),
    [classesData],
  );
  const isSurvey = kind === "survey";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("__all__");
  const [quarter, setQuarter] = useState(quarterNow());
  const [year, setYear] = useState(academicYearNow());
  const [anonymous, setAnonymous] = useState(isSurvey);
  const [hasOptions, setHasOptions] = useState(true);
  const [timed, setTimed] = useState(true);
  const [pause, setPause] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);

  const [importOpen, setImportOpen] = useState(false);
  const [rawText, setRawText] = useState("");

  // Oyna ochilganda holatni tiklaymiz: tahrirlash → serverdan; shablon → to'ldirish; aks holda bo'sh
  useEffect(() => {
    if (!open) return;
    setError(""); setLocked(false); setImportOpen(false); setRawText("");
    setScheduleOn(false); setScheduledAt(""); setPause(false);
    setClassName("__all__"); setQuarter(quarterNow()); setYear(academicYearNow());
    setAnonymous(isSurvey); setHasOptions(true); setTimed(true);

    if (editId) {
      setLoading(true);
      mApi<FullTest>(`/tests/${editId}`)
        .then((t) => {
          setTitle(t.title); setSubject(t.subject); setClassName(t.class_name ?? "__all__");
          setQuarter(t.quarter); setYear(t.academic_year);
          setAnonymous(t.is_anonymous); setHasOptions(t.has_options);
          setTimed(t.timed); setPause(t.pause_seconds > 0);
          if (t.scheduled_open_at) { setScheduleOn(true); setScheduledAt(toLocalInput(t.scheduled_open_at)); }
          setLocked(t.attempts_count > 0);
          setQuestions(t.questions.length ? t.questions.map((q) => ({
            key: q.id,
            question: q.question,
            options: q.options && q.options.length ? q.options : ["", ""],
            correct_index: q.correct_index ?? 0,
            correct_text: q.correct_text ?? "",
            difficulty: q.difficulty,
            customTime: q.time_seconds !== null && q.time_seconds !== DIFFICULTY_TIME[q.difficulty],
            time_seconds: q.time_seconds ?? DIFFICULTY_TIME[q.difficulty],
          })) : [emptyQuestion()]);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }

    if (template) {
      setTitle(template.title); setSubject("");
      setQuestions(template.questions.map((q) => ({ ...emptyQuestion(q.options.length), options: [...q.options], question: q.question })));
    } else {
      setTitle(""); setSubject("");
      setQuestions([emptyQuestion()]);
    }
  }, [open, editId, template, isSurvey]);

  const mode: ImportMode = isSurvey ? "survey" : hasOptions ? "test-options" : "test-text";
  const optionsEditable = !locked;

  const patchQ = (i: number, p: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  const setOption = (qi: number, oi: number, v: string) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? v : o)) } : q)));
  const addOption = (qi: number) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi && q.options.length < 8 ? { ...q, options: [...q.options, ""] } : q)));
  const removeOption = (qi: number, oi: number) =>
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== qi || q.options.length <= 2) return q;
      const options = q.options.filter((_, j) => j !== oi);
      const ci = q.correct_index === oi ? 0 : q.correct_index > oi ? q.correct_index - 1 : q.correct_index;
      return { ...q, options, correct_index: ci };
    }));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const j = i + d;
      if (j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  const runImport = () => {
    if (!rawText.trim()) return;
    const parsed = parseQuestions(rawText, mode);
    if (!parsed.length) { toast({ title: "Savol topilmadi", description: "Matn shaklini tekshiring", variant: "destructive" }); return; }
    setQuestions(parsed);
    setImportOpen(false); setRawText("");
    toast({ title: `${parsed.length} ta savol o'qib olindi`, description: isSurvey ? "Variantlarni tekshirib chiqing." : "Variant va to'g'ri javoblarni tekshirib chiqing." });
  };

  const save = async () => {
    setError("");
    if (title.trim().length < 3) { setError("Sarlavhani kiriting (kamida 3 harf)"); return; }
    if (!isSurvey && subject.trim().length < 2) { setError("Fan nomini kiriting"); return; }
    if (scheduleOn && !scheduledAt) { setError("Avto-ochilish vaqtini tanlang"); return; }

    const payloadQuestions: Record<string, unknown>[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      if (!q.question.trim() && q.options.every((o) => !o.trim())) continue; // butunlay bo'sh savol — tashlab ketamiz
      const n = i + 1;
      if (q.question.trim().length < 2) { setError(`${n}-savol matni yozilmagan`); return; }

      if (isSurvey || hasOptions) {
        const filled = q.options.map((text, idx) => ({ text: text.trim(), idx })).filter((o) => o.text);
        if (filled.length < 2) { setError(`${n}-savolda kamida 2 ta variant bo'lishi kerak`); return; }
        let correct: number | undefined;
        if (!isSurvey) {
          const pos = filled.findIndex((o) => o.idx === q.correct_index);
          if (pos < 0) { setError(`${n}-savolda to'g'ri javob bo'sh variantga belgilangan`); return; }
          correct = pos;
        }
        payloadQuestions.push({
          question: q.question.trim(),
          options: filled.map((o) => o.text),
          ...(correct !== undefined ? { correct_index: correct } : {}),
          difficulty: q.difficulty,
          time_seconds: !isSurvey && timed ? (q.customTime ? q.time_seconds : DIFFICULTY_TIME[q.difficulty]) : null,
        });
      } else {
        if (!q.correct_text.trim()) { setError(`${n}-savolning to'g'ri javobi yozilmagan`); return; }
        payloadQuestions.push({
          question: q.question.trim(), correct_text: q.correct_text.trim(), difficulty: q.difficulty,
          time_seconds: timed ? (q.customTime ? q.time_seconds : DIFFICULTY_TIME[q.difficulty]) : null,
        });
      }
    }
    if (!payloadQuestions.length) { setError("Kamida 1 ta savol qo'shing"); return; }

    const totalSeconds = payloadQuestions.reduce((s, q) => s + ((q["time_seconds"] as number | null) ?? 0), 0);
    const duration = !isSurvey && timed && totalSeconds > 0 ? Math.min(180, Math.max(5, Math.ceil(totalSeconds / 60))) : 30;

    setSaving(true);
    try {
      await mApi<{ id?: string; ok?: boolean }>(editId ? `/tests/${editId}` : "/tests", {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify({
          kind, title: title.trim(), subject: isSurvey ? "So'rovnoma" : subject.trim(),
          class_name: className === "__all__" ? null : className,
          quarter, academic_year: year, duration_minutes: duration,
          is_anonymous: anonymous, show_result_immediately: true, has_options: isSurvey ? true : hasOptions,
          scheduled_open_at: scheduleOn ? new Date(scheduledAt).toISOString() : null,
          timed: isSurvey ? false : timed, pause_seconds: !isSurvey && pause ? 5 : 0,
          questions: payloadQuestions,
        }),
      });
      toast({ title: editId ? "Saqlandi" : isSurvey ? "So'rovnoma yaratildi" : "Test yaratildi", description: editId ? undefined : "Qoralama holatida. Ochish uchun qulf tugmasini bosing." });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const heading = `${editId ? "Tahrirlash" : "Yangi"} — ${isSurvey ? "so'rovnoma" : "monitoring testi"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-2.5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSurvey ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-primary/15 text-primary"}`}>
              {isSurvey ? <MessageSquareText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
            </span>
            {heading}
          </DialogTitle>
          <DialogDescription>
            {isSurvey ? "To'g'ri javobsiz savollar — o'quvchilarning fikrini bilish uchun." : "To'g'ri javobli savollar — natija foizda hisoblanadi."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="px-5 py-5 space-y-6">
            {locked && (
              <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-800 dark:text-amber-200">
                  Bunga allaqachon javob berilgan. Natijalar buzilmasligi uchun savollar va variantlar o'zgarmaydi — faqat sarlavha, sinf va vaqtni o'zgartirish mumkin.
                </p>
              </div>
            )}

            {/* ── Asosiy ma'lumotlar ── */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>{isSurvey ? "So'rovnoma nomi" : "Test nomi"}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isSurvey ? "Masalan: Platforma haqida fikringiz" : "Masalan: 2-chorak nazorat ishi"} maxLength={200} />
              </div>
              {!isSurvey && (
                <>
                  <div className="space-y-1.5">
                    <Label>Fan</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Masalan: Matematika" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Chorak</Label>
                    <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}-chorak</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className={`space-y-1.5 ${isSurvey ? "sm:col-span-2" : "sm:col-span-2"}`}>
                <Label>Kim uchun</Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Barcha sinflar</SelectItem>
                    {classNames.map((c) => <SelectItem key={c} value={c}>{c} sinf</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* ── Sozlamalar ── */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Sozlamalar</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  icon={EyeOff}
                  title={isSurvey ? "Anonim so'rovnoma" : "Anonim reyting"}
                  hint={isSurvey ? "Ism yozilmaydi, faqat sinf ko'rinadi" : "Reytingda boshqalarning ismi yashiriladi"}
                  checked={anonymous} onChange={setAnonymous} disabled={locked}
                />
                <Toggle
                  icon={CalendarClock} title="Avto-ochilish" hint="Belgilangan vaqtda o'zi ochiladi"
                  checked={scheduleOn} onChange={setScheduleOn}
                />
                {!isSurvey && (
                  <>
                    <Toggle icon={ListChecks} title="Variantli savollar" hint={hasOptions ? "A, B, C, D variantlardan tanlaydi" : "Javobni o'zi yozadi"}
                      checked={hasOptions} onChange={setHasOptions} disabled={locked} />
                    <Toggle icon={Timer} title="Har savolga vaqt" hint="Vaqt tugasa keyingi savolga o'tadi" checked={timed} onChange={setTimed} disabled={locked} />
                    <Toggle icon={Hourglass} title="Savollar orasida pauza" hint="Javobdan keyin 5 soniya kutadi" checked={pause} onChange={setPause} disabled={locked} />
                  </>
                )}
              </div>
              {scheduleOn && (
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="max-w-xs" />
              )}
            </section>

            {/* ── Savollar ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">Savollar <span className="text-muted-foreground font-normal">({questions.length})</span></h3>
                {optionsEditable && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen((v) => !v)}>
                      <FileText className="w-3.5 h-3.5" /> {importOpen ? "Yopish" : "Matndan yuklash"}
                    </Button>
                    <Button type="button" size="sm" className="gap-1.5" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
                      <Plus className="w-3.5 h-3.5" /> Savol
                    </Button>
                  </div>
                )}
              </div>

              {importOpen && optionsEditable && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Har bir savol bo'sh qator bilan ajratiladi. Variantlar <b>a)</b>, <b>b)</b>, <b>c)</b> bilan boshlanadi.
                    {!isSurvey && hasOptions && <> To'g'ri javob: <b>Javob: b</b></>}
                    {!isSurvey && !hasOptions && <> To'g'ri javob: <b>Javob: Toshkent</b></>}
                  </p>
                  <Textarea
                    value={rawText} onChange={(e) => setRawText(e.target.value)} rows={9} className="font-mono text-xs"
                    placeholder={isSurvey
                      ? "1. Platformadan qanchalik foydalanasiz?\na) Har kuni\nb) Haftada bir necha marta\nc) Kamdan-kam\n\n2. Ikkinchi savol..."
                      : hasOptions
                        ? "1. O'zbekiston poytaxti?\na) Samarqand\nb) Toshkent\nc) Buxoro\nJavob: b"
                        : "1. O'zbekiston poytaxti qaysi shahar?\nJavob: Toshkent"}
                  />
                  <Button type="button" size="sm" onClick={runImport} disabled={!rawText.trim()}>Savollarni o'qib olish</Button>
                </div>
              )}

              <div className="space-y-3">
                {questions.map((q, qi) => (
                  <div key={q.key} className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-1">{qi + 1}</span>
                      <Textarea
                        value={q.question} onChange={(e) => patchQ(qi, { question: e.target.value })} rows={2}
                        placeholder="Savol matni…" disabled={!optionsEditable} className="resize-none"
                      />
                      {optionsEditable && (
                        <div className="flex flex-col shrink-0">
                          <button type="button" onClick={() => move(qi, -1)} disabled={qi === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Yuqoriga"><ChevronUp className="w-4 h-4" /></button>
                          <button type="button" onClick={() => move(qi, 1)} disabled={qi === questions.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Pastga"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                      )}
                      {optionsEditable && questions.length > 1 && (
                        <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} className="p-1.5 mt-1 text-muted-foreground hover:text-destructive" aria-label="Savolni o'chirish">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {(isSurvey || hasOptions) ? (
                      <div className="space-y-2 pl-9">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            {isSurvey ? (
                              <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">{letter(oi)}</span>
                            ) : (
                              <button
                                type="button" disabled={!optionsEditable}
                                onClick={() => patchQ(qi, { correct_index: oi })}
                                title="To'g'ri javob"
                                className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${q.correct_index === oi ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-emerald-500/20"}`}
                              >
                                {q.correct_index === oi ? <Check className="w-3.5 h-3.5" /> : letter(oi)}
                              </button>
                            )}
                            <Input value={opt} onChange={(e) => setOption(qi, oi, e.target.value)} placeholder={`Variant ${letter(oi)}`} disabled={!optionsEditable} className="h-9" />
                            {optionsEditable && q.options.length > 2 && (
                              <button type="button" onClick={() => removeOption(qi, oi)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Variantni o'chirish"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                        {optionsEditable && q.options.length < 8 && (
                          <button type="button" onClick={() => addOption(qi)} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                            <Plus className="w-3 h-3" /> Variant qo'shish
                          </button>
                        )}
                        {!isSurvey && <p className="text-[11px] text-muted-foreground">Yashil belgi — to'g'ri javob. Belgini bosib o'zgartiring.</p>}
                      </div>
                    ) : (
                      <div className="pl-9 space-y-1.5">
                        <Label className="text-xs">To'g'ri javob</Label>
                        <Input value={q.correct_text} onChange={(e) => patchQ(qi, { correct_text: e.target.value })} placeholder="Masalan: Toshkent" disabled={!optionsEditable} />
                      </div>
                    )}

                    {!isSurvey && timed && optionsEditable && (
                      <div className="pl-9 flex items-center gap-2 flex-wrap">
                        {(["oson", "orta", "qiyin"] as Difficulty[]).map((d) => (
                          <button
                            key={d} type="button"
                            onClick={() => patchQ(qi, { difficulty: d, time_seconds: q.customTime ? q.time_seconds : DIFFICULTY_TIME[d] })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${q.difficulty === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                          >
                            {DIFFICULTY_LABEL[d]}
                          </button>
                        ))}
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-1">
                          <Timer className="w-3.5 h-3.5" />
                          <Input
                            type="number" min={5} max={600} className="h-7 w-16 px-2 text-xs"
                            value={q.customTime ? q.time_seconds : DIFFICULTY_TIME[q.difficulty]}
                            onChange={(e) => patchQ(qi, { customTime: true, time_seconds: Math.max(5, Math.min(600, Number(e.target.value) || 5)) })}
                          /> soniya
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {optionsEditable && (
                <Button type="button" variant="outline" className="w-full gap-1.5 border-dashed" onClick={() => setQuestions((qs) => [...qs, { ...emptyQuestion(), key: newKey() }])}>
                  <Plus className="w-4 h-4" /> Yana savol qo'shish
                </Button>
              )}
            </section>
          </div>
        )}

        <div className="px-5 py-4 border-t sticky bottom-0 bg-background flex items-center gap-3 flex-wrap">
          <p className="text-sm text-destructive flex-1 min-w-[200px]">{error}</p>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Bekor qilish</Button>
          <Button onClick={save} disabled={saving || loading} className="gap-2 min-w-[120px]">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
