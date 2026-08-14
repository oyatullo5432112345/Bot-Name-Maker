import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck, Clock, ChevronRight, CalendarClock, CheckCircle2,
  Archive, Sparkles, GraduationCap,
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
      setRemaining(h > 0 ? `${h}s ${m}d ${s}soniya` : `${m}d ${s}soniya`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

export default function MonitoringPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "student") {
      setLocation("/monitoring/admin");
    }
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
    return <div className="text-muted-foreground text-sm py-8 text-center">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{data?.student_name ?? "O'quvchi"}</h1>
          <p className="text-muted-foreground text-sm">{data?.class_name ?? ""} sinfi • Chorak Monitoring</p>
        </div>
      </div>

      {/* ── Eng yaqin test ── */}
      {!data?.next ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Hozircha sizga tegishli faol test yo'q</p>
            <p className="text-muted-foreground text-sm mt-1">Test ochilganda shu yerda ko'rinadi</p>
          </CardContent>
        </Card>
      ) : nextIsScheduled ? (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
              <CalendarClock className="w-4 h-4" /> Tez orada ochiladi
            </div>
            <h3 className="font-bold text-lg mt-2">{data.next.subject}</h3>
            <p className="text-muted-foreground text-sm">{data.next.title}</p>
            <div className="mt-3 rounded-xl bg-white/70 px-4 py-3 text-center">
              <p className="text-2xl font-black text-amber-700 tabular-nums">{countdown}</p>
              <p className="text-xs text-amber-600 mt-0.5">qolgan vaqt</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Link href={`/monitoring/${data.next.id}`}>
          <Card className="group border-primary/30 bg-gradient-to-br from-primary/10 to-primary/[0.03] hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary bg-primary/15 rounded-full px-2 py-0.5">
                    {data.next.quarter}-chorak • Eng yaqin test
                  </span>
                  <h3 className="font-bold text-xl mt-2">{data.next.subject}</h3>
                  <p className="text-muted-foreground text-sm">{data.next.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {data.next.duration_minutes} daqiqa</span>
                <span className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> {(data.next as PendingTest).question_count} savol</span>
                {(data.next as PendingTest).is_anonymous && (
                  <span className="bg-muted rounded-full px-2 py-0.5">Anonim</span>
                )}
              </div>
              <div className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-center text-sm font-semibold">
                Testni boshlash →
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── Hali yechilishi kerak bo'lgan boshqa testlar ── */}
      {(data?.pending.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Yana yechilishi kerak</p>
          <div className="space-y-2">
            {data!.pending.map(t => (
              <Link key={t.id} href={`/monitoring/${t.id}`}>
                <div className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{t.duration_minutes} daq</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(data?.upcoming.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Tez orada ochiladigan</p>
          <div className="space-y-2">
            {data!.upcoming.map(t => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-dashed p-3 opacity-70">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(t.scheduled_open_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Arxiv ── */}
      {(data?.archive.length ?? 0) > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Archive className="w-4 h-4" /> Yechilgan testlar
          </p>
          <div className="space-y-2">
            {data!.archive.map(a => (
              <div key={a.test_id} className="flex items-center gap-3 rounded-xl border p-3 bg-muted/20">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{a.percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">{a.score}/{a.total}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && !data.next && data.pending.length === 0 && data.upcoming.length === 0 && data.archive.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2" />
            Hozircha hech qanday monitoring testi yo'q
          </CardContent>
        </Card>
      )}
    </div>
  );
}
