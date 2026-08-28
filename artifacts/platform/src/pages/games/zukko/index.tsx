import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Star, Crown, Loader2, Brain } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface LevelInfo { level: number; question_count: number; best_stars: number; locked: boolean }
interface LevelsResponse { levels: LevelInfo[]; is_pro: boolean; free_level_limit: number }

export default function ZukkoLevelsPage() {
  const { data, isLoading } = useQuery<LevelsResponse>({
    queryKey: ["riddles-levels"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/riddles/levels`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/games" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> O'yinlarga qaytish
      </Link>

      <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-card to-card p-6 sm:p-7">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-violet-500/[0.08] blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 text-violet-400" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-400/80 uppercase tracking-widest mb-1">Individual o'yin</p>
            <h1 className="text-2xl font-bold tracking-tight">Zukko</h1>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-md">Topishmoq va mantiq savollari — bosqichma-bosqich, o'zingiz xohlagan vaqtda</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {!data?.is_pro && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Bepul rejada {data?.free_level_limit ?? 2} ta bosqich ochiq. Barcha bosqichlar uchun{" "}
                <Link href="/pro" className="text-amber-400 font-medium hover:underline">Pro versiyaga o'ting</Link>.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {data?.levels.map(l => (
              <Link key={l.level} href={l.locked ? "/pro" : `/games/zukko/${l.level}`}>
                <div className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                  l.locked ? "border-border/40 opacity-60" : "border-border/60 hover:border-violet-500/40 hover:-translate-y-0.5 cursor-pointer"
                }`}>
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    l.locked ? "bg-muted text-muted-foreground" : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                  }`}>
                    {l.locked ? <Lock className="w-4 h-4" /> : l.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{l.level}-bosqich</p>
                    <p className="text-xs text-muted-foreground">{l.question_count} ta savol</p>
                  </div>
                  {!l.locked && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= l.best_stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
