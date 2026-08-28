import { Link } from "wouter";
import { Users, Grid3x3, PlayCircle, ArrowUpRight, Trophy, Zap, Brain } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1.5">Interaktiv dars vositalari</p>
        <h1 className="text-3xl font-bold tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-md">Bilim va zavq bir joyda — o'zingiz yoki sinf bilan birga</p>
      </div>

      {/* Hamma o'ynay oladigan, individual o'yin */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Hamma uchun</p>
        <Link href="/games/zukko">
          <div className="group relative rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/50 p-6 overflow-hidden transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_8px_40px_-12px_rgba(139,92,246,0.25)] cursor-pointer">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/[0.07] blur-2xl group-hover:bg-violet-500/[0.12] transition-colors" />
            <div className="relative flex items-start justify-between mb-8">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-400" strokeWidth={1.75} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <h3 className="font-semibold text-lg tracking-tight">Zukko</h3>
            <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed max-w-sm">
              Topishmoq va mantiq savollari — bosqichma-bosqich, o'zingiz xohlagan vaqtda yeching
            </p>
          </div>
        </Link>
      </div>

      {/* Sinf bilan birga o'ynaladigan o'yinlar — faqat xodimlar uchun */}
      {isStaff && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Guruh o'yinlari</p>
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
        </div>
      )}
    </div>
  );
}
