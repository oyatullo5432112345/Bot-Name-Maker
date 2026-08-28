import { Link } from "wouter";
import { Users, Grid3x3, PlayCircle, Trophy, Zap, Play } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

// Rasmga 1:1 mos keluvchi 3D pulsatsiya va tugma effektlari
const gameCardStyles = `
  @keyframes playPulse3D {
    0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(37, 99, 235, 0.5)); }
    50% { transform: scale(1.05); filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.8)); }
    100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(37, 99, 235, 0.5)); }
  }
  .animate-zukko-play-3d {
    animation: playPulse3D 1.8s infinite ease-in-out;
  }
`;

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-10 max-w-3xl">
      <style>{gameCardStyles}</style>

      <div>
        <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1.5">Interaktiv dars vositalari</p>
        <h1 className="text-3xl font-bold tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-md">Bilim va zavq bir joyda — o'zingiz yoki sinf bilan birga</p>
      </div>

      {/* ZUKKO KARTASI — RASMDAGI BILAN BIKR BIR XIL */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Hamma uchun</p>

        <div className="relative rounded-3xl border-4 border-sky-300/40 bg-gradient-to-b from-sky-400 via-sky-600 to-indigo-900 p-6 sm:p-8 overflow-hidden shadow-2xl">
          
          {/* Fondagi kosmik va porlash effektlari */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-300/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center gap-5">
            
            {/* Tepadagi Logotip va "Zukko" Yozuvi */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 border-4 border-white shadow-xl flex items-center justify-center text-3xl">
                🧠
              </div>
              <h2 className="text-4xl font-black text-amber-300 drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)] tracking-wide">
                Zukko
              </h2>
            </div>

            {/* Tavsif matni */}
            <p className="text-white text-sm sm:text-base font-semibold max-w-md leading-snug drop-shadow-sm">
              Topishmoq va mantiq savollari — bosqichma-bosqich, o'zingiz xohlagan vaqtda yeching
            </p>

            {/* Avatarlar va Yulduzchalar qatori */}
            <div className="flex items-center justify-center gap-4 py-1">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-pink-300 flex items-center justify-center text-lg shadow-md">👧</div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-amber-200 flex items-center justify-center text-lg shadow-md">👦</div>
              </div>

              <div className="flex items-center gap-0.5 text-amber-300 text-lg drop-shadow">
                ★ ★ ★ ★ <span className="text-white/40">★</span>
              </div>

              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-300 flex items-center justify-center text-lg shadow-md">👧🏽</div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-cyan-300 flex items-center justify-center text-lg shadow-md">👦🏻</div>
              </div>
            </div>

            {/* RASMDAGIDEK KATTA 3D KAPSULA PLAY TUGMASI */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              
              {/* Katta 3D Ko'k Play Tugma */}
              <Link href="/games/zukko" className="w-full sm:w-auto">
                <button className="animate-zukko-play-3d w-full sm:w-64 flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-b from-blue-400 via-blue-600 to-blue-800 border-2 border-cyan-200 text-white font-black text-2xl tracking-wider shadow-[0_8px_0_#1e3a8a,_0_15px_20px_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-[0_3px_0_#1e3a8a] transition-all cursor-pointer">
                  <span>PLAY</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                  </div>
                </button>
              </Link>

              {/* Yonidagi Kichik Sariq Kapsula Tugma */}
              <Link href="/games/zukko" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-white text-slate-900 font-extrabold text-sm uppercase tracking-wide shadow-[0_4px_0_#b45309] active:translate-y-1 transition-all cursor-pointer">
                  <span>Bosqichlar</span> ➔
                </button>
              </Link>

            </div>

          </div>
        </div>
      </div>

      {/* GURUH O'YINLARI (Tegilmaydi) */}
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
