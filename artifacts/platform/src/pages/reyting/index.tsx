// Reyting — tanga bo'yicha Top 100 va Sovg'alar (hozircha bo'sh).
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Gift, Crown, Medal, Loader2 } from "lucide-react";
import { api } from "@/lib/face";
import { useAuth } from "@/lib/use-auth";

interface RatingUser {
  id: string | number;
  name: string;
  role?: string;
  class_name?: string;
  coins: number;
  rank: number;
}

interface RatingResponse {
  me?: { rank: number; coins: number; name?: string };
  top: RatingUser[];
}

export default function ReytingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"reyting" | "sovgalar">("reyting");
  const [data, setData] = useState<RatingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<RatingResponse>("/tanga/reyting?limit=100");
        if (!cancelled) setData(res);
      } catch {
        // Xatolik bo'lsa o'rin ko'rsatilmaydi (soxta o'rin berilmaydi)
        if (!cancelled) setData({ me: undefined, top: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.full_name]);

  const topList = (data?.top ?? []).slice(0, 100);
  const myRank = data?.me?.rank;
  const myCoins = data?.me?.coins ?? 0;

  return (
    <div className="relative z-10 mx-auto max-w-2xl space-y-5 pb-12 text-white">
      <div className="flex items-center justify-between">
        <Link href="/intellektual" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> O'yinlarga qaytish
        </Link>
      </div>

      {/* 2 ta yonma-yon bo'lim */}
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-[#0d1834]/90 p-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("reyting")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition-all ${
            activeTab === "reyting" ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Reyting</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sovgalar")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition-all ${
            activeTab === "sovgalar" ? "bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-lg" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Sovg'alar</span>
        </button>
      </div>

      {activeTab === "reyting" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-500/20 via-[#152347] to-[#0f1b38] p-4 shadow-md">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">Sizning natijangiz</div>
              <div className="mt-0.5 text-lg font-extrabold text-white">
                {myRank ? (
                  <>
                    Siz <span className="text-amber-300">{myRank}-o'rindasiz</span>
                  </>
                ) : (
                  "Sizning o'rningiz hisoblanmoqda"
                )}
              </div>
            </div>
            <div className="rounded-xl border border-amber-300/40 bg-black/30 px-3.5 py-2 text-right">
              <div className="text-[11px] text-slate-300">Tangangiz</div>
              <div className="text-base font-black text-amber-300 tabular-nums">🪙 {myCoins}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
            </div>
          ) : topList.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1834]/80 p-8 text-center text-sm text-slate-400">
              Hozircha reyting ma'lumotlari yuklanmadi
            </div>
          ) : (
            <div className="space-y-2">
              {topList.map((item, index) => {
                const pos = item.rank || index + 1;
                return (
                  <div
                    key={item.id ?? index}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 backdrop-blur-md ${
                      pos === 1 ? "border-amber-300/60 bg-amber-500/15"
                        : pos === 2 ? "border-slate-300/40 bg-slate-400/10"
                        : pos === 3 ? "border-orange-400/40 bg-orange-500/10"
                        : "border-white/10 bg-[#0d1834]/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
                        {pos === 1 ? <Crown className="h-5 w-5 text-amber-300" />
                          : pos <= 3 ? <Medal className={`h-5 w-5 ${pos === 2 ? "text-slate-200" : "text-orange-300"}`} />
                          : <span className="text-slate-300">#{pos}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{item.name}</div>
                        {item.class_name && <div className="text-xs text-slate-400">{item.class_name}</div>}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-amber-300/30 bg-black/30 px-3 py-1 text-sm font-extrabold text-amber-300 tabular-nums">
                      🪙 {item.coins}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "sovgalar" && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0d1834]/75 p-8 text-center backdrop-blur-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-500/10 text-sky-300">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-white">Sovg'alar bo'limi</h3>
          <p className="mt-1 max-w-xs text-sm text-slate-400">Hozircha bu yer bo'sh. 31-dekabr kuni sovg'alar ochiladi!</p>
        </div>
      )}
    </div>
  );
}
