import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, CalendarClock, Check, Trash2, Loader2, Info, ListChecks,
  Users, HelpCircle, Coins, Eye, EyeOff,
} from "lucide-react";
import {
  loadAdminRegions, setRegion, loadStats,
  type AdminRegion, type SayohatStats,
} from "@/lib/sayohat-progress";
import { useAuth } from "@/lib/use-auth";

const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

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

  const [regions, setRegions] = useState<AdminRegion[]>([]);
  const [stats, setStats] = useState<SayohatStats | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [rs, st] = await Promise.all([loadAdminRegions(), loadStats()]);
    setRegions(rs);
    setStats(st);
    const v: Record<string, string> = {};
    for (const r of rs) v[r.id] = toInput(r.unlock_at);
    setVals(v);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  function flashOk(id: string) {
    setOkId(id);
    window.setTimeout(() => setOkId((c) => (c === id ? null : c)), 1800);
  }

  async function saveTime(id: string) {
    const v = vals[id];
    if (!v) return;
    setBusy(id);
    const ok = await setRegion(id, { unlock_at: new Date(v).toISOString() });
    setBusy(null);
    if (ok) { await refresh(); flashOk(id); }
  }
  async function clearTime(id: string) {
    setBusy(id);
    const ok = await setRegion(id, { unlock_at: null });
    setBusy(null);
    if (ok) { await refresh(); flashOk(id); }
  }
  async function toggleActive(id: string, next: boolean) {
    setBusy(id);
    const ok = await setRegion(id, { is_active: next });
    setBusy(null);
    if (ok) { await refresh(); flashOk(id); }
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Sayohat — boshqaruv
          </p>
          <h1 className="text-xl font-extrabold tracking-tight">Viloyatlar va statistika</h1>
        </div>
        <Link href="/sayohat">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-bold cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" /> Xarita
          </button>
        </Link>
      </div>

      {/* Savol boshqaruviga o'tish */}
      <Link href="/sayohat/admin/savollar">
        <button className="w-full flex items-center justify-between gap-2 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-500/15 to-violet-500/10 border border-fuchsia-500/30 cursor-pointer active:scale-[0.99] transition-all">
          <span className="flex items-center gap-2 font-black text-sm"><ListChecks className="w-5 h-5 text-fuchsia-400" /> Savollarni boshqarish</span>
          <span className="text-xs text-muted-foreground">qo'shish / tahrirlash / o'chirish →</span>
        </button>
      </Link>

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl border border-border bg-card text-center">
            <Users className="w-4 h-4 mx-auto text-sky-400" />
            <p className="text-lg font-black mt-1">{stats.players}</p>
            <p className="text-[10px] text-muted-foreground font-bold">O'yinchi</p>
          </div>
          <div className="p-3 rounded-2xl border border-border bg-card text-center">
            <HelpCircle className="w-4 h-4 mx-auto text-fuchsia-400" />
            <p className="text-lg font-black mt-1">{stats.questions}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Savol</p>
          </div>
          <div className="p-3 rounded-2xl border border-border bg-card text-center">
            <Coins className="w-4 h-4 mx-auto text-yellow-400" />
            <p className="text-lg font-black mt-1">{stats.coins}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Tanga</p>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-200 text-xs leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          Vaqt belgilansa — viloyat <b>o'sha vaqtdan keyin</b> hamma o'quvchiga ochiladi. Belgilanmasa — <b>oddiy tartibda</b> (oldingisi yakunlangach). «Ko'rinmasin» — viloyat o'quvchiga umuman chiqmaydi.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {regions.map((r) => {
            const isSaving = busy === r.id;
            const isOk = okId === r.id;
            const fin = stats?.per_region.find((x) => x.region_id === r.id)?.finishers ?? 0;
            return (
              <div key={r.id} className={`p-3.5 rounded-2xl border bg-card space-y-2.5 ${r.is_active ? "border-border" : "border-border/40 opacity-70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{r.order_index + 1}. {r.title}</p>
                    <p className="text-[11px] font-semibold truncate">
                      {r.unlock_at
                        ? <span className="text-amber-400">📅 {fmt(r.unlock_at)}</span>
                        : <span className="text-muted-foreground">Jadval bo'yicha</span>}
                      <span className="text-muted-foreground"> · {r.questions} savol · {fin} tugatgan</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOk && <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />}
                    <button
                      onClick={() => toggleActive(r.id, !r.is_active)}
                      disabled={isSaving}
                      title={r.is_active ? "Ko'rinmasin" : "Ko'rinsin"}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 ${r.is_active ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-slate-500/15 text-slate-300 border border-slate-500/30"}`}
                    >
                      {r.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={vals[r.id] ?? ""}
                    onChange={(e: { target: { value: string } }) => setVals((v) => ({ ...v, [r.id]: e.target.value }))}
                    className="flex-1 min-w-[170px] px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => saveTime(r.id)}
                    disabled={isSaving || !vals[r.id]}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Saqlash
                  </button>
                  {r.unlock_at && (
                    <button
                      onClick={() => clearTime(r.id)}
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

      {/* Eng faol o'yinchilar */}
      {stats && stats.top.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">🏆 Eng faol o'yinchilar</p>
          <div className="space-y-1">
            {stats.top.slice(0, 10).map((t, i) => (
              <div key={t.user_id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <span className="font-bold truncate">{i + 1}. {t.user_id}</span>
                <span className="text-muted-foreground shrink-0">{t.completed} viloyat · <b className="text-yellow-400">{t.total_score}</b> tanga</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
