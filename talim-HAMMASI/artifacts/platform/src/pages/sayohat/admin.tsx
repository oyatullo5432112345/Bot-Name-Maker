import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, CalendarClock, Check, Trash2, Loader2, Info } from "lucide-react";
import { REGIONS } from "./sayohatData";
import { loadUnlocks, setUnlock, type UnlockMap } from "@/lib/sayohat-progress";
import { useAuth } from "@/lib/use-auth";

const SORTED = [...REGIONS].sort((a, b) => a.order - b.order);
const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

// ISO → datetime-local maydoni uchun ("YYYY-MM-DDTHH:MM", mahalliy vaqt)
function toInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SayohatAdmin() {
  const { user } = useAuth();
  const allowed = !!user && MGMT_ROLES.includes(user.role);

  const [saved, setSaved] = useState<UnlockMap>({});
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadUnlocks().then((u) => {
      if (!alive) return;
      setSaved(u);
      const v: Record<string, string> = {};
      for (const r of SORTED) v[r.id] = toInput(u[r.id]);
      setVals(v);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  function flashOk(id: string) {
    setOkId(id);
    window.setTimeout(() => setOkId((c) => (c === id ? null : c)), 1800);
  }

  async function save(id: string) {
    const v = vals[id];
    if (!v) return;
    setBusy(id);
    const iso = new Date(v).toISOString();
    const ok = await setUnlock(id, iso);
    setBusy(null);
    if (ok) { setSaved((s) => ({ ...s, [id]: iso })); flashOk(id); }
  }

  async function clear(id: string) {
    setBusy(id);
    const ok = await setUnlock(id, null);
    setBusy(null);
    if (ok) {
      setSaved((s) => ({ ...s, [id]: null }));
      setVals((v) => ({ ...v, [id]: "" }));
      flashOk(id);
    }
  }

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">Bu sahifa faqat rahbariyat uchun.</p>
        <Link href="/sayohat"><button className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold">Orqaga</button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5 pb-10">
      {/* sarlavha */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Sayohat — boshqaruv
          </p>
          <h1 className="text-xl font-extrabold tracking-tight">Viloyat ochilish vaqtlari</h1>
        </div>
        <Link href="/sayohat">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-bold cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" /> Xarita
          </button>
        </Link>
      </div>

      {/* tushuntirish */}
      <div className="flex gap-2.5 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-200 text-xs leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          Vaqt belgilansa — viloyat <b>o'sha vaqtdan keyin</b> hamma o'quvchiga ochiladi (o'tgan manzilni tugatish shart emas).
          Vaqt belgilanmasa — viloyat <b>oddiy tartibda</b> (oldingisini yakunlagach) ochiladi.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {SORTED.map((r) => {
            const cur = saved[r.id];
            const isSaving = busy === r.id;
            const isOk = okId === r.id;
            return (
              <div key={r.id} className="p-3.5 rounded-2xl border border-border bg-card space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-lg shrink-0">{r.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{r.order + 1}. {r.name}</p>
                      <p className="text-[11px] font-semibold truncate">
                        {cur
                          ? <span className="text-amber-400">📅 Ochiladi: {fmt(cur)}</span>
                          : <span className="text-muted-foreground">Jadval bo'yicha (oldingisi yakunlansa)</span>}
                      </p>
                    </div>
                  </div>
                  {isOk && <Check className="w-5 h-5 text-emerald-400 shrink-0" strokeWidth={3} />}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={vals[r.id] ?? ""}
                    onChange={(e: { target: { value: string } }) => setVals((v) => ({ ...v, [r.id]: e.target.value }))}
                    className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => save(r.id)}
                    disabled={isSaving || !vals[r.id]}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Saqlash
                  </button>
                  {cur && (
                    <button
                      onClick={() => clear(r.id)}
                      disabled={isSaving}
                      className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Tozalash
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
