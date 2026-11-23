// Face ID — o'quvchi profili: davomat tarixi (arxivdan). Kun / hafta / oy / yil / hammasi.
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { API_BASE, authHeaders } from "@/lib/face";

interface ProfileRow {
  date: string;
  arrived_time: string | null;
  left_time: string | null;
  status: string;
  left_early: boolean;
  excused: boolean;
  excuse_reason: string;
  excused_by: string;
}
interface ProfileResponse {
  login: string;
  full_name: string;
  class_name: string;
  from: string;
  to: string;
  summary: { days: number; arrived: number; late: number; left_early: number; excused_absent: number; unexcused_absent: number };
  rows: ProfileRow[];
}

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function rangeFor(preset: "kun" | "hafta" | "oy" | "yil" | "hammasi"): { from: string; to: string } {
  const now = new Date();
  const to = fmt(now);
  if (preset === "kun") return { from: to, to };
  if (preset === "hafta") { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: fmt(d), to }; }
  if (preset === "oy") { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: fmt(d), to }; }
  if (preset === "yil") { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return { from: fmt(d), to }; }
  return { from: "2000-01-01", to };
}

export default function FaceOquvchiPage() {
  const login = useMemo(() => new URLSearchParams(window.location.search).get("login") ?? "", []);
  const [preset, setPreset] = useState<"kun" | "hafta" | "oy" | "yil" | "hammasi">("oy");
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!login) { setError("O'quvchi tanlanmagan"); return; }
    let cancelled = false;
    const { from, to } = rangeFor(preset);
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/faceid/oquvchi?login=${encodeURIComponent(login)}&from=${from}&to=${to}`, { headers: authHeaders() })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { error?: string }).error ?? `Xatolik (${r.status})`);
        return j as ProfileResponse;
      })
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e: Error) => { if (!cancelled) { setData(null); setError(e.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [login, preset]);

  const s = data?.summary;
  const presets: { k: "kun" | "hafta" | "oy" | "yil" | "hammasi"; label: string }[] = [
    { k: "kun", label: "Kun" }, { k: "hafta", label: "Hafta" }, { k: "oy", label: "Oy" },
    { k: "yil", label: "Yil" }, { k: "hammasi", label: "Hammasi" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/faceid/hisobot" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kunlik hisobot
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data?.full_name ?? "O'quvchi profili"}</h1>
        {data && <p className="text-sm text-muted-foreground mt-1">{data.class_name} · {data.from} — {data.to}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p.k} size="sm" variant={preset === p.k ? "default" : "outline"} onClick={() => setPreset(p.k)}>
            {p.label}
          </Button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
      {!loading && error && <div className="rounded-md border border-red-400/40 p-4 text-sm text-red-500">{error}</div>}

      {!loading && data && s && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Keldi</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.arrived} / {s.days}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Kech kelgan</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.late}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Erta ketgan</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.left_early}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Sababli / sababsiz</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold tabular-nums">{s.excused_absent} / {s.unexcused_absent}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Kunlar bo'yicha</CardTitle></CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Bu davrda yozuv yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr><th className="py-2">Sana</th><th>Keldi</th><th>Ketdi</th><th>Holat</th><th>Sabab</th></tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.date} className="border-t">
                          <td className="py-2 tabular-nums">{r.date}</td>
                          <td className="tabular-nums">{r.arrived_time ?? "—"}</td>
                          <td className="tabular-nums">{r.left_time ?? "—"}</td>
                          <td>{!r.arrived_time ? (r.excused ? "Sababli" : "Sababsiz") : r.left_early ? "Erta ketdi" : r.status === "late" ? "Kech" : "Keldi"}</td>
                          <td className="text-xs text-muted-foreground">{r.excuse_reason ? `${r.excuse_reason}${r.excused_by ? ` (${r.excused_by})` : ""}` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
