import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, Loader2, Trash2, PlayCircle, Clock, X, Users, HelpCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";

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
  created_by_login: string | null; play_count: number; last_played_at: string | null;
}
interface DraftSegment {
  label: string; weight: number; hasQuestion: boolean; question: string; correct_answer: string; points: number;
}

const emptySegment = (): DraftSegment => ({ label: "", weight: 1, hasQuestion: false, question: "", correct_answer: "", points: 10 });

export default function WheelListPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [timeLimit, setTimeLimit] = useState<string>("30");
  const [segments, setSegments] = useState<DraftSegment[]>([emptySegment(), emptySegment(), emptySegment()]);
  const [saving, setSaving] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [statsOpenId, setStatsOpenId] = useState<string | null>(null);

  const { data: wheels = [], isLoading } = useQuery<WheelGame[]>({
    queryKey: ["wheel-games", mineOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mineOnly) params.set("mine", "true");
      const r = await fetch(`${API_BASE}/wheel-games?${params.toString()}`, { headers: authH() });
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
    const r = await fetch(`${API_BASE}/wheel-games/${id}`, { method: "DELETE", headers: authH() });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast({ variant: "destructive", title: "Xatolik", description: json.error ?? "O'chirib bo'lmadi" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["wheel-games"] });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Link className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground w-fit bg-secondary/50 px-3 py-1.5 rounded-xl border border-border/50" href="/games">
        <ArrowLeft className="w-4 h-4" /> O'yinlarga qaytish
      </Link>

      <div className="relative rounded-3xl overflow-hidden border border-rose-500/25 bg-gradient-to-br from-rose-950/40 via-card to-card p-6 sm:p-7 shadow-xl">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <RefreshCw className="w-6 h-6 animate-spin-slow" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-1">Guruh o'yini</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Omadli Charxpalak</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-md font-medium">
                Aylanadigan charxpalak — har bir bo'limga yashirin savol va ballar biriktirishingiz mumkin.
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 font-bold rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
            <Plus className="w-4 h-4" /> Yangi g'ildirak
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant={mineOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setMineOnly(m => !m)}
          className="rounded-xl font-bold text-xs"
        >
          Mening o'yinlarim
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-rose-500" /></div>
      ) : wheels.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground text-sm font-semibold">{mineOnly ? "Siz hali charxpalak yaratmagansiz" : "Hali charxpalak yaratilmagan"}</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wheels.map(w => {
            const questionCount = w.segments.filter(s => s.question).length;
            const isOwner = w.created_by_login === user?.login;
            const statsOpen = statsOpenId === w.id;
            return (
              <Card className="rounded-2xl border-border/60 hover:border-rose-500/40 transition-all duration-300 shadow-md" key={w.id}>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-black text-lg text-foreground">{w.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-muted-foreground">
                    <span className="bg-secondary px-2.5 py-1 rounded-lg border border-border/40">{w.segments.length} bo'lim</span>
                    <span className="bg-secondary px-2.5 py-1 rounded-lg border border-border/40 flex items-center gap-1"><Users className="w-3 h-3 text-sky-400" /> {w.team_count} jamoa</span>
                    {questionCount > 0 && <span className="bg-secondary px-2.5 py-1 rounded-lg border border-border/40 flex items-center gap-1"><HelpCircle className="w-3 h-3 text-amber-400" /> {questionCount} savol</span>}
                    {w.time_limit_seconds && <span className="bg-secondary px-2.5 py-1 rounded-lg border border-border/40 flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-400" /> {w.time_limit_seconds}s</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Link className="flex-1" href={`/games/wheel/${w.id}`}>
                      <Button className="w-full gap-1.5 font-bold rounded-xl bg-gradient-to-r from-rose-500 to-pink-600" size="sm">
                        <PlayCircle className="w-4 h-4" /> O'ynash
                      </Button>
                    </Link>
                    {isOwner && (
                      <button onClick={() => handleDelete(w.id)} className="p-2 text-muted-foreground hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setStatsOpenId(statsOpen ? null : w.id)}
                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground pt-1"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> {w.play_count ?? 0} marta o'ynalgan
                    {statsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {statsOpen && (
                    <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2 font-semibold">
                      {w.last_played_at
                        ? `Oxirgi marta: ${new Date(w.last_played_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Hali o'ynalmagan"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CHARXPALAK YARATISH MODAL OYNASI */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader><DialogTitle className="font-black text-xl">Yangi Charxpalak Yaratish</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="font-bold text-xs">O'yin Nomi</Label>
              <Input placeholder="Masalan: Tarix va Geografiya bilagʻonlari" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold text-xs"><Users className="w-3.5 h-3.5 text-rose-400" /> Jamoalar soni</Label>
                <div className="flex gap-1.5">
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setTeamCount(n)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all ${teamCount === n ? "border-rose-500 bg-rose-500/10 text-rose-400" : "border-border"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-bold text-xs"><Clock className="w-3.5 h-3.5 text-rose-400" /> Javob vaqti (sekund)</Label>
                <Input placeholder="30" type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="rounded-xl text-xs font-bold" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs">Bo'limlar va Savollar</Label>
                <Button size="sm" variant="outline" onClick={() => setSegments(ss => [...ss, emptySegment()])} className="h-7 text-xs font-bold rounded-lg gap-1">
                  <Plus className="w-3 h-3" /> Bo'lim qo'shish
                </Button>
              </div>

              {segments.map((s, i) => (
                <div key={i} className="rounded-2xl border border-border/70 p-3.5 space-y-3 bg-secondary/20">
                  <div className="flex items-center gap-2">
                    <Input placeholder={`Bo'lim ${i + 1} nomi`} value={s.label} onChange={e => updateSegment(i, { label: e.target.value })} className="flex-1 h-9 text-xs font-bold rounded-xl" />
                    <Input type="number" min={1} max={100} value={s.weight} onChange={e => updateSegment(i, { weight: Number(e.target.value) })} className="w-16 h-9 text-xs font-bold text-center rounded-xl" title="Ehtimollik (Shans)" />
                    <button onClick={() => setSegments(ss => ss.filter((_, si) => si !== i))} className="p-1.5 text-muted-foreground hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.hasQuestion}
                        onChange={e => updateSegment(i, { hasQuestion: e.target.checked })}
                        className="rounded accent-rose-500"
                      />
                      <span>Yashirin savol biriktirish</span>
                    </label>
                  </div>

                  {s.hasQuestion && (
                    <div className="space-y-2 pt-1 pl-2 border-l-2 border-rose-500/40 animate-in fade-in">
                      <Input placeholder="Savol matni..." value={s.question} onChange={e => updateSegment(i, { question: e.target.value })} className="h-8 text-xs rounded-lg" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="To'g'ri javob..." value={s.correct_answer} onChange={e => updateSegment(i, { correct_answer: e.target.value })} className="h-8 text-xs rounded-lg" />
                        <Input placeholder="Ball (masalan: 10)" type="number" value={s.points} onChange={e => updateSegment(i, { points: Number(e.target.value) })} className="h-8 text-xs rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button className="w-full py-5 rounded-xl font-black bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25" disabled={saving} onClick={handleCreate}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "G'ildirakni Yaratish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
