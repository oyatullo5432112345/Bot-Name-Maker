// Monitoring — o'quvchi bosh sahifasi: testlar, so'rovnomalar, natijalar arxivi
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck, Clock, ChevronRight, CalendarClock, CheckCircle2, Archive, Sparkles, GraduationCap,
  Play, EyeOff, Hourglass, Trophy, MessageSquareText, HeartHandshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";
import { mApi, fmtDateTime, scoreTone, type StudentHome, type StudentItem } from "./api";

function useCountdown(target: string | null) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setText("Hozir ochiladi…"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setText(h > 0 ? `${h}s ${m}d ${s}son` : `${m}d ${s}son`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return text;
}

function SectionTitle({ icon: Icon, count, children }: { icon: typeof Archive; count?: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground/80">{children}</h2>
      {count !== undefined && <span className="text-[11px] font-medium rounded-full bg-muted text-muted-foreground px-2 py-0.5">{count}</span>}
    </div>
  );
}

function ItemRow({ item, tone }: { item: StudentItem; tone: "test" | "survey" }) {
  const survey = tone === "survey";
  return (
    <Link href={`/monitoring/${item.id}`}>
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${survey ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-primary/10 text-primary"}`}>
          {survey ? <MessageSquareText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{survey ? item.title : item.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{survey ? `${item.question_count} savol` : item.title}</p>
        </div>
        {!survey && <span className="text-xs text-muted-foreground shrink-0">{item.duration_minutes} daq</span>}
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

export default function MonitoringPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "student") setLocation("/monitoring/admin");
  }, [user, setLocation]);

  const { data, isLoading } = useQuery<StudentHome>({
    queryKey: ["monitoring-student-home"],
    queryFn: () => mApi<StudentHome>("/student-home"),
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: user?.role === "student",
  });

  const nextUp = data?.tests.upcoming.find((u) => u.kind === "test") ?? null;
  const featured = data?.tests.open[0] ?? null;
  const countdown = useCountdown(!featured && nextUp ? nextUp.scheduled_open_at : null);

  if (isLoading || !data) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-20 rounded-3xl bg-muted" />
        <div className="h-44 rounded-3xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
      </div>
    );
  }

  const { tests, surveys } = data;
  const avg = tests.archive.length ? Math.round(tests.archive.reduce((a, b) => a + b.percentage, 0) / tests.archive.length) : null;
  const moreTests = tests.open.slice(1);
  const otherUpcoming = tests.upcoming.filter((u) => u.id !== (!featured ? nextUp?.id : undefined));
  const empty = !featured && !nextUp && !moreTests.length && !surveys.open.length && !surveys.done.length && !tests.archive.length && !otherUpcoming.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Sarlavha ── */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-violet-500/10 to-card p-5">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Monitoring</p>
            <h1 className="text-xl font-bold tracking-tight truncate">{data.student_name || "O'quvchi"}</h1>
            <p className="text-sm text-muted-foreground">{data.class_name ? `${data.class_name} sinfi` : ""}</p>
          </div>
          {avg !== null && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end text-[11px] text-muted-foreground"><Trophy className="w-3 h-3" /> O'rtacha</div>
              <div className="text-2xl font-black tabular-nums">{avg}%</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Asosiy test ── */}
      {featured ? (
        <Link href={`/monitoring/${featured.id}`}>
          <div className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 cursor-pointer hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/15 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {featured.quarter}-chorak · Hozir ochiq
                </span>
                {featured.is_anonymous && <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted rounded-full px-2.5 py-1"><EyeOff className="w-3 h-3" /> Anonim</span>}
              </div>
              <h3 className="font-bold text-2xl mt-3 leading-tight">{featured.subject}</h3>
              <p className="text-muted-foreground text-sm mt-0.5">{featured.title}</p>
              <div className="flex items-center gap-2 mt-4 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-background/60 border px-2.5 py-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> {featured.duration_minutes} daqiqa</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-background/60 border px-2.5 py-1.5"><ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" /> {featured.question_count} savol</span>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" /> Testni boshlash
              </div>
            </div>
          </div>
        </Link>
      ) : nextUp ? (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold"><CalendarClock className="w-4 h-4" /> Tez orada ochiladi</div>
          <h3 className="font-bold text-xl mt-2">{nextUp.subject}</h3>
          <p className="text-muted-foreground text-sm">{nextUp.title}</p>
          <div className="mt-4 rounded-2xl bg-background/60 border px-4 py-4 text-center">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{countdown}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Hourglass className="w-3 h-3" /> qolgan vaqt</p>
          </div>
        </div>
      ) : !empty && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3"><ClipboardCheck className="w-6 h-6 text-muted-foreground" /></div>
            <p className="font-semibold">Hozircha ochiq test yo'q</p>
            <p className="text-muted-foreground text-sm mt-1">Test ochilganda shu yerda ko'rinadi</p>
          </CardContent>
        </Card>
      )}

      {/* ── So'rovnomalar ── */}
      {surveys.open.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={MessageSquareText} count={surveys.open.length}>Fikringizni bildiring</SectionTitle>
          {surveys.open.map((s) => (
            <Link key={s.id} href={`/monitoring/${s.id}`}>
              <div className="group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-card p-4 cursor-pointer hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"><MessageSquareText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{s.question_count} savol</span><span>·</span><span>to'g'ri javob yo'q</span>
                      {s.is_anonymous && <span className="inline-flex items-center gap-1"><EyeOff className="w-3 h-3" /> anonim</span>}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-violet-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Boshqa testlar ── */}
      {moreTests.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={ClipboardCheck} count={moreTests.length}>Yana yechilishi kerak</SectionTitle>
          {moreTests.map((t) => <ItemRow key={t.id} item={t} tone="test" />)}
        </div>
      )}

      {otherUpcoming.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={CalendarClock} count={otherUpcoming.length}>Tez orada ochiladigan</SectionTitle>
          {otherUpcoming.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-dashed p-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t.kind === "survey" ? t.title : t.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{t.kind === "survey" ? "So'rovnoma" : t.title}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{fmtDateTime(t.scheduled_open_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Arxiv ── */}
      {tests.archive.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={Archive} count={tests.archive.length}>Yechilgan testlar</SectionTitle>
          {tests.archive.map((a) => (
            <div key={a.test_id} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{a.title}</p>
              </div>
              <div className={`text-right shrink-0 rounded-xl px-3 py-1.5 ${scoreTone(a.percentage)}`}>
                <p className="font-bold text-sm tabular-nums leading-none">{a.percentage}%</p>
                <p className="text-[10px] opacity-80 mt-0.5 tabular-nums">{a.score}/{a.total}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {surveys.done.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={HeartHandshake} count={surveys.done.length}>Javob bergan so'rovnomalar</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {surveys.done.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border bg-violet-500/5 px-3 py-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" /> {s.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {empty && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <Sparkles className="w-9 h-9 mx-auto mb-3" />
            Hozircha test yoki so'rovnoma yo'q
          </CardContent>
        </Card>
      )}
    </div>
  );
}
