import { useState, useEffect } from "react";
import {
  Building2, Plus, Pencil, Trash2, Loader2, Check, X, Save, Users, GraduationCap, School,
  UserPlus, KeyRound, Copy, CreditCard, ScanFace,
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
  is_active: boolean; ikki_smena?: boolean; counts: { oquvchi: number; xodim: number; sinf: number };
  sub?: { pro_until: string | null; active: boolean; days_left: number | null; warn: boolean };
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

  // Direktor biriktirish
  const [dirFor, setDirFor] = useState<School | null>(null);
  const [dirName, setDirName] = useState("");
  const [dirSaving, setDirSaving] = useState(false);
  const [dirCreds, setDirCreds] = useState<{ login: string; password: string; login_id: string } | null>(null);

  // #4: arxiv (o'chirilgan maktablar)
  const [archived, setArchived] = useState<{ id: number; nom: string; tuman: string; purge_in_days: number }[]>([]);

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
      if (r.ok) { toast({ title: "Maktab tiklandi" }); await refresh(); }
      else { const j = (await r.json().catch(() => ({}))) as { error?: string }; toast({ variant: "destructive", title: "Xatolik", description: j.error }); }
    } finally { setBusy(null); }
  }

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

  // #13: 2 smenali / oddiy maktab belgisi
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

  // Maktab ichiga kirish: shu maktabni "ko'rilayotgan maktab" qilib tanlaydi (view-school),
  // keyin tegishli sahifaga (Sinflar / Xodimlar / Face ID) o'tadi.
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

  // #5: Obuna uzaytirish / qulflash / cheksiz
  async function extendSub(s: School) {
    const ans = window.prompt(
      `${s.nom} — obuna (PRO):\n• Necha OY uzaytirish (masalan 1, 12)\n• 0 = hoziroq qulflash\n• c = cheksiz (qulf yo'q)`,
      "12",
    );
    if (ans === null) return;
    const v = ans.trim().toLowerCase();
    const body = (v === "c" || v === "cheksiz") ? { unlimited: true } : { months: Number(v) };
    if (!("unlimited" in body) && !Number.isInteger(body.months)) { toast({ variant: "destructive", title: "Oy sonini to'g'ri kiriting (yoki c = cheksiz)" }); return; }
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
    if (!window.confirm(`${s.nom} o'chirilsinmi?\n\nMaktab (barcha o'quvchi/xodim/ma'lumoti bilan) 15 kun ARXIVDA saqlanadi — shu vaqtda tiklash mumkin. Keyin butunlay o'chadi.`)) return;
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
                    <p className="font-black text-sm truncate">{s.nom}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.tuman} tumani{s.direktor ? ` · ${s.direktor}` : ""}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {s.counts.oquvchi}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.counts.xodim}</span>
                      <span className="flex items-center gap-1"><School className="w-3 h-3" /> {s.counts.sinf}</span>
                    </div>
                    {s.sub && (
                      <p className={`text-[11px] font-bold mt-0.5 ${s.sub.pro_until === null ? "text-emerald-600 dark:text-emerald-300" : !s.sub.active ? "text-rose-500" : s.sub.warn ? "text-amber-600 dark:text-amber-300" : "text-sky-600 dark:text-sky-300"}`}>
                        {s.sub.pro_until === null ? "♾️ Obuna: cheksiz" : !s.sub.active ? "🔒 Obuna tugagan — qulflangan" : `⏳ Obuna: ${s.sub.days_left} kun qoldi`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(s)} disabled={busy === s.id}
                    title={s.is_active ? "Faol" : "Nofaol"}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer ${s.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>
                    {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (s.is_active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />)}
                  </button>
                  <button onClick={() => void toggleSmena(s)} disabled={busy === s.id}
                    title={s.ikki_smena ? "2 smenali maktab (bosilsa — oddiy qilinadi)" : "Oddiy maktab (bosilsa — 2 smenali qilinadi)"}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer ${s.ikki_smena ? "bg-violet-500/15 text-violet-600 dark:text-violet-300" : "bg-slate-500/15 text-slate-400"}`}>
                    {s.ikki_smena ? "2-smena" : "1-smena"}
                  </button>
                  <button onClick={() => openDirector(s)} className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300 cursor-pointer" title="Direktor biriktirish"><UserPlus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => void extendSub(s)} disabled={busy === s.id} className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300 cursor-pointer" title="Obuna (PRO): uzaytirish / qulflash / cheksiz"><CreditCard className="w-3.5 h-3.5" /></button>
                  <button onClick={() => startEdit(s)} className="p-2 rounded-lg bg-secondary cursor-pointer" title="Tahrirlash"><Pencil className="w-3.5 h-3.5" /></button>
                  {s.id !== 3 && (
                    <button onClick={() => remove(s)} disabled={busy === s.id} className="p-2 rounded-lg bg-rose-500/15 text-rose-500 cursor-pointer" title="O'chirish"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              {/* Maktab ichiga kirish — shu maktabning sinflari / xodimlari / Face ID */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                <button onClick={() => void enterSchool(s.id, "/classes")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer">
                  <School className="w-3.5 h-3.5" /> Sinflar
                </button>
                <button onClick={() => void enterSchool(s.id, "/staff")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer">
                  <Users className="w-3.5 h-3.5" /> Xodimlar
                </button>
                <button onClick={() => void enterSchool(s.id, "/faceid")} disabled={busy === s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer">
                  <ScanFace className="w-3.5 h-3.5" /> Face ID
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Hali maktab yo'q.</div>}
        </div>
      )}

      {/* #4: ARXIV — o'chirilgan maktablar (15 kun ichida tiklash mumkin) */}
      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-2">
            <Trash2 className="w-3.5 h-3.5" /> Arxiv — o'chirilgan maktablar
          </p>
          {archived.map((a) => (
            <div key={a.id} className="p-3.5 rounded-2xl border border-dashed border-rose-400/40 bg-rose-500/5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{a.nom}</p>
                <p className="text-[11px] text-rose-500 font-bold">
                  {a.purge_in_days > 0 ? `${a.purge_in_days} kundan keyin butunlay o'chadi` : "Yaqinda butunlay o'chadi"}
                </p>
              </div>
              <button onClick={() => void restore(a.id)} disabled={busy === a.id}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold text-xs cursor-pointer shrink-0 flex items-center gap-1.5">
                {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Tiklash
              </button>
            </div>
          ))}
        </div>
      )}

      {/* DIREKTOR BIRIKTIRISH OYNASI */}
      {dirFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDirector}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-600" /> {dirFor.nom} — direktor biriktirish</p>
              <button onClick={closeDirector} className="p-1.5 rounded-lg bg-secondary cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {!dirCreds ? (
              <>
                <p className="text-[12px] text-muted-foreground">Direktorning ism-familiyasini kiriting. Login, parol va 5 xonali ID avtomatik yaratiladi. Direktor shu bilan kirib, <b>o'z maktabini</b> boshqaradi.</p>
                <input value={dirName} autoFocus
                  onChange={(e: { target: { value: string } }) => setDirName(e.target.value)}
                  placeholder="masalan: Aliyev Vali"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold focus:outline-none focus:border-primary" />
                <button onClick={assignDirector} disabled={dirSaving}
                  className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {dirSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Yaratish
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-muted-foreground">Direktor yaratildi ✅ Bu ma'lumotlarni direktorga bering — oyna yopilgach parol qayta ko'rsatilmaydi.</p>
                <div className="rounded-xl border border-border bg-secondary/50 divide-y divide-border">
                  <CredRow label="Login" value={dirCreds.login} />
                  <CredRow label="Parol" value={dirCreds.password} />
                  <CredRow label="5 xonali ID" value={dirCreds.login_id} />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><KeyRound className="w-3 h-3" /> Direktor shu login+parol yoki 5 xonali ID bilan tizimga kiradi.</p>
                <button onClick={closeDirector} className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm cursor-pointer">Yopish</button>
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
      <span className="text-[11px] font-bold text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="flex-1 min-w-0 font-mono font-black text-sm break-all">{value}</span>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* jim */ } }}
        className="p-1.5 rounded-lg bg-secondary cursor-pointer shrink-0" title="Nusxa olish">
        {done ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
