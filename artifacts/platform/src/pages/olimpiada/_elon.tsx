import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Eye, EyeOff, Trophy, Clock } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Ann {
  id: string; title: string; start_time: string;
  end_time: string | null; active: boolean; created_by: string; created_at: string;
}

function formatUz(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getStatus(a: Ann): "active" | "pending" | "ended" | "disabled" {
  if (!a.active) return "disabled";
  const now = Date.now();
  const start = new Date(a.start_time).getTime();
  const end = a.end_time ? new Date(a.end_time).getTime() : null;
  if (start > now) return "pending";
  if (end && end < now) return "ended";
  return "active";
}

const STATUS_LABEL: Record<string, string> = {
  active: "🟢 Faol", pending: "⏳ Kutilmoqda", ended: "✅ Tugagan", disabled: "⛔ O'chirilgan",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  ended: "bg-slate-100 text-slate-600 border-slate-200",
  disabled: "bg-red-100 text-red-600 border-red-200",
};

export default function ElonTab() {
  const { toast } = useToast();
  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/olimpiada-announce/all`, { headers: authH() });
      if (r.ok) setList(await r.json() as Ann[]);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Local datetime string for input default (now + 1h, UZ tz)
  const defaultStart = () => {
    const now = new Date();
    now.setHours(now.getHours() + 5); // UZT = UTC+5
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startTime) {
      toast({ variant: "destructive", title: "Xatolik", description: "Sarlavha va boshlanish vaqti kerak" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/olimpiada-announce`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          title: title.trim(),
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error?: string };
        throw new Error(d.error ?? "Xatolik");
      }
      toast({ title: "E'lon qo'shildi ✅" });
      setTitle(""); setStartTime(""); setEndTime("");
      void load();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await fetch(`${API}/olimpiada-announce/${id}`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({ active: !active }),
      });
      void load();
    } catch { toast({ variant: "destructive", title: "Xatolik" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("E'lonni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await fetch(`${API}/olimpiada-announce/${id}`, { method: "DELETE", headers: authH() });
      toast({ title: "O'chirildi" });
      void load();
    } catch { toast({ variant: "destructive", title: "Xatolik" }); }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Trophy className="w-4 h-4" />
            Yangi Olimpiada e'loni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Olimpiada nomi</Label>
            <Input
              placeholder="Masalan: Matematika olympiadasi 2026"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Boshlanish vaqti *</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                onFocus={e => { if (!e.target.value) e.target.value = defaultStart(); }}
              />
              <p className="text-[10px] text-muted-foreground">Bu vaqtda bosh sahifada banner chiqadi</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tugash vaqti (ixtiyoriy)</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Bo'sh qolsa — admin o'chirganda yashirinadi</p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving || !title.trim() || !startTime} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            E'lon qo'shish
          </Button>
        </CardContent>
      </Card>

      {/* Existing announcements */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Barcha e'lonlar</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Hali e'lon qo'shilmagan
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(a => {
              const status = getStatus(a);
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{a.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      🚀 Boshlanadi: {formatUz(a.start_time)}
                      {a.end_time && ` · 🔚 Tugaydi: ${formatUz(a.end_time)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      title={a.active ? "O'chirish" : "Yoqish"}
                      onClick={() => void handleToggle(a.id, a.active)}
                      className={a.active ? "text-green-600 hover:text-green-700" : "text-muted-foreground"}
                    >
                      {a.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDelete(a.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
