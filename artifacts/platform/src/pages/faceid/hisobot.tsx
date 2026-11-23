// Face ID — kunlik hisobot. Istalgan kunni tanlab, arxivdagi ma'lumotni ko'rish.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CalendarDays, ClipboardList } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { API_BASE, authHeaders } from "@/lib/face";

interface HisobotStudent {
  login: string;
  full_name: string;
  class_name: string;
  arrived_time: string | null;
  left_time: string | null;
  status: string;
  left_early: boolean;
  excused: boolean;
  excuse_reason: string;
  excused_by: string;
}

interface HisobotResponse {
  date: string;
  summary: {
    total: number; arrived: number; percent: number; late: number; left: number;
    left_early: number; excused_absent: number; unexcused_absent: number;
  };
  classes: { class_name: string; total: number; arrived: number; percent: number }[];
  students: HisobotStudent[];
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function FaceHisobotPage() {
  const [date, setDate] = useState(todayStr);
  const [data, setData] = useState<HisobotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/faceid/hisobot?date=${date}`, { headers: authHeaders() })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { error?: string }).error ?? `Xatolik (${r.status})`);
        return j as HisobotResponse;
      })
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e: Error) => { if (!cancelled) { setData(null); setError(e.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const s = data?.summary;

  return (
    <div className="space-y-5">
      <Link href="/faceid" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Face ID
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kunlik hisobot</h1>
          <p className="text-sm text-muted-foreground mt-1">Har qanday kunni tanlang — ma'lumot arxivda saqlanadi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setDate(todayStr())}>Bugun</Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <CalendarDays className="h-4 w-4" /> {date}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={new Date(date + "T00:00:00")}
                onSelect={(d) => d && setDate(fmtDate(d))}
                disabled={(d) => d > new Date()}
              />
            </PopoverContent>
          </Popover>
          <Link href="/faceid/sorov" className="inline-flex">
            <Button size="sm" className="gap-2"><ClipboardList className="h-4 w-4" /> So'rovlar</Button>
          </Link>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
      {!loading && error && <div className="rounded-md border border-red-400/40 p-4 text-sm text-red-500">{error}</div>}

      {!loading && data && s && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Maktab foizi</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.percent}%</div>
              <p className="text-xs text-muted-foreground">{s.arrived} / {s.total} keldi</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Kech kelgan</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.late}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Erta ketgan</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.left_early}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Sababli / sababsiz</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.excused_absent} / {s.unexcused_absent}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Sinflar bo'yicha</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.classes.map((c) => (
                <div key={c.class_name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.class_name}</span>
                  <span className="tabular-nums">{c.arrived}/{c.total} · {c.percent}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">O'quvchilar</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="py-2">F.I.Sh.</th><th>Sinf</th><th>Keldi</th><th>Ketdi</th><th>Holat</th><th>Sabab</th></tr>
                  </thead>
                  <tbody>
                    {data.students.map((st) => (
                      <tr key={st.login} className="border-t">
                        <td className="py-2 font-medium"><Link href={`/faceid/oquvchi?login=${encodeURIComponent(st.login)}`} className="hover:underline">{st.full_name}</Link></td>
                        <td>{st.class_name}</td>
                        <td className="tabular-nums">{st.arrived_time ?? "—"}</td>
                        <td className="tabular-nums">{st.left_time ?? "—"}</td>
                        <td>
                          {!st.arrived_time ? (st.excused ? "Sababli" : "Sababsiz") : st.left_early ? "Erta ketdi" : st.status === "late" ? "Kech" : "Keldi"}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {st.excuse_reason ? `${st.excuse_reason}${st.excused_by ? ` (${st.excused_by})` : ""}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
