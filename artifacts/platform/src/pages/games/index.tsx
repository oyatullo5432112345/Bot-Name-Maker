import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, Grid3x3, ArrowUpRight, BookOpen, Star, Compass } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  if (isStaff) {
    return (
      <div
        className="relative min-h-screen text-white pb-12 overflow-hidden -m-6 p-6"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, #161c38 0%, #080b18 55%, #050710 100%)",
        }}
      >
        {/* Yengil yulduzcha fon (CSS-only, rasm fayli yo'q) */}
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute top-8 left-8 w-1 h-1 rounded-full bg-white/80" />
          <div className="absolute top-14 left-1/3 w-0.5 h-0.5 rounded-full bg-amber-200/70" />
          <div className="absolute top-6 right-16 w-1 h-1 rounded-full bg-white/60" />
          <div className="absolute top-24 right-1/4 w-0.5 h-0.5 rounded-full bg-white/70" />
          <div className="absolute top-40 left-1/4 w-1 h-1 rounded-full bg-purple-200/60" />
          <div className="absolute top-32 right-10 w-0.5 h-0.5 rounded-full bg-white/50" />
          <div className="absolute top-52 left-14 w-0.5 h-0.5 rounded-full bg-white/60" />

          {/* Suzib yuruvchi ikonalar */}
          <BookOpen className="absolute top-10 right-8 w-6 h-6 text-blue-300/25 animate-float" />
          <Star className="absolute top-4 left-1/2 w-4 h-4 text-amber-300/30 animate-float" style={{ animationDelay: "0.5s" }} />
          <Compass className="absolute top-20 left-6 w-5 h-5 text-purple-300/20 animate-float" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 max-w-3xl space-y-8">
          {/* Header */}
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">
              Interaktiv dars vositalari
            </p>
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #cfd9ec 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Guruh o'yinlari
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-md">
              Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-1">

            {/* Bamboozle Card */}
            <Link href="/games/board">
              <div
                className="group relative flex items-center justify-between rounded-3xl border p-5 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.015] active:scale-[0.98]"
                style={{
                  background: "rgba(23, 27, 52, 0.55)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  borderColor: "rgba(62, 140, 255, 0.35)",
                  boxShadow: "0 8px 28px -6px rgba(32, 80, 200, 0.35), inset 0 1px 1px rgba(255,255,255,0.06)",
                }}
              >
                {/* Chap tomon: matn */}
                <div className="relative z-10 flex-1 pr-4 space-y-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(43, 114, 255, 0.18)",
                      border: "1px solid rgba(66, 133, 244, 0.4)",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffb703">
                      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c2.19-.38 3.88-2.02 3.98-4.33C19.39 11.23 21 9.22 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                    </svg>
                  </div>

                  <h3 className="font-bold text-lg text-white tracking-tight">Bamboozle</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-[240px]">
                    Jamoalar savol-javob orqali raqobatlashadi — bonus, jarima va o'g'irlash mexanikasi bilan
                  </p>

                  <div className="flex items-center gap-4 pt-2 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> 2–3 jamoa
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Grid3x3 className="w-3.5 h-3.5 text-blue-400" /> 8–30 katak
                    </span>
                  </div>
                </div>

                {/* O'ng tomon: glow + SVG grafika */}
                <div className="relative z-10 shrink-0 w-24 h-24 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(0,212,255,0.35) 0%, rgba(9,9,121,0) 72%)",
                    }}
                  />
                  <svg
                    width="56"
                    height="56"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4dd8ff"
                    strokeWidth="1.4"
                    className="relative drop-shadow-[0_0_10px_rgba(77,216,255,0.55)] group-hover:scale-110 transition-transform duration-300"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#4dd8ff" />
                    <circle cx="15.5" cy="15.5" r="1.5" fill="#4dd8ff" />
                    <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Omadli Charxpalak Card */}
            <Link href="/games/wheel">
              <div
                className="group relative flex items-center justify-between rounded-3xl border p-5 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.015] active:scale-[0.98]"
                style={{
                  background: "rgba(23, 27, 52, 0.55)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  borderColor: "rgba(186, 62, 255, 0.35)",
                  boxShadow: "0 8px 28px -6px rgba(140, 32, 200, 0.35), inset 0 1px 1px rgba(255,255,255,0.06)",
                }}
              >
                <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all z-10" />

                {/* Chap tomon: matn */}
                <div className="relative z-10 flex-1 pr-4 space-y-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(186, 62, 255, 0.18)",
                      border: "1px solid rgba(186, 62, 255, 0.4)",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ec4899">
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                  </div>

                  <h3 className="font-bold text-lg text-white tracking-tight">Omadli Charxpalak</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-[240px]">
                    Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirilishi mumkin
                  </p>
                </div>

                {/* O'ng tomon: glow + aylanuvchi SVG charxpalak */}
                <div className="relative z-10 shrink-0 w-24 h-24 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(9,9,121,0) 72%)",
                    }}
                  />
                  <svg
                    width="58"
                    height="58"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f472b6"
                    strokeWidth="1.4"
                    className="relative drop-shadow-[0_0_10px_rgba(244,114,182,0.55)] group-hover:rotate-45 transition-transform duration-500 ease-out"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
                    <circle cx="12" cy="12" r="2" fill="#f472b6" />
                  </svg>
                </div>
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
