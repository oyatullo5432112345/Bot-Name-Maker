import { useState, useEffect } from "react";
import {
  Building2, Plus, Pencil, Trash2, Loader2, Check, X, Save, Users, GraduationCap, School,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ============================================================
//  TUMAN ADMINI — MAKTABLAR BOSHQARUVI (Faza 1A)
//  Admin bu yerda tuman maktablarini qo'shadi/tahrirlaydi.
// ============================================================

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
  is_active: boolean; counts: { oquvchi: number; xodim: number; sinf: number };
}
interface FormState { id: string; nom: string; tuman: string; manzil: string; direktor: string }

const EMPTY: FormState = { id: "", nom: "", tuman: "Toshloq", manzil: "", direktor: "" };

export default function MaktablarPage() {
  const [list, setList] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [editId, setEditId] = useState<number | null>(null); // null = yangi
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/maktablar`, { headers: headers() });
      if (res.ok) setList((await res.json()) as School[]);
    } catch { /* jim */ }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  function startNew() { setEditId(null); setForm({ ...EMPTY }); }
  function startEdit(s: School) {
    setEditId(s.id);
    setForm({ id: String(s.id), nom: s.nom, tuman: s.tuman, manzil: s.manzil, direktor: s.direktor });
  }
  function cancel() { setForm(null); setEditId(null); }

  async function save() {
    if (!form) return;
    const idNum = Number(form.id);
    if (editId == null && (!Number.isInteger(idNum) || idNum < 1)) {
      toast({ variant: "destructive", title: "Maktab raqami butun son bo'lsin (masalan 1, 7, 12)" }); return;
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
        toast({ title: editId == null ? "Maktab qo'shildi" : "Saqlandi" });
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

  async function remove(s: School) {
    if (!window.confirm(`${s.nom} o'chirilsinmi?`)) return;
    setBusy(s.id);
    try {
      const res = await fetch(`${API_BASE}/maktablar/${s.id}`, { method: "DELETE", headers: headers() });
      if (res.ok) { toast({ title: "O'chirildi" }); await refresh(); }
      else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast({ variant: "destructive", title: "O'chirib bo'lmadi", description: j.error });
      }
    } catch { /* jim */ }
    setBusy(null);
  }

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-primary/80 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Tuman boshqaruvi
          </p>
          <h1 className="text-xl font-extrabold tracking-tight">Maktablar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tuman maktablarini shu yerda qo'shasiz. Har maktab o'z ma'lumotini alohida yuritadi.</p>
        </div>
        {!form && (
          <button onClick={startNew}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Yangi maktab
          </button>
        )}
      </div>

      {/* FORMA */}
      {form && (
        <div className="p-4 rounded-2xl border-2 border-primary/40 bg-card space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="font-black text-sm">{editId == null ? "➕ Yangi maktab" : `✏️ ${editId}-maktabni tahrirlash`}</p>
            <button onClick={cancel} className="p-1.5 rounded-lg bg-secondary cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Maktab raqami {editId == null ? "" : "(o'zgarmaydi)"}</label>
              <input type="number" value={form.id} disabled={editId != null}
                onChange={(e: { target: { value: string } }) => setForm({ ...form, id: e.target.value })}
                placeholder="masalan: 7"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold focus:outline-none focus:border-primary disabled:opacity-60" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Maktab nomi</label>
              <input value={form.nom}
                onChange={(e: { target: { value: string } }) => setForm({ ...form, nom: e.target.value })}
                placeholder="masalan: 7-maktab"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Tuman</label>
              <input value={form.tuman}
                onChange={(e: { target: { value: string } }) => setForm({ ...form, tuman: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Direktor (ixtiyoriy)</label>
              <input value={form.direktor}
                onChange={(e: { target: { value: string } }) => setForm({ ...form, direktor: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground">Manzil (ixtiyoriy)</label>
              <input value={form.manzil}
                onChange={(e: { target: { value: string } }) => setForm({ ...form, manzil: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={cancel} className="px-4 py-2.5 rounded-xl bg-secondary font-bold text-sm cursor-pointer">Bekor</button>
            <button onClick={save} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Saqlash
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className={`p-3.5 rounded-2xl border bg-card ${s.is_active ? "border-border" : "border-border/40 opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-black text-primary">{s.id}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{s.nom}{s.id === 3 ? " (asosiy)" : ""}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.tuman} tumani{s.direktor ? ` · ${s.direktor}` : ""}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {s.counts.oquvchi}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.counts.xodim}</span>
                      <span className="flex items-center gap-1"><School className="w-3 h-3" /> {s.counts.sinf}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(s)} disabled={busy === s.id}
                    title={s.is_active ? "Faol" : "Nofaol"}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer ${s.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>
                    {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (s.is_active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />)}
                  </button>
                  <button onClick={() => startEdit(s)} className="p-2 rounded-lg bg-secondary cursor-pointer" title="Tahrirlash"><Pencil className="w-3.5 h-3.5" /></button>
                  {s.id !== 3 && (
                    <button onClick={() => remove(s)} disabled={busy === s.id} className="p-2 rounded-lg bg-rose-500/15 text-rose-500 cursor-pointer" title="O'chirish"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Hali maktab yo'q.</div>}
        </div>
      )}
    </div>
  );
}
