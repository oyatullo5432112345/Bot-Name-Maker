import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Loader2, Trash2, PlayCircle, Clock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface WheelGame {
  id: string; title: string; segments: { label: string; weight: number; color: string }[];
  time_limit_seconds: number | null;
}

export default function WheelListPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [segments, setSegments] = useState<{ label: string; weight: number }[]>([
    { label: "", weight: 1 }, { label: "", weight: 1 }, { label: "", weight: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: wheels = [], isLoading } = useQuery<WheelGame[]>({
    queryKey: ["wheel-games"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/wheel-games`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const resetForm = () => {
    setTitle(""); setTimeLimit(""); setSegments([{ label: "", weight: 1 }, { label: "", weight: 1 }, { label: "", weight: 1 }]);
  };

  const handleCreate = async () => {
    const clean = segments.filter(s => s.label.trim());
    if (!title.trim() || clean.length < 2) {
      toast({ variant: "destructive", title: "Kamida 2 ta bo'lim va nom kiriting" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/wheel-games`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ title: title.trim(), segments: clean, time_limit_seconds: timeLimit ? Number(timeLimit) : null }),
      });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      resetForm(); setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["wheel-games"] });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    await fetch(`${API_BASE}/wheel-games/${id}`, { method: "DELETE", headers: authH() });
    qc.invalidateQueries({ queryKey: ["wheel-games"] });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/games" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> O'yinlarga qaytish
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎡 G'ildirak</h1>
          <p className="text-muted-foreground text-sm mt-1">Aylanadigan g'ildirak avtomatik tanlaydi — ismlar, savollar yoki jamoalar uchun</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Yangi g'ildirak</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : wheels.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground text-sm">Hali g'ildirak yaratilmagan</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {wheels.map(w => (
            <Card key={w.id}>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold">{w.title}</h3>
                <p className="text-xs text-muted-foreground">{w.segments.length} ta bo'lim{w.time_limit_seconds ? ` • ${w.time_limit_seconds}s vaqt` : ""}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/games/wheel/${w.id}`} className="flex-1">
                    <Button size="sm" className="w-full gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> Aylantirish</Button>
                  </Link>
                  <button onClick={() => handleDelete(w.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yangi g'ildirak</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nomi</Label>
              <Input placeholder="Masalan: Kim javob beradi?" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Javob berish vaqti (soniya, ixtiyoriy)</Label>
              <Input type="number" placeholder="Masalan: 30" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bo'limlar (va shanslari)</Label>
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder={`Bo'lim ${i + 1} nomi`} value={s.label} onChange={e => setSegments(ss => ss.map((x, xi) => xi === i ? { ...x, label: e.target.value } : x))} className="flex-1" />
                  <Input
                    type="number" min={1} max={100} value={s.weight}
                    onChange={e => setSegments(ss => ss.map((x, xi) => xi === i ? { ...x, weight: Number(e.target.value) } : x))}
                    className="w-16" title="Shans (og'irlik)"
                  />
                  <button onClick={() => setSegments(ss => ss.filter((_, xi) => xi !== i))} className="text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setSegments(ss => [...ss, { label: "", weight: 1 }])} className="text-sm text-primary font-medium">+ Bo'lim qo'shish</button>
              <p className="text-xs text-muted-foreground">O'ng tarafdagi son — shans og'irligi. Teng shans uchun hammasida bir xil son qoldiring.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
