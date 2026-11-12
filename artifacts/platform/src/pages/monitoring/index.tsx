import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck, Clock, ChevronRight, CalendarClock, CheckCircle2,
  Archive, Sparkles, GraduationCap, Play, EyeOff, Hourglass, Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface PendingTest {
  id: string; title: string; subject: string; quarter: number;
  duration_minutes: number; is_anonymous: boolean; question_count: number; status: "open";
}
interface UpcomingTest {
  id: string; title: string; subject: string; quarter: number;
  duration_minutes: number; scheduled_open_at: string; status: "scheduled";
}
interface ArchiveItem {
  test_id: string; title: string; subject: string; quarter: number;
  score: number; total: number; percentage: number; submitted_at: string;
}
interface StudentHome {
  student_name: string; class_name: string;
  next: (PendingTest | UpcomingTest) | null;
  pending: PendingTest[];
  upcoming: UpcomingTest[];
  archive: ArchiveItem[];
}

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Hozir ochiladi..."); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(h > 0 ? `${h}s ${m}d ${s}son` : `${m}d ${s}son`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

const scoreTone = (p: number) =>
  p >= 85 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
  : p >= 60 ? "text-sky-600 dark:text-sky-400 bg-sky-500/10"
  : p >= 40 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
  : "text-rose-600 dark:text-rose-400 bg-rose-500/10";

function SectionTitle({ icon: Icon, children, count }: { icon: typeof Archive; children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground/80">{children}</h2>
      {count !== undefined && <span className="text-[11px] font-medium rounded-full bg-muted text-muted-foreground px-2 py-0.5">{count}</span>}
    </div>
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
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/student-home`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: user?.role === "student",
  });

  const nextIsScheduled = data?.next && data.next.status === "scheduled";
  const countdown = useCountdown(nextIsScheduled ? (data!.next as UpcomingTest).scheduled_open_at : null);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-20 rounded-2xl bg-muted" />
        <div className="h-44 rounded-2xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
      </div>
    );
  }

  const avg = data && data.archive.length
    ? Math.round(data.archive.reduce((a, b) => a + b.percentage, 0) / data.archive.length)
    : null;
  const nothing = data && !data.next && data.pending.length === 0 && data.upcoming.length === 0 && data.archive.length === 0;

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
            <p className="text-xs font-medium text-muted-foreground">Chorak monitoring</p>
            <h1 className="text-xl font-bold tracking-tight truncate">{data?.student_name ?? "O'quvchi"}</h1>
            <p className="text-sm text-muted-foreground">{data?.class_name ? `${data.class_name} sinfi` : ""}</p>
          </div>
          {avg !== null && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end text-[11px] text-muted-foreground"><Trophy className="w-3 h-3" /> O'rtacha</div>
              <div className="text-2xl font-black tabular-nums">{avg}%</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Eng yaqin test ── */}
      {!data?.next ? (
        !nothing && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold">Hozircha faol test yo'q</p>
              <p className="text-muted-foreground text-sm mt-1">Test ochilganda shu yerda ko'rinadi</p>
            </CardContent>
          </Card>
        )
      ) : nextIsScheduled ? (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <CalendarClock className="w-4 h-4" /> Tez orada ochiladi
          </div>
          <h3 className="font-bold text-xl mt-2">{data.next.subject}</h3>
          <p className="text-muted-foreground text-sm">{data.next.title}</p>
          <div className="mt-4 rounded-2xl bg-background/60 border px-4 py-4 text-center">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{countdown}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Hourglass className="w-3 h-3" /> qolgan vaqt</p>
          </div>
        </div>
      ) : (
        <Link href={`/monitoring/${data.next.id}`}>
          <div className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 cursor-pointer hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/15 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {data.next.quarter}-chorak · Hozir ochiq
                </span>
                {(data.next as PendingTest).is_anonymous && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted rounded-full px-2.5 py-1"><EyeOff className="w-3 h-3" /> Anonim</span>
                )}
              </div>
              <h3 className="font-bold text-2xl mt-3 leading-tight">{data.next.subject}</h3>
              <p className="text-muted-foreground text-sm mt-0.5">{data.next.title}</p>
              <div className="flex items-center gap-2 mt-4 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-background/60 border px-2.5 py-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> {data.next.duration_minutes} daqiqa</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-background/60 border px-2.5 py-1.5"><ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" /> {(data.next as PendingTest).question_count} savol</span>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" /> Testni boshlash
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Boshqa testlar ── */}
      {(data?.pending.length ?? 0) > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={ClipboardCheck} count={data!.pending.length}>Yana yechilishi kerak</SectionTitle>
          {data!.pending.map((t) => (
            <Link key={t.id} href={`/monitoring/${t.id}`}>
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><ClipboardCheck className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{t.duration_minutes} daq</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {(data?.upcoming.length ?? 0) > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={CalendarClock} count={data!.upcoming.length}>Tez orada ochiladigan</SectionTitle>
          {data!.upcoming.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-dashed p-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{t.title}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {new Date(t.scheduled_open_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Arxiv ── */}
      {(data?.archive.length ?? 0) > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={Archive} count={data!.archive.length}>Yechilgan testlar</SectionTitle>
          {data!.archive.map((a) => (
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

      {nothing && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <Sparkles className="w-9 h-9 mx-auto mb-3" />
            Hozircha hech qanday monitoring testi yo'q
          </CardContent>
        </Card>
      )}
    </div>
  );
}
