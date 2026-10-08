import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, Settings, Check, Lock, Clock3, Coins, Trophy, Pencil, CalendarClock } from "lucide-react";
import {
  REGIONS, CHARACTERS, DIFFICULTIES, isPlayable,
  type Difficulty, type Souvenir,
} from "./sayohatData";
import {
  loadState, saveState, loadUnlocks, DEFAULT_STATE,
  type SayohatState, type UnlockMap,
} from "@/lib/sayohat-progress";
import { Avatar, SceneBg, StarRow, sayohatStyles } from "./_shared";
import { playSound } from "@/lib/game-sounds";
import { useAuth } from "@/lib/use-auth";

const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

/** Sanani qisqa ko'rinishda: "05.11 09:00" */
function fmtUnlock(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const SORTED = [...REGIONS].sort((a, b) => a.order - b.order);
const SOUVENIR_BY_ID: Record<string, Souvenir> = Object.fromEntries(
  REGIONS.map((r) => [r.souvenir.id, r.souvenir] as [string, Souvenir]),
);

export default function SayohatIndex() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isMgmt = !!user && MGMT_ROLES.includes(user.role);
  const [state, setState] = useState<SayohatState | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockMap>({});
  const [showWizard, setShowWizard] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadState(), loadUnlocks()]).then(([s, u]) => {
      if (!alive) return;
      setState(s);
      setUnlocks(u);
      if (!s.character) setShowWizard(true);
    });
    return () => { alive = false; };
  }, []);

  function flashMsg(m: string) {
    setFlash(m);
    window.setTimeout(() => setFlash((cur) => (cur === m ? null : cur)), 2600);
  }

  async function commitWizard(next: Pick<SayohatState, "character" | "name" | "difficulty">) {
    const base = state ?? { ...DEFAULT_STATE };
    const updated: SayohatState = { ...base, ...next };
    setState(updated);
    setShowWizard(false);
    playSound("win");
    await saveState(updated);
  }

  if (!state) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----- Xarakter tanlash / sozlamalar oynasi -----
  if (showWizard) {
    return (
      <>
        <style>{sayohatStyles}</style>
        <Wizard
          initial={state}
          firstTime={!state.character}
          onDone={commitWizard}
          onCancel={state.character ? () => setShowWizard(false) : undefined}
        />
      </>
    );
  }

  // ----- XARITA HUB -----
  const completed = (id: string) => (state.stars[id] ?? 0) >= 1;

  // Admin belgilagan vaqt darvozasi: "open" (vaqt o'tgan) | "locked" (hali kelmagan) | "none"
  const timeGate = (id: string): "open" | "locked" | "none" => {
    const iso = unlocks[id];
    if (!iso) return "none";
    return Date.now() >= new Date(iso).getTime() ? "open" : "locked";
  };
  const unlocked = (order: number) => {
    const r = SORTED[order]!;
    const g = timeGate(r.id);
    if (g === "open") return true;      // admin ochdi (vaqt o'tdi)
    if (g === "locked") return false;   // vaqt hali kelmagan
    return order === 0 || completed(SORTED[order - 1]!.id); // jadval tartibi
  };
  const current = SORTED.find((r) => unlocked(r.order) && !completed(r.id)) ?? SORTED[SORTED.length - 1]!;
  const char = CHARACTERS.find((c) => c.id === state.character)!;
  const diff = DIFFICULTIES.find((d) => d.id === state.difficulty)!;

  const totalStars = Object.values(state.stars).reduce((a, b) => a + b, 0);
  const doneCount = SORTED.filter((r) => completed(r.id)).length;

  function onNode(order: number) {
    const r = SORTED[order]!;
    if (!unlocked(order)) {
      playSound("wrong");
      const iso = unlocks[r.id];
      if (iso && timeGate(r.id) === "locked") {
        flashMsg(`📅 «${r.name}» ${fmtUnlock(iso)} da ochiladi`);
      } else {
        flashMsg(`🔒 Avval «${SORTED[order - 1]!.name}» manzilini yakunlang`);
      }
      return;
    }
    if (!isPlayable(r, state!.difficulty)) {
      playSound("click");
      flashMsg(`⏳ «${r.name}» uchun topshiriqlar tez kunda qo'shiladi`);
      return;
    }
    playSound("click");
    setLocation(`/sayohat/${r.id}`);
  }

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      <style>{sayohatStyles}</style>

      {/* Sarlavha + sozlamalar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-fuchsia-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Ta'limiy sarguzasht
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">Bek va Lola: Sayohat</h1>
          <p className="text-muted-foreground text-xs mt-0.5">O'zbekiston bo'ylab sayohat — bilim to'plang, tanga yuting!</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isMgmt && (
            <button
              onClick={() => { playSound("click"); setLocation("/sayohat/admin"); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer active:scale-95 transition-all"
            >
              <CalendarClock className="w-4 h-4" /> <span className="hidden sm:inline">Ochish vaqtlari</span>
            </button>
          )}
          <button
            onClick={() => { playSound("click"); setShowWizard(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-bold cursor-pointer active:scale-95 transition-all"
          >
            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Sozlamalar</span>
          </button>
        </div>
      </div>

      {/* O'yinchi paneli */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-gradient-to-r from-violet-950/30 via-fuchsia-950/20 to-card">
        <div className="shrink-0 s-floaty"><Avatar character={char.id} size={54} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-base truncate">{state.name || char.defaultName}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: diff.color, borderColor: `${diff.color}66`, background: `${diff.color}1a` }}>
              {diff.emoji} {diff.title}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1 text-amber-400"><Trophy className="w-3.5 h-3.5" /> {totalStars} ⭐</span>
            <span className="flex items-center gap-1 text-emerald-400">🏁 {doneCount}/{SORTED.length}</span>
            <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3.5 h-3.5" /> {state.tangaEarned}</span>
          </div>
        </div>
      </div>

      {/* XARITA */}
      <div className="relative w-full rounded-3xl border border-border overflow-hidden shadow-xl h-[440px] sm:h-[540px]">
        <SceneBg color="#3b2a6b" accent="#8b5cf6" />

        {/* Sayohat yo'li (chiziq) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={SORTED.map((r) => `${r.x},${r.y}`).join(" ")}
            fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.6"
            strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 2 }}
          />
        </svg>

        {/* Manzil tugunlari */}
        {SORTED.map((r) => {
          const isDone = completed(r.id);
          const isOpen = unlocked(r.order);
          const isCurrent = r.id === current.id && !isDone;
          const playable = isPlayable(r, state.difficulty);
          const stars = state.stars[r.id] ?? 0;
          const timeLocked = timeGate(r.id) === "locked";

          let ring = "border-white/30 bg-slate-800/80 text-white/60";
          if (isDone) ring = "border-emerald-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white";
          else if (isOpen && playable) ring = "border-white/70 bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white";
          else if (isOpen && !playable) ring = "border-amber-300/60 bg-amber-500/20 text-amber-200";

          return (
            <button
              key={r.id}
              onClick={() => onNode(r.order)}
              className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${isCurrent ? "s-node-live" : ""}`}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              title={r.name}
            >
              <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center text-lg shadow-lg ${ring}`}>
                <span>{r.emoji}</span>
                {!isOpen && (
                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-slate-900 border border-white/30 flex items-center justify-center">
                    {timeLocked ? <CalendarClock className="w-2.5 h-2.5 text-amber-300" /> : <Lock className="w-2.5 h-2.5 text-white/70" />}
                  </span>
                )}
                {isDone && (
                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-emerald-600 border border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </span>
                )}
                {isOpen && !playable && !isDone && (
                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-amber-600 border border-white/50 flex items-center justify-center">
                    <Clock3 className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>

              {/* nom + yulduz */}
              <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/45 backdrop-blur-sm flex flex-col items-center">
                <span className="text-[8.5px] sm:text-[9px] font-bold text-white whitespace-nowrap leading-tight">{r.name}</span>
                {isDone && <div className="scale-[0.6] -my-0.5"><StarRow value={stars} size={12} /></div>}
                {timeLocked && unlocks[r.id] && (
                  <span className="text-[7.5px] font-bold text-amber-300 whitespace-nowrap leading-tight">📅 {fmtUnlock(unlocks[r.id]!)}</span>
                )}
              </div>

              {/* joriy manzilda xarakter turadi */}
              {isCurrent && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 s-bobble pointer-events-none">
                  <Avatar character={char.id} size={30} wave />
                </div>
              )}
            </button>
          );
        })}

        {/* flash xabar */}
        {flash && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 s-rise px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur text-white text-xs font-bold text-center max-w-[90%]">
            {flash}
          </div>
        )}
      </div>

      {/* Esdaliklar javonchasi */}
      <div className="p-4 rounded-2xl border border-border bg-card">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
          🎁 Esdaliklar to'plami ({state.souvenirs.length}/{SORTED.length})
        </p>
        {state.souvenirs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Hali esdalik yo'q. Viloyatni yakunlab, birinchi esdalikni qo'lga kiriting!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.souvenirs.map((sid) => {
              const s = SOUVENIR_BY_ID[sid];
              if (!s) return null;
              return (
                <div key={sid} className="s-pop flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary border border-border/60" title={s.name}>
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-[11px] font-bold">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  Xarakter tanlash / sozlamalar sehrgari
// ============================================================
function Wizard({
  initial,
  firstTime,
  onDone,
  onCancel,
}: {
  initial: SayohatState;
  firstTime: boolean;
  onDone: (v: Pick<SayohatState, "character" | "name" | "difficulty">) => void;
  onCancel?: () => void;
}) {
  const [picked, setPicked] = useState<"bek" | "lola" | null>(initial.character);
  const [name, setName] = useState(initial.name);
  const [diff, setDiff] = useState<Difficulty>(initial.difficulty);

  function pick(id: "bek" | "lola") {
    playSound("click");
    setPicked(id);
    if (!name.trim()) {
      const c = CHARACTERS.find((x) => x.id === id)!;
      setName(c.defaultName);
    }
  }

  const canStart = !!picked && name.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="text-center">
        <p className="text-[11px] font-bold text-fuchsia-500/80 uppercase tracking-widest mb-1">
          {firstTime ? "Sayohatga tayyormisiz?" : "Sozlamalar"}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Qahramoningizni tanlang</h1>
        <p className="text-muted-foreground text-xs mt-1">Ismini o'zgartirishingiz va darajani tanlashingiz mumkin</p>
      </div>

      {/* Qahramonlar */}
      <div className="grid grid-cols-2 gap-3">
        {CHARACTERS.map((c) => {
          const sel = picked === c.id;
          return (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className={`relative p-5 rounded-3xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all overflow-hidden ${
                sel ? "border-fuchsia-400 shadow-xl scale-[1.02]" : "border-border hover:border-fuchsia-400/40"
              }`}
              style={{ background: sel ? `${c.color}1f` : undefined }}
            >
              <div className={sel ? "s-bobble" : ""}><Avatar character={c.id} size={92} wave={sel} /></div>
              <span className="font-black text-base">{c.defaultName}</span>
              {sel && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ism */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Qahramon ismi
        </label>
        <input
          value={name}
          onChange={(e: { target: { value: string } }) => setName(e.target.value.slice(0, 20))}
          placeholder="Masalan: Bek, Lola yoki o'z ismingiz"
          className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm font-bold focus:outline-none focus:border-fuchsia-400 transition-all"
        />
      </div>

      {/* Daraja */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">Qiyinlik darajasi</p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => {
            const sel = diff === d.id;
            return (
              <button
                key={d.id}
                onClick={() => { playSound("click"); setDiff(d.id); }}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center cursor-pointer transition-all ${
                  sel ? "scale-[1.03] shadow-lg" : "border-border hover:border-border/80"
                }`}
                style={{ borderColor: sel ? d.color : undefined, background: sel ? `${d.color}1a` : undefined }}
              >
                <span className="text-2xl">{d.emoji}</span>
                <span className="font-black text-sm mt-1">{d.title}</span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{d.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tugmalar */}
      <div className="flex gap-2.5">
        {onCancel && (
          <button onClick={() => { playSound("click"); onCancel(); }} className="px-5 py-3.5 rounded-2xl bg-secondary font-bold text-sm cursor-pointer">
            Bekor qilish
          </button>
        )}
        <button
          disabled={!canStart}
          onClick={() => canStart && onDone({ character: picked, name: name.trim(), difficulty: diff })}
          className="flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {firstTime ? "🚀 Sayohatni boshlash" : "Saqlash"}
        </button>
      </div>
    </div>
  );
}
