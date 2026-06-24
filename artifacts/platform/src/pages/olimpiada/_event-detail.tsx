import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import {
  ChevronLeft, CalendarDays, MapPin, Users, Trophy, CheckCircle2,
  Loader2, Plus, Trash2, X, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { OlimpiadEvent } from "./_events";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Registration { id: string; event_id: string; student_id: string; student_name: string; sinf: string; created_at: string; }
interface Result { id: string; student_name: string; sinf: string; maktab: string; ball: number; orin: number | null; }
interface MyReg { registered: boolean; registration: Registration | null; }

const MEDAL = ["🥇","🥈","🥉"];
const MEDAL_BG = ["from-yellow-400/20 to-amber-500/20 border-yellow-400/40","from-slate-300/20 to-slate-400/20 border-slate-400/40","from-amber-600/20 to-orange-700/20 border-amber-600/40"];
const MEDAL_TEXT = ["text-yellow-700","text-slate-700","text-amber-800"];

const HOLAT_COLOR: Record<string, string> = {
  royhat_ochiq:    "bg-green-100 text-green-700 border-green-200",
  tugagan:         "bg-gray-100 text-gray-600 border-gray-200",
  natijalar_ellon: "bg-yellow-100 text-yellow-700 border-yellow-200",
};
const HOLAT_LABEL: Record<string, string> = {
  royhat_ochiq: "Ro'yxat ochiq", tugagan: "Tugagan", natijalar_ellon: "Natijalar e'lon qilindi",
};
const BOSQICH_LABEL: Record<string, string> = { maktab: "Maktab", tuman: "Tuman", viloyat: "Viloyat", respublika: "Respublika" };

function fmt(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}

interface NatRow { student_name: string; sinf: string; maktab: string; ball: string; orin: string; }

export default function EventDetail({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";
  const isStudent = user?.role === "student";

  const [event, setEvent] = useState<OlimpiadEvent | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [myReg, setMyReg] = useState<MyReg>({ registered: false, registration: null });
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);

  // Natijalar kiritish
  const [natDialog, setNatDialog] = useState(false);
  const [natRows, setNatRows] = useState<NatRow[]>(
    Array.from({ length: 5 }, () => ({ student_name: "", sinf: "", maktab: "", ball: "", orin: "" }))
  );
  const [natSaving, setNatSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, rRes, resRes, myRes] = await Promise.all([
        fetch(`${API}/olimpiada/events/${eventId}`, { headers: authH() }),
        fetch(`${API}/olimpiada/events/${eventId}/registrations`, { headers: authH() }),
        fetch(`${API}/olimpiada/events/${eventId}/results`, { headers: authH() }),
        fetch(`${API}/olimpiada/events/${eventId}/my-registration`, { headers: authH() }),
      ]);
      const [eData, rData, resData, myData] = await Promise.all([
        eRes.json(), rRes.json(), resRes.json(), myRes.json(),
      ]);
      setEvent(eData as OlimpiadEvent);
      setRegs(Array.isArray(rData) ? rData as Registration[] : []);
      setResults(Array.isArray(resData) ? resData as Result[] : []);
      setMyReg(myData as MyReg);
    } catch { toast({ variant: "destructive", title: "Yuklab bo'lmadi" }); }
    finally { setLoading(false); }
  }, [eventId, toast]);

  useEffect(() => { void load(); }, [load]);

  async function register() {
    if (!user) { toast({ variant: "destructive", title: "Kirish kerak" }); return; }
    setRegLoading(true);
    try {
      const r = await fetch(`${API}/olimpiada/events/${eventId}/register`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          student_name: user.full_name ?? user.login,
          sinf: user.class_name ?? "",
        }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) { toast({ variant: "destructive", title: d.error ?? "Xatolik" }); return; }
      toast({ title: "✅ Ro'yxatdan o'tdingiz!" });
      void load();
    } finally { setRegLoading(false); }
  }

  async function unregister(studentId: string) {
    if (!confirm("Ro'yxatdan chiqarasizmi?")) return;
    await fetch(`${API}/olimpiada/events/${eventId}/unregister/${studentId}`, {
      method: "DELETE", headers: authH(),
    });
    toast({ title: "O'chirildi" }); void load();
  }

  function openNatDialog() {
    // prefill from registrations if available
    const rows: NatRow[] = regs.slice(0, 10).map(r => ({
      student_name: r.student_name, sinf: r.sinf, maktab: "", ball: "", orin: "",
    }));
    while (rows.length < 5) rows.push({ student_name: "", sinf: "", maktab: "", ball: "", orin: "" });
    setNatRows(rows);
    setNatDialog(true);
  }

  async function saveNatijalar() {
    const valid = natRows.filter(r => r.student_name.trim() && r.ball.trim());
    if (!valid.length) { toast({ variant: "destructive", title: "Kamida 1 ta natija kiriting" }); return; }
    setNatSaving(true);
    try {
      const r = await fetch(`${API}/olimpiada/events/${eventId}/results`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          natijalar: valid.map(r => ({
            student_name: r.student_name.trim(),
            sinf: r.sinf.trim(),
            maktab: r.maktab.trim(),
            ball: Number(r.ball),
            orin: r.orin ? Number(r.orin) : null,
          })),
        }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) { toast({ variant: "destructive", title: d.error ?? "Xatolik" }); return; }
      toast({ title: `✅ ${valid.length} ta natija saqlandi! Holat "Natijalar e'lon qilindi" ga o'zgartirildi.` });
      setNatDialog(false);
      void load();
    } finally { setNatSaving(false); }
  }

  function exportCSV() {
    if (!regs.length) return;
    const rows = [["Ism","Sinf","Ro'yxatdan o'tgan sana"]];
    regs.forEach(r => rows.push([r.student_name, r.sinf, new Date(r.created_at).toLocaleDateString("uz-UZ")]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `royhat_${eventId}.csv`; a.click();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  if (!event) return <div className="text-center py-16 text-muted-foreground">Topilmadi</div>;

  const top3 = results.filter(r => r.orin !== null && r.orin <= 3).sort((a,b) => (a.orin??9)-(b.orin??9));
  const restResults = results.filter(r => !r.orin || r.orin > 3);
  const isOpen = event.holat === "royhat_ochiq";
  const resultsDeclared = event.holat === "natijalar_ellon";
  const qCnt = Number(event.qatnashchi_soni);
  const isFull = event.max_qatnashchi > 0 && qCnt >= event.max_qatnashchi;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="shrink-0 mt-0.5" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${HOLAT_COLOR[event.holat] ?? ""}`}>
              {HOLAT_LABEL[event.holat] ?? event.holat}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              {BOSQICH_LABEL[event.bosqich] ?? event.bosqich}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {event.sinf_from}–{event.sinf_to}-sinf
            </span>
          </div>
          <h1 className="text-xl font-bold leading-tight">{event.nomi}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{event.fan}</p>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <CalendarDays className="w-4 h-4" />, label: "Sana", value: fmt(event.sana_boshlanish) },
          { icon: <MapPin className="w-4 h-4" />, label: "Joy", value: event.joy || "—" },
          { icon: <Users className="w-4 h-4" />, label: "Qatnashchilar", value: `${qCnt}${event.max_qatnashchi > 0 ? ` / ${event.max_qatnashchi}` : ""}` },
          { icon: <CalendarDays className="w-4 h-4" />, label: "Ro'yxat tugashi", value: fmt(event.roy_tugash) },
        ].map(({ icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                {icon}<span className="text-xs">{label}</span>
              </div>
              <p className="font-semibold text-sm truncate">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {event.tavsif && (
        <div className="p-4 rounded-xl bg-muted/40 border text-sm leading-relaxed text-muted-foreground">
          {event.tavsif}
        </div>
      )}

      {/* Registration button (for students) */}
      {isStudent && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          {myReg.registered ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-700">Siz ro'yxatdansiz!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ro'yxatdan o'tgan sana: {myReg.registration ? fmt(myReg.registration.created_at) : ""}
                </p>
              </div>
            </>
          ) : isOpen && !isFull ? (
            <>
              <div className="flex-1">
                <p className="font-semibold">Ushbu olimpiadaga qatnashing</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hali {event.max_qatnashchi > 0 ? `${event.max_qatnashchi - qCnt} ta joy bor` : "joy cheksiz"}</p>
              </div>
              <Button onClick={register} disabled={regLoading}>
                {regLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Ro'yxatdan o'tish
              </Button>
            </>
          ) : isFull ? (
            <p className="text-muted-foreground">Ro'yxat to'ldi</p>
          ) : (
            <p className="text-muted-foreground">Ro'yxat yopilgan</p>
          )}
        </div>
      )}

      {/* Results section */}
      {resultsDeclared && results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Natijalar
          </h2>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3.map(r => {
                const i = (r.orin ?? 1) - 1;
                return (
                  <Card key={r.id} className={`border bg-gradient-to-br ${MEDAL_BG[i] ?? MEDAL_BG[2]} overflow-hidden`}>
                    <CardContent className="p-4">
                      <div className="text-3xl mb-2">{MEDAL[i] ?? "🏅"}</div>
                      <p className={`font-bold text-base ${MEDAL_TEXT[i] ?? ""}`}>{r.student_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.sinf} · {r.maktab || "—"}</p>
                      <p className="text-lg font-bold text-primary mt-2">{r.ball}<span className="text-sm font-normal text-muted-foreground ml-1">ball</span></p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {restResults.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-center w-12 font-medium">O'rin</th>
                    <th className="px-3 py-2 text-left font-medium">Ism</th>
                    <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Sinf</th>
                    <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Maktab</th>
                    <th className="px-3 py-2 text-right font-medium">Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {restResults.map((r, idx) => (
                    <tr key={r.id} className={idx%2===0?"bg-background":"bg-muted/20"}>
                      <td className="px-3 py-2 text-center font-medium text-muted-foreground">{r.orin ?? idx+4}</td>
                      <td className="px-3 py-2 font-medium">{r.student_name}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{r.sinf}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{r.maktab || "—"}</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{r.ball}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin: Registrations list + natijalar kiritish */}
      {canEdit && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Ro'yxatdan o'tganlar ({regs.length})
            </h2>
            <div className="flex gap-2">
              {regs.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1.5" /> Excel (CSV)
                </Button>
              )}
              <Button size="sm" onClick={openNatDialog}>
                <Plus className="w-4 h-4 mr-1.5" /> Natija kiritish
              </Button>
            </div>
          </div>

          {regs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Hali hech kim ro'yxatdan o'tmagan</p>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Ism</th>
                    <th className="px-3 py-2 text-left font-medium">Sinf</th>
                    <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Sana</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r, idx) => (
                    <tr key={r.id} className={idx%2===0?"bg-background":"bg-muted/20"}>
                      <td className="px-3 py-2 text-muted-foreground">{idx+1}</td>
                      <td className="px-3 py-2 font-medium">{r.student_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.sinf || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell text-xs">
                        {new Date(r.created_at).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="px-2 py-2">
                        <button className="p-1 rounded hover:bg-destructive/10" onClick={() => unregister(r.student_id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Natijalar kiritish dialog */}
      <Dialog open={natDialog} onOpenChange={setNatDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Natijalarni kiritish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Natijalar saqlanganida holat avtomatik "Natijalar e'lon qilindi" ga o'zgaradi.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium pr-2">Ism *</th>
                  <th className="py-2 text-left font-medium px-2">Sinf</th>
                  <th className="py-2 text-left font-medium px-2">Maktab</th>
                  <th className="py-2 text-left font-medium px-2">Ball *</th>
                  <th className="py-2 text-left font-medium px-2">O'rin</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {natRows.map((row, i) => (
                  <tr key={i} className="border-b border-muted/50">
                    <td className="py-1 pr-2">
                      <Input className="h-8 text-sm" value={row.student_name}
                        onChange={e => setNatRows(rows => rows.map((r,j) => j===i ? {...r, student_name: e.target.value} : r))} />
                    </td>
                    <td className="py-1 px-2">
                      <Input className="h-8 text-sm w-16" value={row.sinf}
                        onChange={e => setNatRows(rows => rows.map((r,j) => j===i ? {...r, sinf: e.target.value} : r))} />
                    </td>
                    <td className="py-1 px-2">
                      <Input className="h-8 text-sm w-28" value={row.maktab}
                        onChange={e => setNatRows(rows => rows.map((r,j) => j===i ? {...r, maktab: e.target.value} : r))} />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" className="h-8 text-sm w-20" value={row.ball}
                        onChange={e => setNatRows(rows => rows.map((r,j) => j===i ? {...r, ball: e.target.value} : r))} />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" className="h-8 text-sm w-16" value={row.orin} placeholder="—"
                        onChange={e => setNatRows(rows => rows.map((r,j) => j===i ? {...r, orin: e.target.value} : r))} />
                    </td>
                    <td className="py-1 pl-1">
                      <button className="p-1 rounded hover:bg-destructive/10"
                        onClick={() => setNatRows(rows => rows.filter((_,j) => j !== i))}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm"
              onClick={() => setNatRows(r => [...r, { student_name: "", sinf: "", maktab: "", ball: "", orin: "" }])}>
              <Plus className="w-4 h-4 mr-1" /> Qator qo'shish
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={saveNatijalar} disabled={natSaving} className="flex-1">
              {natSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Saqlash va e'lon qilish
            </Button>
            <Button variant="outline" onClick={() => setNatDialog(false)}><X className="w-4 h-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
