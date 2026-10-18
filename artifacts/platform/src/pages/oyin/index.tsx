import { useEffect, useState } from "react";
import { api } from "@/lib/face";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Coins, ArrowUp, Check } from "lucide-react";

// Maktab Olami — Lords Mobile uslubidagi "kuchaytirish" o'yini.
// Urush yo'q: tangalarга maktab binolarini va o'z qahramoningni kuchaytirasan.
// Tangalar platformaning umumiy balansidan (baho/bonus) olinadi va shu yerda sarflanadi.

type Building = { key: string; name: string; emoji: string; level: number; max: number; next_cost: number | null };
type Avatar = { id: string; name: string; emoji: string };
type GameState = { total: number; buildings: Building[]; avatar: string; avatars: Avatar[] };

export default function MaktabOlami() {
  const { toast } = useToast();
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try { setState(await api<GameState>("/tanga/game")); }
    catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line

  const upgrade = async (b: Building) => {
    if (!state || b.next_cost == null || busy) return;
    if (state.total < b.next_cost) { toast({ variant: "destructive", title: "Tanga yetmaydi", description: `Kerak: ${b.next_cost} 🪙` }); return; }
    setBusy(b.key);
    try {
      const r = await api<{ level: number; total: number; next_cost: number | null }>("/tanga/game/upgrade", {
        method: "POST", body: JSON.stringify({ key: b.key }),
      });
      setState((s) => s ? {
        ...s, total: r.total,
        buildings: s.buildings.map((x) => x.key === b.key ? { ...x, level: r.level, next_cost: r.next_cost } : x),
      } : s);
      toast({ title: `${b.emoji} ${b.name} → ${r.level}-daraja!` });
    } catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const chooseAvatar = async (id: string) => {
    if (!state || busy) return;
    setBusy("avatar");
    try {
      await api("/tanga/game/avatar", { method: "POST", body: JSON.stringify({ avatar: id }) });
      setState((s) => s ? { ...s, avatar: id } : s);
    } catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setBusy(null); }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }
  if (!state) {
    return <div className="p-6 text-center text-muted-foreground">O'yin yuklanmadi. Bu sahifa faqat o'quvchilar uchun.</div>;
  }

  const hero = state.buildings.find((b) => b.key === "qahramon");
  const heroLevel = hero?.level ?? 0;
  const curAvatar = state.avatars.find((a) => a.id === state.avatar) ?? state.avatars[0];

  return (
    <div className="space-y-5 pb-10">
      {/* Sarlavha + balans */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-600/90 via-violet-700/80 to-slate-900 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">🏰 Maktab Olami</h1>
            <p className="text-sm text-white/70">Binolarni va qahramoningni kuchaytir!</p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/25 rounded-full px-4 py-2 font-bold">
            <Coins className="w-5 h-5 text-amber-300" /> {state.total}
          </div>
        </div>
      </div>

      {/* Qahramon + avatar tanlash */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-5xl">
            {curAvatar?.emoji ?? "🦸"}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{curAvatar?.name ?? "Qahramon"}</div>
            <div className="text-sm text-muted-foreground">Qahramon darajasi: <b className="text-foreground">Lv {heroLevel}</b></div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1.5">Avatar tanla:</div>
          <div className="flex flex-wrap gap-2">
            {state.avatars.map((a) => (
              <button key={a.id} onClick={() => void chooseAvatar(a.id)} disabled={busy === "avatar"}
                className={`relative w-12 h-12 rounded-xl text-2xl flex items-center justify-center border transition ${a.id === state.avatar ? "border-primary bg-primary/15" : "border-border hover:bg-accent"}`}>
                {a.emoji}
                {a.id === state.avatar && <Check className="w-3.5 h-3.5 absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Binolar */}
      <div className="grid grid-cols-2 gap-3">
        {state.buildings.map((b) => {
          const maxed = b.next_cost == null;
          const afford = b.next_cost != null && state.total >= b.next_cost;
          return (
            <div key={b.key} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
              <div className="text-4xl text-center mb-1">{b.emoji}</div>
              <div className="font-bold text-center text-sm leading-tight min-h-[34px] flex items-center justify-center">{b.name}</div>
              <div className="text-xs text-center text-muted-foreground mb-2">Daraja {b.level} / {b.max}</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(b.level / b.max) * 100}%` }} />
              </div>
              <button
                onClick={() => void upgrade(b)}
                disabled={maxed || !afford || busy === b.key}
                className={`mt-auto rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition
                  ${maxed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : afford ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-muted text-muted-foreground"}`}>
                {busy === b.key ? <Loader2 className="w-4 h-4 animate-spin" />
                  : maxed ? <>✅ Maks</>
                    : <><ArrowUp className="w-4 h-4" /> {b.next_cost} <Coins className="w-4 h-4 text-amber-400" /></>}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tangalarni darsда yaxshi baho olib, faol bo'lib yig'asan. Ularni shu yerда — binolaringga sarfla!
      </p>
    </div>
  );
}
