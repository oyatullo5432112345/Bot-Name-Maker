import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, Grid3x3, ArrowUpRight, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

const GAME_IMAGES = [
  "/images/hero-bg.png",
  "/images/bamboozle-3d.png",
  "/images/wheel-3d.png",
  "/images/trophy-3d.png",
];

function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          // Rasm muvaffaqiyatli yoki xato bilan tugasa ham davom etamiz —
          // bitta rasm topilmasa butun sahifa "osilib qolmasin"
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

function GamesLoadingScreen() {
  return (
    <div className="relative min-h-screen -m-6 p-6 bg-[#070b19] flex items-center justify-center overflow-hidden">
      {/* Fon yulduzchalar effekti */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 rounded-full bg-white animate-pulse" />
        <div className="absolute top-24 right-20 w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" style={{ animationDelay: "0.3s" }} />
        <div className="absolute bottom-32 left-1/4 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.6s" }} />
        <div className="absolute bottom-20 right-1/3 w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" style={{ animationDelay: "0.9s" }} />
        <div className="absolute top-1/2 left-16 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-blue-400 border-r-purple-400 border-b-transparent border-l-transparent animate-spin shadow-[0_0_20px_rgba(96,165,250,0.5)]" />
          <Gamepad2 className="w-6 h-6 text-blue-300" strokeWidth={1.75} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-sm tracking-wide">O'yinlar yuklanmoqda</p>
          <p className="text-slate-400 text-xs">Iltimos, biroz kuting…</p>
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;

    preloadImages(GAME_IMAGES).then(() => {
      if (!cancelled) setImagesReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  if (isStaff) {
    if (!imagesReady) {
      return <GamesLoadingScreen />;
    }

    return (
      <div className="relative min-h-screen text-white pb-12 overflow-hidden -m-6 p-6 bg-[#070b19] animate-fade-in-up">
        {/* Orqa fon banneri */}
        <div 
          className="absolute top-0 left-0 right-0 h-64 bg-cover bg-center opacity-40 pointer-events-none"
          style={{ backgroundImage: "url('/images/hero-bg.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070b19]/70 to-[#070b19]" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-8">
          {/* Header */}
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">
              Interaktiv dars vositalari
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-md text-white">
              Guruh o'yinlari
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-md">
              Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            
            {/* Bamboozle Card */}
            <Link href="/games/board">
              <div className="group relative rounded-3xl border neon-border-blue bg-gradient-to-br from-blue-950/80 via-slate-900/90 to-slate-950 p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] game-card-glow-blue cursor-pointer h-full min-h-[220px] flex flex-col justify-between">
                
                {/* 3D Illyustratsiya foni */}
                <div className="absolute -right-2 top-0 h-full w-[60%] pointer-events-none overflow-hidden">
                  <img 
                    src="/images/bamboozle-3d.png" 
                    alt="Bamboozle 3D" 
                    className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  {/* Chap tomondan karta foniga yumshoq eritish */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-950/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-blue-950/30" />
                </div>

                <div className="relative z-10 max-w-[65%] space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <img 
                      src="/images/trophy-3d.png" 
                      alt="Trophy" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Rasm topilmasa, o'rniga oddiy ikonka ko'rsatiladi
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Trophy className="w-5 h-5 text-amber-400 hidden" />
                  </div>

                  <h3 className="font-bold text-xl text-white tracking-tight">Bamboozle</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Jamoalar savol-javob orqali raqobatlashadi — bonus, jarima va o'g'irlash mexanikasi bilan
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 mt-6 pt-4 border-t border-white/10 text-slate-300 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> 2–3 jamoa
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Grid3x3 className="w-3.5 h-3.5 text-blue-400" /> 8–30 katak
                  </span>
                </div>
              </div>
            </Link>

            {/* Omadli Charxpalak Card */}
            <Link href="/games/wheel">
              <div className="group relative rounded-3xl border neon-border-purple bg-gradient-to-br from-purple-950/80 via-slate-900/90 to-slate-950 p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] game-card-glow-purple cursor-pointer h-full min-h-[220px] flex flex-col justify-between">
                
                {/* 3D Charxpalak foni */}
                <div className="absolute -right-4 -bottom-4 h-56 w-56 pointer-events-none">
                  <img 
                    src="/images/wheel-3d.png" 
                    alt="Wheel 3D" 
                    className="h-full w-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  {/* Chap-yuqori tomondan karta foniga yumshoq eritish */}
                  <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-purple-950/60" style={{ background: "radial-gradient(circle at 30% 30%, transparent 35%, rgba(59,7,100,0.5) 70%)" }} />
                </div>

                <div className="relative z-10 max-w-[65%] space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-pink-500/20 border border-pink-400/40 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                    <Zap className="w-5 h-5 text-pink-400 neon-icon-glow" />
                  </div>

                  <h3 className="font-bold text-xl text-white tracking-tight">Omadli Charxpalak</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirilishi mumkin
                  </p>
                </div>

                <ArrowUpRight className="absolute top-5 right-5 w-5 h-5 text-slate-400 group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            </Link>

          </div>

          {/* Footer Note */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-4 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs">Yangi o'yinlar ustida ishlanmoqda — tez orada shu yerga qo'shiladi</p>
          </div>
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
