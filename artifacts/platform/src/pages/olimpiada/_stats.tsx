import { useEffect, useState } from "react";
import { BarChart3, Users, Trophy, BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface FanStat { fan: string; qatnashchilar: string; g_oliblar: string; }
interface SinfStat { sinf: string; soni: string; }
interface YilStat  { yil: number; eventlar: string; qatnashchilar: string; }
interface EventStat { jami: string; royhat_ochiq: string; natijalar: string; }

export default function StatsTab() {
  const { toast } = useToast();
  const [data, setData] = useState<{
    events: EventStat | null;
    fanStats: FanStat[];
    sinfStats: SinfStat[];
    yilStats: YilStat[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/olimpiada/stats`, { headers: authH() })
      .then(r => r.json())
      .then(d => setData(d as typeof data))
      .catch(() => toast({ variant: "destructive", title: "Yuklab bo'lmadi" }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  if (!data) return null;

  const maxFanQat = Math.max(...data.fanStats.map(f => Number(f.qatnashchilar)), 1);
  const maxSinf = Math.max(...data.sinfStats.map(s => Number(s.soni)), 1);

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-lg flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> Statistika va tahlil
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Trophy,   label: "Jami tanlovlar",  value: data.events?.jami ?? 0,           color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
          { icon: BarChart3, label: "Faol tanlovlar", value: data.events?.royhat_ochiq ?? 0,    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
          { icon: Users,    label: "Natijalar e'lon",  value: data.events?.natijalar ?? 0,       color: "text-primary",    bg: "bg-primary/5" },
          { icon: BookOpen, label: "Fanlar soni",      value: data.fanStats.length,              color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className={`pt-4 pb-3 ${bg}`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fan bo'yicha grafik */}
      {data.fanStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Fanlar bo'yicha qatnashchilar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.fanStats.map(f => {
              const width = Math.round((Number(f.qatnashchilar) / maxFanQat) * 100);
              return (
                <div key={f.fan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-sm truncate max-w-[60%]">{f.fan}</span>
                    <span className="text-muted-foreground text-xs">
                      {f.qatnashchilar} qatnashchi · {f.g_oliblar} g'olib
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sinf faolligi */}
        {data.sinfStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" /> Sinf faolligi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.sinfStats.map(s => {
                const width = Math.round((Number(s.soni) / maxSinf) * 100);
                return (
                  <div key={s.sinf} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-16 shrink-0 text-center bg-muted rounded-md py-0.5">{s.sinf}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{s.soni}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Yillar bo'yicha dinamika */}
        {data.yilStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" /> Yillar bo'yicha dinamika
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Yil</th>
                      <th className="px-3 py-2 text-right font-medium">Tanlovlar</th>
                      <th className="px-3 py-2 text-right font-medium">Qatnashchilar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.yilStats.map((y, i) => (
                      <tr key={y.yil} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-3 py-2 font-bold">{y.yil}</td>
                        <td className="px-3 py-2 text-right text-primary font-medium">{y.eventlar}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{y.qatnashchilar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
