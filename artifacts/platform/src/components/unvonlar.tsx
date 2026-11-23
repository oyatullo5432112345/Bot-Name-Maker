import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Sparkles,
  Flame,
  BrainCircuit,
  Zap,
  BookOpenCheck,
  Award,
  GraduationCap,
  Star,
  Landmark,
  Trophy,
  Mountain,
  Crown,
  CheckCircle2,
  Lock,
} from "lucide-react";

export interface UnvonItem {
  id: string;
  title: string;
  subtitle: string;
  minCoins: number;
  tierName: string;
  icon: LucideIcon;
  grad: string;
  borderGlow: string;
  badgeColor: string;
}

// 13 ta unvon tizimi
export const UNVONLAR: UnvonItem[] = [
  { id: "boshlangich", title: "Boshlang'ich", subtitle: "Ilm va kashfiyotlar yo'liga ilk qadam", minCoins: 0, tierName: "Bronza I", icon: Compass, grad: "from-amber-700 via-orange-600 to-amber-900", borderGlow: "border-amber-600/40", badgeColor: "text-amber-300" },
  { id: "zukko", title: "Zukko", subtitle: "Bilimga chanqoq va tezkor fikrlovchi", minCoins: 30, tierName: "Bronza II", icon: Sparkles, grad: "from-orange-500 via-amber-600 to-stone-800", borderGlow: "border-orange-500/40", badgeColor: "text-orange-300" },
  { id: "intiluvchan", title: "Intiluvchan", subtitle: "Har kuni o'z ustida ishlovchi o'quvchi", minCoins: 80, tierName: "Kumush I", icon: Flame, grad: "from-slate-300 via-slate-500 to-slate-800", borderGlow: "border-slate-400/40", badgeColor: "text-slate-200" },
  { id: "tafakkur_sohibi", title: "Tafakkur Sohibi", subtitle: "Profilda maxsus kumush ramka", minCoins: 150, tierName: "Kumush II", icon: BrainCircuit, grad: "from-cyan-300 via-slate-400 to-slate-700", borderGlow: "border-cyan-300/40", badgeColor: "text-cyan-200" },
  { id: "ilgor", title: "Ilg'or", subtitle: "Reyting jadvalida maxsus nishon", minCoins: 250, tierName: "Zumrad I", icon: Zap, grad: "from-emerald-400 via-teal-600 to-emerald-950", borderGlow: "border-emerald-400/45", badgeColor: "text-emerald-300" },
  { id: "alloma", title: "Alloma", subtitle: "Kitobsevar va chuqur bilim egasi", minCoins: 400, tierName: "Zumrad II", icon: BookOpenCheck, grad: "from-teal-300 via-emerald-500 to-teal-900", borderGlow: "border-teal-400/45", badgeColor: "text-teal-200" },
  { id: "zafarli", title: "Zafarli", subtitle: "Bellashuv va olimpiadalar ishtirokchisi", minCoins: 600, tierName: "Safir I", icon: Award, grad: "from-sky-400 via-blue-600 to-indigo-950", borderGlow: "border-sky-400/50", badgeColor: "text-sky-300" },
  { id: "ustoz_daraja", title: "Ustoz Daraja", subtitle: "Profil atrofida nurli safir halqa", minCoins: 900, tierName: "Safir II", icon: GraduationCap, grad: "from-blue-400 via-indigo-600 to-slate-900", borderGlow: "border-indigo-400/50", badgeColor: "text-indigo-200" },
  { id: "sinf_yetakchisi", title: "Sinf Yetakchisi", subtitle: "Sinfning eng faol va namunali a'zosi", minCoins: 1300, tierName: "Oltin I", icon: Star, grad: "from-yellow-300 via-amber-500 to-yellow-800", borderGlow: "border-amber-400/55", badgeColor: "text-amber-300" },
  { id: "maktab_akademigi", title: "Maktab Akademigi", subtitle: "Maktab Shon-sharaf zaliga kiritilgan", minCoins: 2000, tierName: "Oltin II", icon: Landmark, grad: "from-amber-200 via-yellow-500 to-amber-900", borderGlow: "border-yellow-400/60", badgeColor: "text-yellow-200" },
  { id: "tuman_chempioni", title: "Tuman Chempioni", subtitle: "Tuman miqyosidagi g'oliblik maqomi", minCoins: 3000, tierName: "Yoqut", icon: Trophy, grad: "from-rose-400 via-red-600 to-rose-950", borderGlow: "border-rose-400/60", badgeColor: "text-rose-300" },
  { id: "olimp_choqqisi", title: "Olimp Cho'qqisi", subtitle: "Respublika darajasidagi yuksak natija", minCoins: 5000, tierName: "Olmos", icon: Mountain, grad: "from-fuchsia-400 via-purple-600 to-indigo-950", borderGlow: "border-fuchsia-400/60", badgeColor: "text-fuchsia-200" },
  { id: "buyuk_afsona", title: "Buyuk Afsona", subtitle: "Eng oliy maqom — platforma faxri", minCoins: 8000, tierName: "Qirollik Toji", icon: Crown, grad: "from-amber-200 via-yellow-400 to-rose-600", borderGlow: "border-amber-300/80 shadow-[0_0_25px_rgba(251,191,36,0.3)]", badgeColor: "text-amber-200" },
];

