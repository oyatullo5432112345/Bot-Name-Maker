import { Link } from "wouter";
import { Users, Grid3x3, PlayCircle, Trophy, Zap, Gamepad2, ArrowRight, Play, Star } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

const gameStyles = `
  @keyframes playPulseBlue {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.5); }
    50% { transform: scale(1.03); box-shadow: 0 0 14px 2px rgba(14, 165, 233, 0.4); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
  }

  @keyframes playPulseAmber {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
    50% { transform: scale(1.03); box-shadow: 0 0 14px 2px rgba(245, 158, 11, 0.4); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }

  @keyframes playPulseRose {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.5); }
    50% { transform: scale(1.03); box-shadow: 0 0 14px 2px rgba(244, 63, 94, 0.4); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
  }

  .btn-pulse-blue { animation: playPulseBlue 2s infinite ease-in-out; }
  .btn-pulse-amber { animation: playPulseAmber 2s infinite ease-in-out; }
  .btn-pulse-rose { animation: playPulseRose 2s infinite ease-in-out; }
`;

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-6 max-w-3xl pb-6">
      <style>{gameStyles}</style>

      {/* Sarlavha */}
      <div>
        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-widest mb-1">Interaktiv dars vositalari</p>
        <h1 className="text-2xl font-extrabold tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground text-xs mt-0.5 max-w-md">Bilim va zavq bir joyda — o'zingiz yoki sinf bilan birga</p>
      </div>

      {/* 1. ZUKKO O'YINI */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">Hamma uchun</p>

        <div className="relative rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-card p-4 sm:p-5 overflow-hidden shadow-md">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 border border-cyan-300/30 flex items-center justify-center shrink-0 shadow-md">
                <Gamepad2 className="w-6 h-6 text-white" strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg tracking-tight text-white">Zukko</h3>
                  <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-400 text-xs">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400" />
                    <Star className="w-3 h-3 text-amber-400/40" />
                  </div>
                </div>

                <p className="text-xs text-slate-300/90 mt-1 leading-relaxed max-w-sm">
                  Topishmoq va mantiqiy savollar — bosqichma-bosqich yechib, bilimingizni sinang.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
              <Link href="/games/zukko" className="flex-1 sm:flex-initial">
                <button className="btn-pulse-blue w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer">
                  <span>PLAY</span>
                  <Play className="w-3.5 h-3.5 fill-white" />
                </button>
              </Link>

              <Link href="/games/zukko">
                <button className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1">
                  <span>Bosqichlar</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GURUH O'YINLARI */}
      {isStaff && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">Guruh o'yinlari</p>
          
          <div className="grid gap-3.5 sm:grid-cols-2">
            
            {/* BAMBOOZLE */}
            <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-card p-4.5 overflow-hidden shadow-md flex flex-col justify-between">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 border border-amber-300/30 flex items-center justify-center shrink-0 shadow-md">
                    <Trophy className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-white">Bamboozle</h3>
                    <div className="flex items-center gap-2 text-[10px] text-amber-400 font-medium">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2–3 jamoa</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Grid3x3 className="w-3 h-3" /> 8–30 katak</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300/90 leading-relaxed min-h-[36px]">
                  Jamoaviy musobaqa — bonus, jarima va o'g'irlash kataklari bilan raqobatlashing.
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-border/40">
                <Link href="/games/board">
                  <button className="btn-pulse-amber w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer">
                    <span>O'YNASH</span>
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                  </button>
                </Link>
              </div>
            </div>

            {/* OMADLI CHARXPALAK */}
            <div className="relative rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-slate-900 to-card p-4.5 overflow-hidden shadow-md flex flex-col justify-between">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-rose-500/10 blur-xl pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-400 border border-pink-300/30 flex items-center justify-center shrink-0 shadow-md">
                    <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-white">Omadli Charxpalak</h3>
                    <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                      <PlayCircle className="w-3 h-3" /> Tasodifiy tanlov
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300/90 leading-relaxed min-h-[36px]">
                  Sinfda o'quvchi yoki yashirin savollarni tasodifiy charxpalak orqali tanlang.
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-border/40">
                <Link href="/games/wheel">
                  <button className="btn-pulse-rose w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer">
                    <span>AYLANTIRISH</span>
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
