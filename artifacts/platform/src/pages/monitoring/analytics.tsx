import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, School, Users, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface ClassRow { class_name: string; percentage: number; attempts: number; place: number }
interface StudentRow { student_login: string; student_name: string; class_name: string; percentage: number; attempts: number; place: number }
interface Overview { school_percentage: number; total_attempts: number; class_ranking: ClassRow[]; student_ranking: StudentRow[] }
interface ClassDetail { class_name: string; subjects: { subject: string; percentage: number; attempts: number }[]; students: StudentRow[] }

function medal(place: number) {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return null;
}

function PercentBar({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#3b82f6" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function MonitoringAnalyticsPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [tab, setTab] = useState<"classes" | "students">("classes");

  const { data: overview, isLoading } = useQuery<Overview>({
    queryKey: ["monitoring-analytics-overview"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/analytics/overview`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
  });

  const { data: classDetail, isLoading: detailLoading } = useQuery<ClassDetail>({
    queryKey: ["monitoring-analytics-class", selectedClass],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/analytics/class/${encodeURIComponent(selectedClass!)}`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
    enabled: !!selectedClass,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (selectedClass) {
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => setSelectedClass(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Sinflar ro'yxatiga qaytish
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{selectedClass} sinfi</h1>
          <p className="text-muted-foreground text-sm mt-1">Fanlar va o'quvchilar bo'yicha natijalar</p>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : classDetail ? (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5"><School className="w-4 h-4 text-primary" /> Fanlar bo'yicha</p>
                {classDetail.subjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Hali natija yo'q</p>
                ) : classDetail.subjects.map(s => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.subject}</span>
                      <span className="text-muted-foreground text-xs">{s.percentage}% • {s.attempts} ta</span>
                    </div>
                    <PercentBar value={s.percentage} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5 mb-1"><Trophy className="w-4 h-4 text-primary" /> O'quvchilar reytingi (shu sinf ichida)</p>
                {classDetail.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Hali natija yo'q</p>
                ) : classDetail.students.map(s => (
                  <div key={s.student_login} className="flex items-center gap-3 py-1.5 border-t first:border-t-0">
                    <span className="w-7 text-center text-sm font-bold text-muted-foreground">{medal(s.place) ?? s.place}</span>
                    <span className="flex-1 text-sm font-medium truncate">{s.student_name}</span>
                    <span className="text-sm font-bold">{s.percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/monitoring/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Monitoring boshqaruviga qaytish
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tahlil va reyting</h1>
        <p className="text-muted-foreground text-sm mt-1">Maktab, sinflar va o'quvchilar bo'yicha umumiy natijalar</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Maktab bo'yicha umumiy natija</p>
            <p className="text-4xl font-black mt-1">{overview?.school_percentage ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">{overview?.total_attempts ?? 0} ta test yechilgan</p>
          </div>
          <Trophy className="w-12 h-12 text-primary/40" />
        </CardContent>
      </Card>

      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("classes")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "classes" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Sinflar reytingi
        </button>
        <button
          onClick={() => setTab("students")}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "students" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          O'quvchilar reytingi
        </button>
      </div>

      {tab === "classes" ? (
        <Card>
          <CardContent className="p-2 divide-y">
            {(overview?.class_ranking.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Hali natija yo'q</p>
            )}
            {overview?.class_ranking.map(c => (
              <button
                key={c.class_name}
                onClick={() => setSelectedClass(c.class_name)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent rounded-lg transition-colors text-left"
              >
                <span className="w-8 text-center text-lg font-bold text-muted-foreground">{medal(c.place) ?? c.place}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.class_name}</p>
                  <div className="mt-1"><PercentBar value={c.percentage} /></div>
                </div>
                <span className="font-bold text-sm w-12 text-right">{c.percentage}%</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2 divide-y">
            {(overview?.student_ranking.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Hali natija yo'q</p>
            )}
            {overview?.student_ranking.slice(0, 50).map(s => (
              <div key={s.student_login} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-8 text-center text-lg font-bold text-muted-foreground">{medal(s.place) ?? s.place}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {s.class_name}</p>
                </div>
                <span className="font-bold text-sm">{s.percentage}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
