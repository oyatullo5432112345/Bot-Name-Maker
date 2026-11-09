import { useState, useEffect } from "react";
import {
  Building2, Plus, Pencil, Trash2, Loader2, Check, X, Save, Users, GraduationCap, School,
  UserPlus, KeyRound, Copy, CreditCard, ScanFace, CalendarDays, AlertTriangle, Archive,
  Sparkles, ShieldCheck, Lock, Unlock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  const t = localStorage.getItem("talim_auth_token");
  if (t) h["Authorization"] = `Bearer ${t}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

interface School {
  id: number; nom: string; tuman: string; manzil: string; direktor: string;
  is_active: boolean; ikki_smena?: boolean; counts: { oquvchi: number; xodim: number; sinf: number };
  sub?: { pro_until: string | null; active: boolean; days_left: number | null; warn: boolean };
}
interface FormState { id: string; nom: string; tuman: string; manzil: string; direktor: string }
interface Archived { id: number; nom: string; tuman: string; purge_in_days: number }

const EMPTY: FormState = { id: "", nom: "", tuman: "Toshloq", manzil: "", direktor: "" };

export default function MaktablarPage() {
  const [list, setList] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const [dirFor, setDirFor] = useState<School | null>(null);
  const [dirName, setDirName] = useState("");
  const [dirSaving, setDirSaving] = useState(false);
  const [dirCreds, setDirCreds] = useState<{ login: string; password: string; login_id: string } | null>(null);

  const [archived, setArchived] = useState<Archived[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/maktablar`, { headers: headers() });
      if (res.ok) setList((await res.json()) as School[]);
      const ar = await fetch(`${API_BASE}/maktablar/archive`, { headers: headers() }).catch(() => null);
      if (ar && ar.ok) setArchived(await ar.json());
    } catch { /* jim */ }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  async function restore(id: number) {
    setBusy(id);
    try {
      const r = await fetch(`${API_BASE}/maktablar/${id}/restore`, { method: "POST", headers: headers() });
      if (r.ok) { toast({ title: "Maktab tiklandi ✅" }); await refresh(); }
      else { const j = (await r.json().catch(() => ({}))) as { error?: string }; toast({ variant: "destructive", title: "Xatolik", description: j.error }); }
    } finally { setBusy(null); }
  }

  function startNew() { setEditId(null); setForm({ ...EMPTY }); }
  function startEdit(s: School) {
    setEditId(s.id);
    setForm({ id: String(s.id), nom: s.nom, tuman: s.tuman, manzil: s.manzil, direktor: s.direktor });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancel() { setForm(null); setEditId(null); }

  async function save() {
    if (!form) return;
    const idNum = Number(form.id);
    if (editId == null && (!Number.isInteger(idNum) || idNum < 1)) {
      toast({ variant: "destructive", title: "Maktab raqami butun son bo'lsin" }); return;
    }
    if (!form.nom.trim()) { toast({ variant: "destructive", title: "Maktab nomi bo'sh" }); return; }
    setSaving(true);
    try {
      let res: Response;
      if (editId == null) {
        res = await fetch(`${API_BASE}/maktablar`, {
          method: "POST", headers: headers(true),
          body: JSON.stringify({ id: idNum, nom: form.nom.trim(), tuman: form.tuman.trim(), manzil: form.manzil.trim(), direktor: form.direktor.trim() }),
        });
      } else {
        res = await fetch(`${API_BASE}/maktablar/${editId}`, {
          method: "PUT", headers: headers(true),
          body: JSON.stringify({ nom: form.nom.trim(), tuman: form.tuman.trim(), manzil: form.manzil.trim(), direktor: form.direktor.trim() }),
        });
      }
      if (res.ok) {
        toast({ title: editId == null ? "Maktab qo'shildi ✅" : "O'zgarishlar saqlandi ✅" });
        cancel(); await refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: j.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
    setSaving(false);
  }

  async function toggleActive(s: School) {
    setBusy(s.id);
    try {
      await fetch(`${API_BASE}/maktablar/${s.id}`, {
        method: "PUT", headers: headers(true), body: JSON.stringify({ is_active: !s.is_active }),
      });
      await refresh();
    } catch { /* jim */ }
    setBusy(null);
  }

  async function toggleSmena(s: School) {
    setBusy(s.id);
    try {
      await fetch(`${API_BASE}/maktablar/${s.id}/smena`, {
        method: "POST", headers: headers(true), body: JSON.stringify({ ikki_smena: !s.ikki_smena }),
      });
      await refresh();
    } catch { /* jim */ }
    setBusy(null);
  }

  async function enterSchool(schoolId: number, path: string) {
    setBusy(schoolId);
    try {
      const r = await fetch(`${API_BASE}/auth/view-school`, {
        method: "POST", headers: headers(true), body: JSON.stringify({ maktab_id: schoolId }),
      });
      const d = await r.json().catch(() => ({}));
      if ((d as { token?: string })?.token) localStorage.setItem("talim_auth_token", (d as { token: string }).token);
      window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + path;
    } catch { setBusy(null); }
  }

  async function extendSub(s: School) {
    const ans = window.prompt(
      `${s.nom} — obuna (PRO):\n• Necha OY uzaytirish (masalan 1, 12)\n• 0 = hoziroq qulflash\n• c = cheksiz (qulf yo'q)`,
      "12",
    );
    if (ans === null) return;
    const v = ans.trim().toLowerCase();
    const body = (v === "c" || v === "cheksiz") ? { unlimited: true } : { months: Number(v) };
    if (!("unlimited" in body) && !Number.isInteger(body.months)) { toast({ variant: "destructive", title: "Oy sonini to'g'ri kiriting" }); return; }
    setBusy(s.id);
    try {
      const r = await fetch(`${API_BASE}/maktablar/${s.id}/subscription`, {
        method: "POST", headers: headers(true), body: JSON.stringify(body),
      });
      if (r.ok) { toast({ title: "Obuna yangilandi", description: s.nom }); await refresh(); }
      else { const j = (await r.json().catch(() => ({}))) as { error?: string }; toast({ variant: "destructive", title: "Xatolik", description: j.error }); }
    } finally { setBusy(null); }
  }

  function openDirector(s: School) { setDirFor(s); setDirName(""); setDirCreds(null); }
  function closeDirector() { setDirFor(null); setDirName(""); setDirCreds(null); }

  async function assignDirector() {
    if (!dirFor) return;
    if (dirName.trim().length < 3) { toast({ variant: "destructive", title: "Ism-familiyani to'liq kiriting" }); return; }
    setDirSaving(true);
    try {
      const res = await fetch(`${API_BASE}/maktablar/${dirFor.id}/director`, {
        method: "POST", headers: headers(true), body: JSON.stringify({ full_name: dirName.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { login?: string; password?: string; login_id?: string; error?: string };
      if (!res.ok) { toast({ variant: "destructive", title: "Xatolik", description: j.error }); return; }
      setDirCreds({ login: j.login ?? "", password: j.password ?? "", login_id: j.login_id ?? "" });
      await refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
    setDirSaving(false);
  }

  async function remove(s: School) {
    if (!window.confirm(`${s.nom} o'chirilsinmi?\n\nMaktab 2 kun ARXIVDA saqlanadi — shu vaqtda tiklash mumkin. Keyin butunlay o'chadi.`)) return;
    setBusy(s.id);
    try {
      const res = await fetch(`${API_BASE}/maktablar/${s.id}`, { method: "DELETE", headers: headers() });
      if (res.ok) { toast({ title: "Arxivga o'tkazildi 📦" }); await refresh(); }
      else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast({ variant: "destructive", title: "O'chirib bo'lmadi", description: j.error });
      }
    } catch { /* jim */ }
    setBusy(null);
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12 px-1">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Tuman boshqaruvi
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            Maktablar
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{list.length} ta</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tuman maktablarini boshqaring. Har maktab o'z ma'lumotini alohida yuritadi.</p>
        </div>
        {!form && (
          <button onClick={startNew}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25 hover:shadow-primary/40">
            <Plus className="w-4 h-4" /> Yangi maktab
          </button>
        )}
      </div>

      {/* FORMA */}
      {form && (
        <div className="p-5 rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-card to-primary/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="font-black text-base flex items-center gap-2">
              {editId == null ? <><Plus className="w-4 h-4 text-primary" /> Yangi maktab</> : <><Pencil className="w-4 h-4 text-primary" /> {editId}-maktabni tahrirlash</>}
            </p>
            <button onClick={cancel} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer transition"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Maktab raqami {editId == null ? "" : "(o'zgarmaydi)"}</label>
              <input type="number" value={form.id} disabled={editId != null}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="masalan: 7"
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm font-bold focus:outline-none focus:border-primary disabled:opacity-60 transition" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Maktab nomi *</label>
              <input value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="masalan: 7-maktab"
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm font-bold focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Tuman</label>
              <input value={form.tuman}
                onChange={(e) => setForm({ ...form, tuman: e.target.value })}
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Direktor (ixtiyoriy)</label>
              <input value={form.direktor}
                onChange={(e) => setForm({ ...form, direktor: e.target.value })}
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Manzil (ixtiyoriy)</label>
              <input value={form.manzil}
                onChange={(e) => setForm({ ...form, manzil: e.target.value })}
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm focus:outline-none focus:border-primary transition" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={cancel} className="px-4 py-2.5 rounded-xl bg-secondary font-bold text-sm cursor-pointer hover:bg-secondary/80 transition">Bekor qilish</button>
            <button onClick={save} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Saqlash
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const sub = s.sub;
            const locked = sub && !sub.active;
            return (
              <div key={s.id} className={`relative rounded-2xl border-2 bg-gradient-to-br from-card to-secondary/20 overflow-hidden transition-all ${s.is_active ? "border-border hover:border-primary/40 hover:shadow-lg" : "border-border/40 opacity-60"}`}>
                {/* Chap chiziq — obuna holati */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${!sub ? "bg-slate-400" : sub.pro_until === null ? "bg-emerald-500" : !sub.active ? "bg-rose-500" : sub.warn ? "bg-amber-500" : "bg-sky-500"}`} />
                
                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    {/* Chap tomon — ma'lumot */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                        <span className="font-black text-primary-foreground text-lg">{s.id}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base truncate">{s.nom}</h3>
                          {!s.is_active && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-600 dark:text-slate-400 uppercase">Nofaol</span>
                          )}
                          {s.ikki_smena && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-300 uppercase">2-smena</span>
                          )}
                          {locked && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 uppercase flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Qulflangan</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {s.tuman} tumani{s.direktor ? ` · ${s.direktor}` : ""}{s.manzil ? ` · ${s.manzil}` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-bold">
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><GraduationCap className="w-3 h-3" /> {s.counts.oquvchi} o'q.</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Users className="w-3 h-3" /> {s.counts.xodim} xod.</span>
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><School className="w-3 h-3" /> {s.counts.sinf} sinf</span>
                        </div>
                        {sub && (
                          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-[10px] font-black ${sub.pro_until === null ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : !sub.active ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : sub.warn ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300"}`}>
                            {sub.pro_until === null ? <>♾️ Cheksiz</> : !sub.active ? <><Lock className="w-3 h-3" /> Tugagan</> : <><CreditCard className="w-3 h-3" /> {sub.days_left} kun qoldi</>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* O'ng tomon — tugmalar */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => toggleActive(s)} disabled={busy === s.id}
                        title={s.is_active ? "Faol — bosilsa nofaol qilinadi" : "Nofaol — bosilsa faol qilinadi"}
                        className={`p-2 rounded-lg cursor-pointer transition-all active:scale-90 ${s.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25" : "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25"}`}>
                        {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (s.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />)}
                      </button>
                      <button onClick={() => void toggleSmena(s)} disabled={busy === s.id}
                        title={s.ikki_smena ? "2-smenali (bosilsa 1-smena)" : "1-smenali (bosilsa 2-smena)"}
                        className={`px-2.5 py-2 rounded-lg text-[10px] font-black cursor-pointer transition-all active:scale-90 ${s.ikki_smena ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25" : "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25"}`}>
                        {s.ikki_smena ? "2" : "1"}
                      </button>
                      <button onClick={() => openDirector(s)} className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 cursor-pointer transition-all active:scale-90" title="Direktor biriktirish"><UserPlus className="w-4 h-4" /></button>
                      <button onClick={() => void extendSub(s)} disabled={busy === s.id} className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 cursor-pointer transition-all active:scale-90" title="Obuna"><CreditCard className="w-4 h-4" /></button>
                      <button onClick={() => startEdit(s)} className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer transition-all active:scale-90" title="Tahrirlash — nom va boshqa maydonlar"><Pencil className="w-4 h-4" /></button>
                      {s.id !== 3 && (
                        <button onClick={() => remove(s)} disabled={busy === s.id} className="p-2 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 cursor-pointer transition-all active:scale-90" title="Arxivga o'tkazish (2 kun)"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>

                  {/* Pastki tugmalar — maktab ichiga kirish */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                    <button onClick={() => void enterSchool(s.id, "/classes")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer transition-all active:scale-95">
                      <School className="w-3.5 h-3.5" /> Sinflar
                    </button>
                    <button onClick={() => void enterSchool(s.id, "/staff")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer transition-all active:scale-95">
                      <Users className="w-3.5 h-3.5" /> Xodimlar
                    </button>
                    <button onClick={() => void enterSchool(s.id, "/faceid")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer transition-all active:scale-95">
                      <ScanFace className="w-3.5 h-3.5" /> Face ID
                    </button>
                    <button onClick={() => void enterSchool(s.id, "/dars-jadvali")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer transition-all active:scale-95">
                      <CalendarDays className="w-3.5 h-3.5" /> Dars jadvali
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-16 rounded-2xl border-2 border-dashed border-border">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">Hali maktab yo'q</p>
              <p className="text-xs mt-1">"Yangi maktab" tugmasi bilan birinchisini qo'shing</p>
            </div>
          )}
        </div>
      )}

      {/* ARXIV */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5" /> Arxiv — o'chirilgan maktablar ({archived.length})
          </p>
          <div className="space-y-2">
            {archived.map((a) => (
              <div key={a.id} className="p-3.5 rounded-2xl border-2 border-dashed border-rose-400/40 bg-rose-500/5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                    <Archive className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{a.nom}</p>
                    <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      {a.purge_in_days > 0 ? `${a.purge_in_days} kundan keyin butunlay o'chadi` : "Yaqinda butunlay o'chadi"}
                    </p>
                  </div>
                </div>
                <button onClick={() => void restore(a.id)} disabled={busy === a.id}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 font-bold text-xs cursor-pointer shrink-0 flex items-center gap-1.5 transition-all active:scale-95">
                  {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Tiklash
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIREKTOR BIRIKTIRISH */}
      {dirFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeDirector}>
          <div className="w-full max-w-md rounded-2xl bg-card border-2 border-border shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-base flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-600" /> Direktor biriktirish</p>
              <button onClick={closeDirector} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer transition"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm font-bold text-center text-primary">{dirFor.nom}</p>

            {!dirCreds ? (
              <>
                <p className="text-xs text-muted-foreground">Direktorning ism-familiyasini kiriting. Login, parol va 5 xonali ID avtomatik yaratiladi.</p>
                <input value={dirName} autoFocus
                  onChange={(e) => setDirName(e.target.value)}
                  placeholder="masalan: Aliyev Vali"
                  className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border text-sm font-bold focus:outline-none focus:border-primary transition" />
                <button onClick={assignDirector} disabled={dirSaving}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25">
                  {dirSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Yaratish
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">Direktor yaratildi ✅ Bu ma'lumotlarni saqlang!</p>
                </div>
                <div className="rounded-xl border-2 border-border bg-secondary/50 divide-y divide-border">
                  <CredRow label="Login" value={dirCreds.login} />
                  <CredRow label="Parol" value={dirCreds.password} />
                  <CredRow label="5 xonali ID" value={dirCreds.login_id} />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><KeyRound className="w-3 h-3" /> Oyna yopilgach parol qayta ko'rsatilmaydi.</p>
                <button onClick={closeDirector} className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm cursor-pointer active:scale-95 transition-all">Yopish</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="text-[11px] font-bold text-muted-foreground w-20 shrink-0 uppercase">{label}</span>
      <span className="flex-1 min-w-0 font-mono font-black text-sm break-all">{value}</span>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* jim */ } }}
        className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer shrink-0 transition" title="Nusxa olish">
        {done ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
  }
