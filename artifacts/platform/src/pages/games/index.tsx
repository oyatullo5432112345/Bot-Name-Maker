import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, Grid3x3, PlayCircle, ArrowUpRight, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  if (isStaff) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1.5">Interaktiv dars vositalari</p>
          <h1 className="text-3xl font-bold tracking-tight">Guruh o'yinlari</h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-md">Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link href="/games/board">
            <div className="group relative rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/50 p-6 overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_8px_40px_-12px_rgba(59,130,246,0.25)] cursor-pointer h-full">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-blue-500/[0.07] blur-2xl group-hover:bg-blue-500/[0.12] transition-colors" />

              <div className="relative flex items-start justify-between mb-8">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              <h3 className="font-semibold text-lg tracking-tight">Bamboozle</h3>
              <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed">
                Jamoalar savol-javob orqali raqobatlashadi — bonus, jarima va o'g'irlash mexanikasi bilan
              </p>

              <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/50">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Users className="w-3.5 h-3.5" /> 2–3 jamoa
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Grid3x3 className="w-3.5 h-3.5" /> 8–30 katak
                </span>
              </div>
            </div>
          </Link>

          <Link href="/games/wheel">
            <div className="group relative rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/50 p-6 overflow-hidden transition-all duration-300 hover:border-rose-500/40 hover:shadow-[0_8px_40px_-12px_rgba(244,63,94,0.25)] cursor-pointer h-full">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-500/[0.07] blur-2xl group-hover:bg-rose-500/[0.12] transition-colors" />

              <div className="relative flex items-start justify-between mb-8">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-rose-400" strokeWidth={1.75} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              <h3 className="font-semibold text-lg tracking-tight">Omadli Charxpalak</h3>
              <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed">
                Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirilishi mumkin
              </p>

              <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/50">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <PlayCircle className="w-3.5 h-3.5" /> Tasodifiy tanlash
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-5 py-4">
          <Sparkles className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <p className="text-sm text-muted-foreground/70">Yangi o'yinlar ustida ishlanmoqda — tez orada shu yerga qo'shiladi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-sm mx-auto">
      <div className="relative mb-7">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-purple-500/15 border border-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-7 h-7 text-primary/80" strokeWidth={1.75} />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400/90 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Tez kunda</h1>
      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
        Yangi o'yinlar ustida ishlanmoqda. Tayyor bo'lgach, shu yerda paydo bo'ladi.
      </p>
    </div>
  );
}