export function getCurrentUnvon(coins: number): { current: UnvonItem; next: UnvonItem | null; progress: number } {
  let currentIndex = 0;
  for (let i = 0; i < UNVONLAR.length; i++) {
    if (coins >= UNVONLAR[i].minCoins) currentIndex = i;
  }
  const current = UNVONLAR[currentIndex];
  const next = UNVONLAR[currentIndex + 1] ?? null;
  if (!next) return { current, next: null, progress: 100 };
  const span = next.minCoins - current.minCoins;
  const earned = Math.max(0, coins - current.minCoins);
  const progress = Math.min(100, Math.round((earned / span) * 100));
  return { current, next, progress };
}

// Yuqoridagi joriy unvon va keyingi unvongacha progress kartasi
export function UnvonSummary({ userCoins = 0 }: { userCoins?: number }) {
  const { current, next, progress } = getCurrentUnvon(userCoins);
  const CurrentIcon = current.icon;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-300/35 bg-gradient-to-br from-[#162447] via-[#0f1a36] to-[#091124] p-4 shadow-xl">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${current.grad} shadow-lg ring-2 ring-white/25`}>
          <CurrentIcon className="h-7 w-7 text-white drop-shadow" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
            Joriy unvoningiz · {current.tierName}
          </span>
          <h2 className="truncate text-xl font-extrabold text-white">{current.title}</h2>
          <p className="truncate text-xs text-slate-300">{current.subtitle}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-amber-300/30 bg-black/30 px-3 py-1.5 text-right">
          <div className="text-[10px] text-slate-400">Balans</div>
          <div className="text-sm font-black text-amber-300 tabular-nums">🪙 {userCoins.toLocaleString("uz-UZ")}</div>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
          {next ? (
            <>
              <span className="text-slate-300">
                Keyingi unvon: <span className="font-bold text-white">{next.title}</span>
              </span>
              <span className="text-amber-300 tabular-nums">{userCoins} / {next.minCoins} 🪙</span>
            </>
          ) : (
            <span className="text-amber-300">Eng yuqori cho'qqiga erishdingiz! 👑</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Barcha 13 ta unvon ro'yxati (yuqorida summary bilan)
export function UnvonlarList({ userCoins = 0 }: { userCoins?: number }) {
  return (
    <div className="space-y-4">
      <UnvonSummary userCoins={userCoins} />

      <div className="px-1 text-center text-xs font-medium text-slate-400">Barcha unvonlar va ularning talablari</div>

      <div className="space-y-2.5">
        {UNVONLAR.map((item) => {
          const Icon = item.icon;
          const unlocked = userCoins >= item.minCoins;
          return (
            <div
              key={item.id}
              className={`relative flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 backdrop-blur-md transition-all ${
                unlocked
                  ? `${item.borderGlow} bg-gradient-to-r from-[#162344]/95 to-[#0e1730]/90`
                  : "border-white/10 bg-[#0c1428]/75 opacity-80"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${unlocked ? item.grad : "from-slate-700 to-slate-900"} shadow-md ring-1 ring-white/20`}>
                  <Icon className={`h-6 w-6 ${unlocked ? "text-white drop-shadow" : "text-slate-400"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-base font-extrabold text-white">{item.title}</h3>
                    <span className={`rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-bold ${item.badgeColor}`}>{item.tierName}</span>
                    {unlocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Qo'lga kiritildi
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-300/85">{item.subtitle}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-base font-black tabular-nums ${unlocked ? "text-amber-300" : "text-amber-400/80"}`}>
                  {item.minCoins.toLocaleString("uz-UZ")}
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-xs">
                  {!unlocked && <Lock className="h-3 w-3 text-slate-400" />}
                  <span>🪙</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
