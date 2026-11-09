import { Link } from "wouter";
import { Users, Grid3x3, PlayCircle, Trophy, Zap, ArrowRight, Play, Sparkles } from "lucide-react";
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
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes shine { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes glowPulse { 0%,100%{opacity:.35} 50%{opacity:.7} }

  .btn-pulse-blue { animation: playPulseBlue 2s infinite ease-in-out; }
  .btn-pulse-amber { animation: playPulseAmber 2s infinite ease-in-out; }
  .btn-pulse-rose { animation: playPulseRose 2s infinite ease-in-out; }
  .anim-float { animation: floatY 3.5s ease-in-out infinite; }
  .anim-glow { animation: glowPulse 4s ease-in-out infinite; }
  .shine-text {
    background: linear-gradient(90deg, #fbbf24 0%, #f472b6 25%, #a855f7 50%, #38bdf8 75%, #fbbf24 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: shine 4s linear infinite;
  }
`;

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-6 max-w-3xl pb-6">
      <style>{gameStyles}</style>

      {/* Sarlavha */}
      <div className="relative">
        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-widest mb-1">
          Interaktiv dars vositalari
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight shine-text">
          O'yinlar
        </h1>
        <p className="text-muted-foreground text-xs mt-1.5 max-w-md">
          Bilim va zavq bir joyda — o'zingiz yoki sinf bilan birga
        </p>
      </div>

      {/* 0. INTELEKTUAL O'YINLAR */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Yangi — aqlni charxla
        </p>

        <Link href="/intellektual" className="block">
          <div className="relative rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 via-violet-950/60 to-slate-900/80 p-4 sm:p-5 overflow-hidden shadow-lg hover:border-indigo-400/70 hover:shadow-indigo-500/20 transition-all duration-300 group cursor-pointer">
            {/* fon nurlari */}
            <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none anim-glow" />
            <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none anim-glow" style={{ animationDelay: "1.5s" }} />

            {/* yulduzchalar */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/50 pointer-events-none"
                style={{
                  left: `${10 + (i * 11) % 80}%`,
                  top: `${20 + (i * 17) % 60}%`,
                  animation: `glowPulse ${2 + (i % 3)}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 border border-indigo-300/40 flex items-center justify-center shrink-0 shadow-lg text-3xl anim-float">
                  🧠
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                    Intellektual o'yinlar
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 font-bold uppercase tracking-wider">
                      Yangi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300/90 mt-1 leading-relaxed max-w-sm">
                    Maktab Olami, Merge va boshqa aqliy o'yinlar — maktabingni va qahramoningni kuchaytir!
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/10">
                <span className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-xs shadow-md group-active:scale-95 transition-all">
                  OCHISH <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* 2. GURUH O'YINLARI */}
      {isStaff && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Guruh o'yinlari
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* BAMBOOZLE */}
            <div className="relative rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-card p-5 overflow-hidden shadow-lg hover:border-amber-400/60 hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none anim-glow" />

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <Trophy className="w-6 h-6 text-slate-950" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-white">Bamboozle</h3>
                    <div className="flex items-center gap-2 text-[10px] text-amber-400 font-medium mt-0.5">
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

              <div className="pt-3 mt-3 border-t border-white/10">
                <Link href="/games/board">
                  <button className="btn-pulse-amber w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer">
                    <span>O'YNASH</span>
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                  </button>
                </Link>
              </div>
            </div>

            {/* OMADLI CHARXPALAK */}
            <div className="relative rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-slate-900 to-card p-5 overflow-hidden shadow-lg hover:border-rose-400/60 hover:shadow-rose-500/10 transition-all duration-300 flex flex-col justify-between group">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-rose-500/15 blur-2xl pointer-events-none anim-glow" />

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-400 border border-pink-300/40 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-white">Omadli Charxpalak</h3>
                    <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium mt-0.5">
                      <PlayCircle className="w-3 h-3" /> Tasodifiy tanlov
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300/90 leading-relaxed min-h-[36px]">
                  Sinfda o'quvchi yoki yashirin savollarni tasodifiy charxpalak orqali tanlang.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-white/10">
                <Link href="/games/wheel">
                  <button className="btn-pulse-rose w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer">
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
