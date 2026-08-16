import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Loader2, Trash2, PlayCircle, Clock, X, Users, HelpCircle } from "lucide-react";
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
  id: string; title: string; segments: { label: string; weight: number; color: string; question?: string }[];
  time_limit_seconds: number | null; team_count: number;
}
interface DraftSegment {
  label: string; weight: number; hasQuestion: boolean; question: string; correct_answer: string; points: number;
}

const emptySegment = (): DraftSegment => ({ label: "", weight: 1, hasQuestion: false, question: "", correct_answer: "", points: 10 });

export default function WheelListPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [timeLimit, setTimeLimit] = useState<string>("30");
  const [segments, setSegments] = useState<DraftSegment[]>([emptySegment(), emptySegment(), emptySegment()]);
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
    setTitle(""); setTeamCount(2); setTimeLimit("30");
    setSegments([emptySegment(), emptySegment(), emptySegment()]);
  };

  const updateSegment = (i: number, patch: Partial<DraftSegment>) => {
    setSegments(ss => ss.map((s, si) => si === i ? { ...s, ...patch } : s));
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
        body: JSON.stringify({
          title: title.trim(),
          team_count: teamCount,
          time_limit_seconds: timeLimit ? Number(timeLimit) : null,
          segments: clean.map(s => ({
            label: s.label.trim(),
            weight: s.weight,
            points: s.points,
            ...(s.hasQuestion && s.question.trim() ? { question: s.question.trim(), correct_answer: s.correct_answer.trim() } : {}),
          })),
        }),
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
          <p className="text-muted-foreground text-sm mt-1">Aylanadigan g'ildirak — har bo'limga yashirin savol qo'shishingiz mumkin</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Yangi g'ildirak</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : wheels.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground text-sm">Hali g'ildirak yaratilmagan</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {wheels.map(w => {
            const questionCount = w.segments.filter(s => s.question).length;
            return (
              <Card key={w.id}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold">{w.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{w.segments.length} bo'lim</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {w.team_count} jamoa</span>
                    {questionCount > 0 && <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {questionCount} savol</span>}
                    {w.time_limit_seconds && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {w.time_limit_seconds}s</span>}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/games/wheel/${w.id}`} className="flex-1">
                      <Button size="sm" className="w-full gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> O'ynash</Button>
                    </Link>
                    <button onClick={() => handleDelete(w.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yangi g'ildirak</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nomi</Label>
              <Input placeholder="Masalan: Kim javob beradi?" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Jamoalar soni</Label>
                <div className="flex gap-1.5">
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setTeamCount(n)} className={`flex-1 py-1.5 rounded-lg border-2 text-sm font-semibold ${teamCount === n ? "border-primary bg-primary/5" : "border-border"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Javob vaqti (s)</Label>
                <Input type="number" placeholder="30" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bo'limlar</Label>
              {segments.map((s, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input placeholder={`Bo'lim ${i + 1} nomi`} value={s.label} onChange={e => updateSegment(i, { label: e.target.value })} className="flex-1 h-8 text-sm" />
                    <Input
                      type="number" min={1} max={100} value={s.weight}
                      onChange={e => updateSegment(i, { weight: Number(e.target.value) })}
                      className="w-16 h-8 text-xs" title="Shans (og'irlik)"
                    />
                    <button onClick={() => setSegments(ss => ss.filter((_, si) => si !== i))} className="text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={s.hasQuestion} onChange={e => updateSegment(i, { hasQuestion: e.target.checked })} />
                    Bu bo'limga yashirin savol qo'shish
                  </label>
                  {s.hasQuestion && (
                    <div className="pl-5 space-y-1.5">
                      <Input placeholder="Savol matni" value={s.question} onChange={e => updateSegment(i, { question: e.target.value })} className="h-7 text-xs" />
                      <div className="flex items-center gap-1.5">
                        <Input placeholder="To'g'ri javob" value={s.correct_answer} onChange={e => updateSegment(i, { correct_answer: e.target.value })} className="h-7 text-xs flex-1" />
                        <Input type="number" min={1} max={100} value={s.points} onChange={e => updateSegment(i, { points: Number(e.target.value) })} className="h-7 w-16 text-xs" title="Ball" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setSegments(ss => [...ss, emptySegment()])} className="text-sm text-primary font-medium">+ Bo'lim qo'shish</button>
              <p className="text-xs text-muted-foreground">Bo'lim nomi yonidagi son — shans og'irligi (teng shans uchun hammasida bir xil son qoldiring).</p>
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
