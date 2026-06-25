import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

interface MonthData { month: string; avg_grade: number; count: number }
interface MyReyting {
  monthly: MonthData[];
  rank: number | null;
  total_students: number;
  total5s: number;
  total_grades: number;
  recent_avg: number;
}

const UZ_MONTHS: Record<string, string> = {
  "01": "Yan", "02": "Fev", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Iyun", "07": "Iyul", "08": "Avg",
  "09": "Sen", "10": "Okt", "11": "Noy", "12": "Dek",
};

function shortMonth(ym: string) {
  const [, m] = ym.split("-");
  return UZ_MONTHS[m ?? ""] ?? ym;
}

export function GrowthChart() {
  const { data, isLoading } = useQuery<MyReyting>({
    queryKey: ["reyting-my"],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/reyting/my`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) throw new Error("error");
      return r.json() as Promise<MyReyting>;
    },
    staleTime: 5 * 60_000,
  });

  const chartData = (data?.monthly ?? []).map(m => ({
    name: shortMonth(m.month),
    ball: m.avg_grade,
    count: m.count,
  }));

  // Trend calculation
  const trend = chartData.length >= 2
    ? (chartData.at(-1)?.ball ?? 0) - (chartData.at(-2)?.ball ?? 0)
    : 0;

  const TrendIcon = trend > 0.05 ? TrendingUp : trend < -0.05 ? TrendingDown : Minus;
  const trendColor = trend > 0.05 ? "text-green-500" : trend < -0.05 ? "text-red-400" : "text-muted-foreground";
  const trendText = trend > 0.05
    ? `+${trend.toFixed(1)} ball oshdi 📈`
    : trend < -0.05
    ? `${trend.toFixed(1)} ball tushdi`
    : "O'zgarishsiz";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          O'sish grafigi
          <span className={`ml-auto text-xs font-normal ${trendColor}`}>{trendText}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Rank badge */}
        {data?.rank && data.total_students > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground">Bu haftadagi o'rningiz</p>
              <p className="text-lg font-bold text-primary">
                {data.rank <= 3 ? ["🥇", "🥈", "🥉"][data.rank - 1] : `#${data.rank}`}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {data.total_students} dan</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Oxirgi 10 ta baho</p>
              <p className="text-lg font-bold">{data.recent_avg}</p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                borderRadius: 8, fontSize: 12,
              }}
              formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => [
                `${value.toFixed(2)} (${props.payload?.count ?? 0} baho)`,
                "O'rtacha ball",
              ]}
            />
            <ReferenceLine y={4} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Line
              type="monotone" dataKey="ball"
              stroke="hsl(var(--primary))" strokeWidth={2.5}
              dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="flex gap-3 mt-2 text-center">
          <div className="flex-1 rounded-lg bg-muted/40 py-1.5">
            <p className="text-[10px] text-muted-foreground">Jami baho</p>
            <p className="text-sm font-bold">{data?.total_grades ?? 0}</p>
          </div>
          <div className="flex-1 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 py-1.5">
            <p className="text-[10px] text-muted-foreground">Beshliklar</p>
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">⭐ {data?.total5s ?? 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
