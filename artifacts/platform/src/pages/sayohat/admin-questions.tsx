import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, Check, X, Save, ListChecks,
} from "lucide-react";
import { REGIONS, DIFFICULTIES, type Difficulty } from "./sayohatData";
import {
  loadAdminQuestions, createQuestion, updateQuestion, deleteQuestion,
  type AdminQuestion, type QuestionInput,
} from "@/lib/sayohat-progress";
import { useAuth } from "@/lib/use-auth";
import { toast } from "@/hooks/use-toast";

const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];
const SORTED = [...REGIONS].sort((a, b) => a.order - b.order);

function emptyForm(regionId: string): QuestionInput {
  return {
    region_id: regionId,
    difficulty: "oson",
    question_text: "",
    options: ["", ""],
    correct_index: 0,
    explanation: "",
    hint: "",
    points: 10,
    is_active: true,
  };
}

const DIFF_LABEL: Record<Difficulty, string> = { oson: "🌱 Oson", orta: "⚡ O'rta", qiyin: "🔥 Qiyin" };

export default function SayohatAdminQuestions() {
  const { user } = useAuth();
  const allowed = !!user && MGMT_ROLES.includes(user.role);

  const [regionId, setRegionId] = useState<string>(SORTED[0]!.id);
  const [list, setList] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuestionInput | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null); // null = yangi
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);

  async function refresh(rid: string) {
    setLoading(true);
    const qs = await loadAdminQuestions(rid);
    setList(qs);
    setLoading(false);
  }

  useEffect(() => { void refresh(regionId); }, [regionId]);

  function startNew() {
    setEditingId(null);
    setEditing(emptyForm(regionId));
  }
  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    const { id: _id, ...rest } = q;
    void _id;
    setEditing({ ...rest });
  }
  function cancel() { setEditing(null); setEditingId(null); }

  async function save() {
    if (!editing) return;
    // Tekshiruv
    const opts = editing.options.map((o) => o.trim());
    if (!editing.question_text.trim()) { toast({ variant: "destructive", title: "Savol matni bo'sh" }); return; }
    if (opts.length < 2 || opts.some((o) => !o)) { toast({ variant: "destructive", title: "Kamida 2 ta to'liq variant kerak" }); return; }
    if (editing.correct_index >= opts.length) { toast({ variant: "destructive", title: "To'g'ri variantni tanlang" }); return; }

    const payload: QuestionInput = { ...editing, options: opts, region_id: regionId };
    setSaving(true);
    const res = editingId == null ? await createQuestion(payload) : await updateQuestion(editingId, payload);
    setSaving(false);
    if (res.ok) {
      toast({ title: editingId == null ? "Savol qo'shildi" : "Saqlandi" });
      cancel();
      await refresh(regionId);
    } else {
      toast({ variant: "destructive", title: "Xatolik", description: res.error });
    }
  }

  async function remove(id: number) {
    setDelId(id);
    const ok = await deleteQuestion(id);
    setDelId(null);
    if (ok) { toast({ title: "O'chirildi" }); await refresh(regionId); }
    else toast({ variant: "destructive", title: "O'chirib bo'lmadi" });
  }

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">Bu sahifa faqat rahbariyat uchun.</p>
        <Link href="/sayohat"><button className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold">Orqaga</button></Link>
      </div>
    );
  }

  const byDiff = (d: Difficulty) => list.filter((q) => q.difficulty === d);

  return (
    <div className="max-w-2xl space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-fuchsia-400/80 uppercase tracking-widest mb-1 flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" /> Sayohat — savollar
          </p>
          <h1 className="text-xl font-extrabold tracking-tight">Savollarni boshqarish</h1>
        </div>
        <Link href="/sayohat/admin">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-bold cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" /> Boshqaruv
          </button>
        </Link>
      </div>

      {/* Viloyat tanlash */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={regionId}
          onChange={(e: { target: { value: string } }) => { cancel(); setRegionId(e.target.value); }}
          className="flex-1 min-w-[180px] px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold focus:outline-none focus:border-fuchsia-400"
        >
          {SORTED.map((r) => <option key={r.id} value={r.id}>{r.order + 1}. {r.name}</option>)}
        </select>
        {!editing && (
          <button onClick={startNew}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Yangi savol
          </button>
        )}
      </div>

      {/* FORMA (qo'shish / tahrirlash) */}
      {editing && (
        <QuestionForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          isNew={editingId == null}
        />
      )}

      {/* RO'YXAT */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Bu viloyatda hali savol yo'q. «Yangi savol» tugmasi orqali qo'shing.
        </div>
      ) : (
        <div className="space-y-4">
          {DIFFICULTIES.map((d) => {
            const qs = byDiff(d.id);
            if (qs.length === 0) return null;
            return (
              <div key={d.id} className="space-y-2">
                <p className="text-xs font-black px-1" style={{ color: d.color }}>{d.emoji} {d.title} ({qs.length})</p>
                {qs.map((q) => (
                  <div key={q.id} className={`p-3.5 rounded-2xl border bg-card ${q.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{q.question_text}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {q.options.map((o, i) => (
                            <span key={i} className={`text-[11px] px-2 py-0.5 rounded-lg border ${i === q.correct_index ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold" : "bg-secondary border-border/50 text-muted-foreground"}`}>
                              {i === q.correct_index ? "✓ " : ""}{o}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{q.points} ball{q.explanation ? ` · 📘 ${q.explanation}` : ""}{!q.is_active ? " · (yashirilgan)" : ""}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => startEdit(q)} className="p-2 rounded-lg bg-secondary cursor-pointer" title="Tahrirlash"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(q.id)} disabled={delId === q.id} className="p-2 rounded-lg bg-rose-500/15 text-rose-300 cursor-pointer" title="O'chirish">
                          {delId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Savol formasi
// ============================================================
function QuestionForm({
  value, onChange, onSave, onCancel, saving, isNew,
}: {
  value: QuestionInput;
  onChange: (v: QuestionInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  function set<K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) { onChange({ ...value, [k]: v }); }

  function setOption(i: number, text: string) {
    const options = [...value.options];
    options[i] = text;
    onChange({ ...value, options });
  }
  function addOption() {
    if (value.options.length >= 6) return;
    onChange({ ...value, options: [...value.options, ""] });
  }
  function removeOption(i: number) {
    if (value.options.length <= 2) return;
    const options = value.options.filter((_, n) => n !== i);
    let correct = value.correct_index;
    if (correct >= options.length) correct = options.length - 1;
    else if (i < correct) correct -= 1;
    onChange({ ...value, options, correct_index: correct });
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-fuchsia-500/40 bg-card space-y-3.5 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="font-black text-sm">{isNew ? "➕ Yangi savol" : "✏️ Savolni tahrirlash"}</p>
        <button onClick={onCancel} className="p-1.5 rounded-lg bg-secondary cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      {/* Daraja + ball */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-bold text-muted-foreground">Daraja</label>
          <select value={value.difficulty}
            onChange={(e: { target: { value: string } }) => set("difficulty", e.target.value as Difficulty)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold focus:outline-none focus:border-fuchsia-400">
            {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
          </select>
        </div>
        <div className="w-24">
          <label className="text-[11px] font-bold text-muted-foreground">Ball</label>
          <input type="number" min={1} max={100} value={value.points}
            onChange={(e: { target: { value: string } }) => set("points", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold focus:outline-none focus:border-fuchsia-400" />
        </div>
      </div>

      {/* Savol matni */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground">Savol matni</label>
        <textarea value={value.question_text}
          onChange={(e: { target: { value: string } }) => set("question_text", e.target.value)}
          rows={2} placeholder="Masalan: Marg'ilon nima bilan mashhur?"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-fuchsia-400 resize-none" />
      </div>

      {/* Variantlar */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground">Variantlar (to'g'risini belgilang)</label>
        <div className="space-y-2 mt-1">
          {value.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => set("correct_index", i)}
                title="To'g'ri javob"
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${value.correct_index === i ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                {value.correct_index === i && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </button>
              <input value={opt}
                onChange={(e: { target: { value: string } }) => setOption(i, e.target.value)}
                placeholder={`${String.fromCharCode(65 + i)} variant`}
                className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-fuchsia-400" />
              {value.options.length > 2 && (
                <button onClick={() => removeOption(i)} className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
        </div>
        {value.options.length < 6 && (
          <button onClick={addOption} className="mt-2 text-xs font-bold text-fuchsia-400 cursor-pointer flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Variant qo'shish
          </button>
        )}
      </div>

      {/* Maslahat + tushuntirish */}
      <div className="grid gap-2">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground">Maslahat (ixtiyoriy)</label>
          <input value={value.hint}
            onChange={(e: { target: { value: string } }) => set("hint", e.target.value)}
            placeholder="O'quvchiga yordam beradigan ishora"
            className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-fuchsia-400" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground">Tushuntirish (javobdan keyin)</label>
          <input value={value.explanation}
            onChange={(e: { target: { value: string } }) => set("explanation", e.target.value)}
            placeholder="To'g'ri javob nega to'g'ri ekanini tushuntiring"
            className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-fuchsia-400" />
        </div>
      </div>

      {/* Faollik */}
      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
        <input type="checkbox" checked={value.is_active}
          onChange={(e: { target: { checked: boolean } }) => set("is_active", e.target.checked)}
          className="w-4 h-4 accent-fuchsia-500" />
        Faol (o'quvchiga ko'rinadi)
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-secondary font-bold text-sm cursor-pointer">Bekor</button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Saqlash
        </button>
      </div>
    </div>
  );
}
