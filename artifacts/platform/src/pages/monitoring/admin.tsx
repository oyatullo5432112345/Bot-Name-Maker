// Monitoring boshqaruvi (xodimlar uchun): testlar va so'rovnomalar
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Lock, Unlock, Users, Loader2, BarChart3, CalendarClock, Edit, EyeOff, ListChecks,
  PenLine, ClipboardCheck, MessageSquareText, Sparkles, ChartColumn, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { mApi, fmtDateTime, type Kind, type TestRow, type Status } from "./api";
import { TestBuilder } from "./builder";
import { ResultsDialog } from "./results";
import { PLATFORM_FEEDBACK, type SurveyTemplate } from "./survey-templates";

const ANALYTICS_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

function statusMeta(t: TestRow): { label: string; cls: string; dot: string } {
  const st: Status = t.status;
  if (st === "open") return { label: "Ochiq", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500 animate-pulse" };
  if (st === "closed") return { label: "Yopiq", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" };
  if (t.scheduled_open_at) return { label: "Rejalashtirilgan", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
  return { label: "Qoralama", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" };
}

function TestCard({ t, onEdit, onResults, onToggle, onDelete, busy }: {
  t: TestRow; busy: boolean;
  onEdit: () => void; onResults: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const meta = statusMeta(t);
  const isOpen = t.status === "open";
  const isSurvey = t.kind === "survey";
  return (
    <Card className="overflow-hidden hover-lift">
      <CardContent className="p-4 space-y-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
          {!isSurvey && <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">{t.quarter}-chorak</span>}
          {!isSurvey && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
              {t.has_options ? <ListChecks className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
              {t.has_options ? "Variantli" : "Yozma"}
            </span>
          )}
          {t.is_anonymous && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium"><EyeOff className="w-3 h-3" /> Anonim</span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-bold leading-snug line-clamp-2">{t.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {isSurvey ? "" : `${t.subject} · `}{t.class_name ? `${t.class_name} sinf` : "Barcha sinflar"}
          </p>
        </div>

        {t.status === "draft" && t.scheduled_open_at && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Avto-ochiladi: {fmtDateTime(t.scheduled_open_at)}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> {t.question_count} savol</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t.attempts_count} ta javob</span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t -mx-4 px-4 pt-3">
          {t.can_edit ? (
            <>
              <Button size="sm" variant={isOpen ? "outline" : "default"} className="gap-1.5" onClick={onToggle} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isOpen ? "Yopish" : "Ochish"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onResults}>
                <ChartColumn className="w-3.5 h-3.5" /> Natijalar
              </Button>
              <div className="ml-auto flex items-center gap-0.5">
                <button onClick={onEdit} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent" aria-label="Tahrirlash"><Edit className="w-4 h-4" /></button>
                <button onClick={onDelete} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="O'chirish"><Trash2 className="w-4 h-4" /></button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Boshqa xodim yaratgan — faqat ko'rish</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ kind, onCreate }: { kind: Kind; onCreate: () => void }) {
  const survey = kind === "survey";
  return (
    <Card className="border-dashed">
      <CardContent className="py-14 text-center">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 ${survey ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-primary/10 text-primary"}`}>
          {survey ? <MessageSquareText className="w-7 h-7" /> : <ClipboardCheck className="w-7 h-7" />}
        </div>
        <p className="font-semibold">{survey ? "Hali so'rovnoma yo'q" : "Hali test yaratilmagan"}</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {survey ? "O'quvchilar fikrini bilish uchun birinchi so'rovnomani yarating" : "Birinchi monitoring testini yarating"}
        </p>
        <Button onClick={onCreate} className="gap-2"><Plus className="w-4 h-4" /> {survey ? "Yangi so'rovnoma" : "Yangi test"}</Button>
      </CardContent>
    </Card>
  );
}

export default function MonitoringAdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<Kind>("test");
  const [builder, setBuilder] = useState<{ kind: Kind; editId: string | null; template: SurveyTemplate | null } | null>(null);
  const [resultsFor, setResultsFor] = useState<TestRow | null>(null);
  const [toDelete, setToDelete] = useState<TestRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: all = [], isLoading } = useQuery<TestRow[]>({
    queryKey: ["monitoring-tests"],
    queryFn: () => mApi<TestRow[]>("/tests"),
  });

  const tests = useMemo(() => all.filter((t) => t.kind === "test"), [all]);
  const surveys = useMemo(() => all.filter((t) => t.kind === "survey"), [all]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["monitoring-tests"] });
  const canSeeAnalytics = !!user && ANALYTICS_ROLES.includes(user.role);

  const toggle = async (t: TestRow) => {
    setBusyId(t.id);
    try {
      await mApi(`/tests/${t.id}/status`, { method: "PATCH", body: JSON.stringify({ status: t.status === "open" ? "closed" : "open" }) });
      await refresh();
    } catch (e) {
      toast({ title: "Xatolik", description: (e as Error).message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await mApi(`/tests/${toDelete.id}`, { method: "DELETE" });
      toast({ title: "O'chirildi" });
      await refresh();
    } catch (e) {
      toast({ title: "Xatolik", description: (e as Error).message, variant: "destructive" });
    } finally { setToDelete(null); }
  };

  const open = (kind: Kind, template: SurveyTemplate | null = null) => setBuilder({ kind, editId: null, template });
  const openCount = all.filter((t) => t.status === "open").length;
  const totalAnswers = all.reduce((s, t) => s + t.attempts_count, 0);

  const renderList = (list: TestRow[], kind: Kind) => (
    list.length === 0 ? <EmptyState kind={kind} onCreate={() => open(kind)} /> : (
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => (
          <TestCard
            key={t.id} t={t} busy={busyId === t.id}
            onEdit={() => setBuilder({ kind: t.kind, editId: t.id, template: null })}
            onResults={() => setResultsFor(t)}
            onToggle={() => toggle(t)}
            onDelete={() => setToDelete(t)}
          />
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Sarlavha ── */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-violet-500/10 to-card p-5 sm:p-6">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <ClipboardCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Monitoring</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Chorak testlari va o'quvchilar so'rovnomalari</p>
              <div className="flex flex-wrap gap-2 mt-2.5 text-xs">
                <span className="rounded-full bg-background/70 border px-2.5 py-1">{tests.length} test</span>
                <span className="rounded-full bg-background/70 border px-2.5 py-1">{surveys.length} so'rovnoma</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1">{openCount} ochiq</span>
                <span className="rounded-full bg-background/70 border px-2.5 py-1">{totalAnswers} javob</span>
              </div>
            </div>
          </div>
          {canSeeAnalytics && (
            <Link href="/monitoring/analytics">
              <Button variant="outline" className="gap-2 bg-background/70"><BarChart3 className="w-4 h-4" /> Tahlil va reyting</Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Kind)} className="space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="h-11 p-1">
              <TabsTrigger value="test" className="gap-2 px-4"><ClipboardCheck className="w-4 h-4" /> Testlar <span className="text-xs opacity-70">{tests.length}</span></TabsTrigger>
              <TabsTrigger value="survey" className="gap-2 px-4"><MessageSquareText className="w-4 h-4" /> So'rovnomalar <span className="text-xs opacity-70">{surveys.length}</span></TabsTrigger>
            </TabsList>
            <Button onClick={() => open(tab)} className="gap-2"><Plus className="w-4 h-4" /> {tab === "survey" ? "Yangi so'rovnoma" : "Yangi test"}</Button>
          </div>

          <TabsContent value="test" className="mt-0 space-y-4">
            {renderList(tests, "test")}
          </TabsContent>

          <TabsContent value="survey" className="mt-0 space-y-4">
            <div className="rounded-2xl border bg-violet-500/5 p-4 flex gap-3 items-start">
              <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                So'rovnomada <b className="text-foreground">to'g'ri javob yo'q</b> — o'quvchilar o'z fikrini tanlaydi. Natija reyting va tahlilga kirmaydi,
                faqat har bir variantni necha foiz o'quvchi tanlagani ko'rsatiladi.
              </p>
            </div>

            {surveys.length === 0 && (
              <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-card">
                <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{PLATFORM_FEEDBACK.title}</p>
                    <p className="text-sm text-muted-foreground">{PLATFORM_FEEDBACK.description}</p>
                  </div>
                  <Button variant="secondary" className="gap-2" onClick={() => open("survey", PLATFORM_FEEDBACK)}>
                    <Sparkles className="w-4 h-4" /> Shablondan yaratish
                  </Button>
                </CardContent>
              </Card>
            )}
            {surveys.length > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="gap-1.5 text-violet-600 dark:text-violet-400" onClick={() => open("survey", PLATFORM_FEEDBACK)}>
                  <Sparkles className="w-3.5 h-3.5" /> "{PLATFORM_FEEDBACK.title}" shabloni
                </Button>
              </div>
            )}
            {surveys.length === 0 ? null : renderList(surveys, "survey")}
            {surveys.length === 0 && <EmptyState kind="survey" onCreate={() => open("survey")} />}
          </TabsContent>
        </Tabs>
      )}

      <TestBuilder
        open={!!builder}
        onOpenChange={(o) => { if (!o) setBuilder(null); }}
        kind={builder?.kind ?? "test"}
        editId={builder?.editId ?? null}
        template={builder?.template ?? null}
        onSaved={refresh}
      />
      <ResultsDialog test={resultsFor} onClose={() => setResultsFor(null)} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              «{toDelete?.title}» va unga berilgan barcha javoblar butunlay o'chiriladi. Buni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
