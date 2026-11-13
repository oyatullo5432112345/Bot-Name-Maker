// Monitoring tahlili: maktab, sinflar va o'quvchilar reytingi (faqat testlar bo'yicha)
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, School, Users, Loader2, ChevronRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { mApi } from "./api";

interface ClassRow { class_name: string; percentage: number; attempts: number; place: number }
interface StudentRow { student_login: string; student_name: string; class_name: string; percentage: number; attempts: number; place: number }
interface Overview { school_percentage: number; total_attempts: number; class_ranking: ClassRow[]; student_ranking: StudentRow[] }
interface ClassDetail {
  class_name: string;
  subjects: { subject: string; percentage: number; attempts: number }[];
  students: { student_login: string; student_name: string; percentage: number; attempts: number; place: number }[];
}

const medal = (p: number) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : null);
const barColor = (v: number) => (v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-sky-500" : v >= 40 ? "bg-amber-500" : "bg-rose-500");

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground text-center py-10">Hali natija yo'q</p>;
}

export default function MonitoringAnalyticsPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [tab, setTab] = useState<"classes" | "students">("classes");

  const overview = useQuery<Overview>({
    queryKey: ["monitoring-analytics-overview"],
    queryFn: () => mApi<Overview>("/analytics/overview"),
  });
  const detail = useQuery<ClassDetail>({
    queryKey: ["monitoring-analytics-class", selectedClass],
    queryFn: () => mApi<ClassDetail>(`/analytics/class/${encodeURIComponent(selectedClass!)}`),
    enabled: !!selectedClass,
  });

  if (overview.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  // ── Sinf ichidagi ko'rinish ──
  if (selectedClass) {
    const d = detail.data;
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => setSelectedClass(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Sinflar ro'yxatiga qaytish
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{selectedClass} sinfi</h1>
          <p className="text-muted-foreground text-sm mt-1">Fanlar va o'quvchilar bo'yicha natijalar</p>
        </div>

        {detail.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : d ? (
          <>
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-1.5"><School className="w-4 h-4 text-primary" /> Fanlar bo'yicha</p>
                {d.subjects.length === 0 ? <Empty /> : d.subjects.map((s) => (
                  <div key={s.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.subject}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">{s.percentage}% · {s.attempts} ta</span>
                    </div>
                    <PercentBar value={s.percentage} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <p className="text-sm font-semibold flex items-center gap-1.5 px-2 pt-2 pb-1"><Trophy className="w-4 h-4 text-primary" /> O'quvchilar reytingi</p>
                {d.students.length === 0 ? <Empty /> : d.students.map((s) => (
                  <div key={s.student_login} className="flex items-center gap-3 px-2 py-2.5 border-t first:border-t-0">
                    <span className="w-8 text-center text-base font-bold text-muted-foreground">{medal(s.place) ?? s.place}</span>
                    <span className="flex-1 text-sm font-medium truncate">{s.student_name}</span>
                    <span className="text-sm font-bold tabular-nums">{s.percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  const o = overview.data;
  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/monitoring/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Monitoringga qaytish
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tahlil va reyting</h1>
        <p className="text-muted-foreground text-sm mt-1">Maktab, sinflar va o'quvchilar bo'yicha umumiy natijalar</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-violet-500/10 to-card p-5">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Maktab bo'yicha umumiy natija</p>
            <p className="text-5xl font-black mt-1 tabular-nums">{o?.school_percentage ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1.5">{o?.total_attempts ?? 0} ta test yechilgan</p>
          </div>
          <Trophy className="w-14 h-14 text-primary/30" />
        </div>
      </div>

      <p className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
        <Info className="w-4 h-4 shrink-0 mt-px" /> Bu yerda faqat ball hisoblanadigan testlar hisobga olinadi. So'rovnomalar reytingga kirmaydi.
      </p>

      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {([["classes", "Sinflar"], ["students", "O'quvchilar"]] as const).map(([k, label]) => (
          <button
            key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "classes" ? (
        <Card>
          <CardContent className="p-2 divide-y">
            {!o?.class_ranking.length && <Empty />}
            {o?.class_ranking.map((c) => (
              <button key={c.class_name} onClick={() => setSelectedClass(c.class_name)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent rounded-lg transition-colors text-left">
                <span className="w-8 text-center text-lg font-bold text-muted-foreground">{medal(c.place) ?? c.place}</span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold text-sm">{c.class_name}</p>
                  <PercentBar value={c.percentage} />
                </div>
                <span className="font-bold text-sm w-14 text-right tabular-nums">{c.percentage}%</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2 divide-y">
            {!o?.student_ranking.length && <Empty />}
            {o?.student_ranking.slice(0, 50).map((s) => (
              <div key={s.student_login} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-8 text-center text-lg font-bold text-muted-foreground">{medal(s.place) ?? s.place}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {s.class_name}</p>
                </div>
                <span className="font-bold text-sm tabular-nums">{s.percentage}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
