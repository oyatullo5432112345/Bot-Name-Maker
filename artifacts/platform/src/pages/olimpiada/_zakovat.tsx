import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import {
  Plus, Swords, Loader2, Users, ChevronLeft, Trash2,
  PlayCircle, CheckCircle2, Clock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Session { id: string; nomi: string; sana: string | null; raundlar_soni: number; savollar_soni: number; holat: string; created_at: string; jamoalar: number; }
interface Team { id: string; session_id: string; jamoa_nomi: string; azolar: string[]; }
interface Score { id: string; session_id: string; team_id: string; raund: number; ball: number; }

const HOLAT_INFO: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  tayyorlanmoqda: { icon: <Clock className="w-3.5 h-3.5" />, label: "Tayyorlanmoqda", color: "bg-blue-100 text-blue-700" },
  jarayonda:      { icon: <PlayCircle className="w-3.5 h-3.5" />, label: "Jarayonda",   color: "bg-green-100 text-green-700" },
  tugagan:        { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Tugagan",  color: "bg-gray-100 text-gray-600" },
};

export default function ZakovatTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const [createDialog, setCreateDialog] = useState(false);
  const [cNomi, setCNomi] = useState(""); const [cSana, setCSana] = useState("");
  const [cRaund, setCRaund] = useState("3"); const [cSavol, setCSavol] = useState("5");
  const [cSaving, setCSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/olimpiada/zakovat`, { headers: authH() });
      const d = await r.json() as unknown;
      setSessions(Array.isArray(d) ? d as Session[] : []);
    } catch { toast({ variant: "destructive", title: "Yuklab bo'lmadi" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  async function createSession() {
    if (!cNomi.trim()) { toast({ variant: "destructive", title: "Nom majburiy" }); return; }
    setCSaving(true);
    try {
      await fetch(`${API}/olimpiada/zakovat`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ nomi: cNomi.trim(), sana: cSana||null, raundlar_soni: Number(cRaund), savollar_soni: Number(cSavol) }),
      });
      toast({ title: "Zakovat sessiyasi yaratildi ✅" });
      setCreateDialog(false); setCNomi(""); setCSana(""); setCRaund("3"); setCSavol("5");
      void loadSessions();
    } catch { toast({ variant: "destructive", title: "Xatolik" }); }
    finally { setCSaving(false); }
  }

  async function delSession(id: string) {
    if (!confirm("Bu Zakovat sessiyasini o'chirasizmi?")) return;
    await fetch(`${API}/olimpiada/zakovat/${id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" }); void loadSessions();
  }

  if (activeSession) {
    return <SessionDetail sessionId={activeSession} onBack={() => { setActiveSession(null); void loadSessions(); }} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2"><Swords className="w-5 h-5 text-violet-600" /> Zakovat</h2>
          <p className="text-muted-foreground text-sm">Jamoaviy intellektual o'yin</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Yangi o'yin
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Swords className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Hali Zakovat o'yini yaratilmagan</p>
          {canEdit && <Button className="mt-4" size="sm" onClick={() => setCreateDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Birinchi o'yinni yarating</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sessions.map(s => {
            const hi = HOLAT_INFO[s.holat] ?? HOLAT_INFO.tayyorlanmoqda;
            return (
              <Card key={s.id} className="card-hover cursor-pointer overflow-hidden" onClick={() => setActiveSession(s.id)}>
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-base leading-tight pr-2">{s.nomi}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 shrink-0 font-medium ${hi.color}`}>
                      {hi.icon}{hi.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {s.sana && <span>📅 {new Date(s.sana).toLocaleDateString("uz-UZ")}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{s.jamoalar} jamoa</span>
                    <span>🔄 {s.raundlar_soni} raund</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-xs text-muted-foreground">Har raundda {s.savollar_soni} ta savol</span>
                    {canEdit && (
                      <button
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                        onClick={e => { e.stopPropagation(); void delSession(s.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yangi Zakovat o'yini</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nomi *</label>
              <Input value={cNomi} onChange={e => setCNomi(e.target.value)} placeholder="Masalan: Zakovat 2026 — Bahor" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sana</label>
              <Input type="date" value={cSana} onChange={e => setCSana(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Raundlar soni</label>
                <Input type="number" min={1} max={10} value={cRaund} onChange={e => setCRaund(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Har raundda savollar</label>
                <Input type="number" min={1} max={20} value={cSavol} onChange={e => setCSavol(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={createSession} disabled={cSaving} className="flex-1">
                {cSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Yaratish
              </Button>
              <Button variant="outline" onClick={() => setCreateDialog(false)}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Session detail ────────────────────────────────────────────────────────────

function SessionDetail({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";

  const [data, setData] = useState<{ session: Session; teams: Team[]; scores: Score[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const [teamDialog, setTeamDialog] = useState(false);
  const [tNomi, setTNomi] = useState(""); const [tAzolar, setTAzolar] = useState("");
  const [tSaving, setTSaving] = useState(false);

  const [editingScore, setEditingScore] = useState<{ teamId: string; raund: number; val: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/olimpiada/zakovat/${sessionId}`, { headers: authH() });
      const d = await r.json() as { session: Session; teams: Team[]; scores: Score[] };
      setData(d);
    } catch { toast({ variant: "destructive", title: "Yuklab bo'lmadi" }); }
    finally { setLoading(false); }
  }, [sessionId, toast]);

  useEffect(() => { void load(); }, [load]);

  async function addTeam() {
    if (!tNomi.trim()) { toast({ variant: "destructive", title: "Jamoa nomi majburiy" }); return; }
    setTSaving(true);
    const azolarArr = tAzolar.split(",").map(s => s.trim()).filter(Boolean);
    try {
      await fetch(`${API}/olimpiada/zakovat/${sessionId}/teams`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ jamoa_nomi: tNomi.trim(), azolar: azolarArr }),
      });
      toast({ title: "Jamoa qo'shildi ✅" });
      setTeamDialog(false); setTNomi(""); setTAzolar(""); void load();
    } catch { toast({ variant: "destructive", title: "Xatolik" }); }
    finally { setTSaving(false); }
  }

  async function delTeam(id: string) {
    if (!confirm("Jamoani o'chirasizmi?")) return;
    await fetch(`${API}/olimpiada/zakovat/teams/${id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" }); void load();
  }

  async function saveScore(teamId: string, raund: number, ball: string) {
    try {
      await fetch(`${API}/olimpiada/zakovat/${sessionId}/score`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ team_id: teamId, raund, ball: Number(ball) }),
      });
      setEditingScore(null); void load();
    } catch { toast({ variant: "destructive", title: "Xatolik" }); }
  }

  async function changeHolat(holat: string) {
    await fetch(`${API}/olimpiada/zakovat/${sessionId}`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ holat }),
    });
    void load();
  }

  if (loading || !data) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const { session, teams, scores } = data;
  const raundlar = Array.from({ length: session.raundlar_soni }, (_, i) => i + 1);

  // Jami ball per team
  const teamTotals = teams.map(t => ({
    ...t,
    jami: scores.filter(s => s.team_id === t.id).reduce((acc, s) => acc + s.ball, 0),
  })).sort((a, b) => b.jami - a.jami);

  function getScore(teamId: string, raund: number) {
    return scores.find(s => s.team_id === teamId && s.raund === raund)?.ball ?? null;
  }

  const hi = HOLAT_INFO[session.holat] ?? HOLAT_INFO.tayyorlanmoqda;
  const MEDAL = ["🥇","🥈","🥉"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-xl truncate">{session.nomi}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${hi.color}`}>
              {hi.icon}{hi.label}
            </span>
            {session.sana && <span className="text-xs text-muted-foreground">📅 {new Date(session.sana).toLocaleDateString("uz-UZ")}</span>}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            {session.holat === "tayyorlanmoqda" && (
              <Button size="sm" variant="outline" onClick={() => changeHolat("jarayonda")}>
                <PlayCircle className="w-4 h-4 mr-1.5 text-green-600" /> Boshlash
              </Button>
            )}
            {session.holat === "jarayonda" && (
              <Button size="sm" variant="outline" onClick={() => changeHolat("tugagan")}>
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-gray-600" /> Yakunlash
              </Button>
            )}
            <Button size="sm" onClick={() => setTeamDialog(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Jamoa
            </Button>
          </div>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Hali jamoa qo'shilmagan</p>
          {canEdit && <Button className="mt-4" size="sm" onClick={() => setTeamDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Jamoa qo'shish</Button>}
        </div>
      ) : (
        <>
          {/* Leaderboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {teamTotals.slice(0, 3).map((t, i) => (
              <Card key={t.id} className="overflow-hidden">
                <div className={`h-1 ${i===0?"bg-yellow-400":i===1?"bg-slate-400":"bg-amber-600"}`} />
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-1">{MEDAL[i]??""}</div>
                  <p className="font-bold text-sm">{t.jamoa_nomi}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{t.jami}<span className="text-sm font-normal text-muted-foreground ml-1">ball</span></p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Score table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Raund natijalari</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-40">Jamoa</th>
                    {raundlar.map(r => <th key={r} className="px-2 py-2 text-center font-medium w-14">R{r}</th>)}
                    <th className="px-3 py-2 text-right font-medium">Jami</th>
                    {canEdit && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {teamTotals.map((t, idx) => (
                    <tr key={t.id} className={idx%2===0?"bg-background":"bg-muted/20"}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-sm">{t.jamoa_nomi}</div>
                        {t.azolar.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate max-w-[140px]">{t.azolar.join(", ")}</div>
                        )}
                      </td>
                      {raundlar.map(r => {
                        const sc = getScore(t.id, r);
                        const isEditing = editingScore?.teamId === t.id && editingScore?.raund === r;
                        return (
                          <td key={r} className="px-2 py-2 text-center">
                            {canEdit && isEditing ? (
                              <Input
                                autoFocus
                                type="number"
                                className="w-14 h-7 text-center text-sm px-1"
                                value={editingScore.val}
                                onChange={e => setEditingScore(prev => prev ? {...prev, val: e.target.value} : null)}
                                onBlur={() => { if (editingScore) void saveScore(editingScore.teamId, editingScore.raund, editingScore.val); }}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && editingScore) void saveScore(editingScore.teamId, editingScore.raund, editingScore.val);
                                  if (e.key === "Escape") setEditingScore(null);
                                }}
                              />
                            ) : (
                              <button
                                className={`w-10 h-7 rounded-md text-sm font-medium transition-colors ${
                                  sc !== null ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                                onClick={() => canEdit && setEditingScore({ teamId: t.id, raund: r, val: String(sc ?? 0) })}
                              >
                                {sc !== null ? sc : "—"}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold text-primary text-base">{t.jami}</td>
                      {canEdit && (
                        <td className="px-2 py-2">
                          <button className="p-1 rounded hover:bg-destructive/10" onClick={() => delTeam(t.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {canEdit && session.holat !== "tugagan" && (
                <p className="text-xs text-muted-foreground text-center py-2">💡 Ball katakchalarini bosib o'zgartiring</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add team dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yangi jamoa</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Jamoa nomi *</label>
              <Input value={tNomi} onChange={e => setTNomi(e.target.value)} placeholder="Masalan: Sherlar" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">A'zolar (vergul bilan ajrating)</label>
              <Input value={tAzolar} onChange={e => setTAzolar(e.target.value)} placeholder="Ali, Vali, Guli" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={addTeam} disabled={tSaving} className="flex-1">
                {tSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Qo'shish
              </Button>
              <Button variant="outline" onClick={() => setTeamDialog(false)}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
