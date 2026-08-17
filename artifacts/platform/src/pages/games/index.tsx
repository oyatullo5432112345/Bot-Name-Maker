import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, Grid3x3, PlayCircle, ArrowUpRight, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  if (isStaff) {
    return (
      <div className="space-y-8 max-w-3xl relative">
        {/* Header Section with Colorful Badges */}
        <div>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Interaktiv dars vositalari
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
            Guruh o'yinlari
          </h1>
          <p className="text-slate-300 text-sm mt-1.5 max-w-md font-medium">
            Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Bamboozle Card */}
          <Link href="/games/board">
            <div className="group relative rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-slate-900/90 via-blue-950/80 to-slate-950 p-6 overflow-hidden transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] cursor-pointer h-full backdrop-blur-xl">
              {/* Background Glows */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl group-hover:bg-cyan-400/30 transition-all" />
              <div className="absolute top-1/2 -left-10 w-32 h-32 rounded-full bg-blue-600/20 blur-2xl" />

              <div className="relative flex items-start justify-between mb-6">
                {/* Neon Trophy Icon Badge */}
                <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Trophy className="w-7 h-7 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>

              <h3 className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                Bamboozle
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                Jamoalar savol-javob orqali raqobatlashadi — bonus, jarima va o'g'irlash mexanikasi bilan
              </p>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-cyan-500/20">
                <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-300/90">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> 2–3 jamoa
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-300/90">
                  <Grid3x3 className="w-3.5 h-3.5 text-cyan-400" /> 8–30 katak
                </span>
              </div>
            </div>
          </Link>

          {/* Omadli Charxpalak Card */}
          <Link href="/games/wheel">
            <div className="group relative rounded-3xl border-2 border-fuchsia-500/40 bg-gradient-to-b from-slate-900/90 via-purple-950/80 to-slate-950 p-6 overflow-hidden transition-all duration-300 hover:border-fuchsia-400 hover:shadow-[0_0_30px_rgba(217,70,239,0.4)] cursor-pointer h-full backdrop-blur-xl">
              {/* Background Glows */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl group-hover:bg-fuchsia-400/30 transition-all" />
              <div className="absolute top-1/2 -left-10 w-32 h-32 rounded-full bg-pink-600/20 blur-2xl" />

              <div className="relative flex items-start justify-between mb-6">
                {/* Neon Zap Icon Badge */}
                <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-fuchsia-400/80 shadow-[0_0_15px_rgba(217,70,239,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap className="w-7 h-7 text-fuchsia-300 drop-shadow-[0_0_6px_rgba(217,70,239,0.8)]" strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-fuchsia-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
              </div>

              <h3 className="font-bold text-xl tracking-tight text-white group-hover:text-fuchsia-200 transition-colors">
                Omadli Charxpalak
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirilishi mumkin
              </p>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-fuchsia-500/20">
                <span className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-300/90">
                  <PlayCircle className="w-3.5 h-3.5 text-fuchsia-400" /> Tasodifiy tanlash
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Info Banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
          <p className="text-sm font-medium text-amber-200/90">
            Yangi o'yinlar ustida ishlanmoqda — tez orada shu yerga qo'shiladi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-sm mx-auto">
      <div className="relative mb-7">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-fuchsia-500/60 shadow-[0_0_25px_rgba(217,70,239,0.4)] flex items-center justify-center">
          <Gamepad2 className="w-10 h-10 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" strokeWidth={1.75} />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.8)]">
          <Sparkles className="w-4 h-4 text-slate-950" />
        </div>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
        Tez kunda
      </h1>
      <p className="text-slate-300 text-sm mt-2 leading-relaxed">
        Yangi o'yinlar ustida ishlanmoqda. Tayyor bo'lgach, shu yerda paydo bo'ladi.
      </p>
    </div>
  );
}
