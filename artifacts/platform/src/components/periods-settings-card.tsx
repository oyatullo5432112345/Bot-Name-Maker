// Dars vaqtlarini maktab o'zi belgilaydi (admin, direktor, zavuch, MMTB).
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { DEFAULT_PERIOD_TIMES, usePeriodTimesRaw } from "@/lib/use-period-times";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const EDIT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

const split = (v: string) => {
  const [a = "", b = ""] = v.split("–");
  return { start: a, end: b };
};

export function PeriodsSettingsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const saved = usePeriodTimesRaw();
  const [rows, setRows] = useState<{ period: number; start: string; end: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = new Map((saved.data ?? []).map((p) => [p.period, p]));
    setRows(
      Object.keys(DEFAULT_PERIOD_TIMES).map((k) => {
        const period = Number(k);
        const p = map.get(period);
        if (p) return { period, start: p.start_time, end: p.end_time };
        const d = split(DEFAULT_PERIOD_TIMES[period]!);
        return { period, start: d.start, end: d.end };
      }),
    );
  }, [saved.data]);

  if (!user || !EDIT_ROLES.includes(user.role)) return null;

  const update = (period: number, field: "start" | "end", value: string) =>
    setRows((r) => r.map((x) => (x.period === period ? { ...x, [field]: value } : x)));

  const save = async () => {
    setSaving(true);
    try {
      const t = localStorage.getItem("talim_auth_token");
      const r = await fetch(`${API_BASE}/maktab-periods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ periods: rows }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
      toast({ title: "Dars vaqtlari saqlandi" });
      await qc.invalidateQueries({ queryKey: ["maktab-periods"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Dars vaqtlari
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Maktabingizning darslar boshlanish va tugash vaqtini belgilang. Dars jadvali va kunlik xabarlarda shu vaqt chiqadi.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.period} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="w-16 text-sm font-semibold">{r.period}-dars</span>
              <Input type="time" value={r.start} onChange={(e) => update(r.period, "start", e.target.value)} className="w-28" />
              <span className="text-muted-foreground">—</span>
              <Input type="time" value={r.end} onChange={(e) => update(r.period, "end", e.target.value)} className="w-28" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Saqlash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
