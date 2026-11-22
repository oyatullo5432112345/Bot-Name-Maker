// Intelektual o'yinlar — bolalar uchun. Qulf yo'q, hamma o'yin ochiq.
import { Link } from "wouter";
import { Brain, Puzzle, Castle, ArrowLeft, Play, Sparkles } from "lucide-react";

// Qishki dizayn: Maktab olami kartasi uchun muz qoplamasi
const SnowCap = () => (
  <svg
    aria-hidden
    viewBox="0 0 400 40"
    preserveAspectRatio="none"
    className="pointer-events-none absolute inset-x-0 -top-1 z-20 h-7 w-full"
  >
    <path
      d="M0 14 Q20 0 40 12 Q60 0 80 14 Q100 2 120 12 Q140 0 160 14 Q180 2 200 12 Q220 0 240 14 Q260 2 280 12 Q300 0 320 14 Q340 2 360 12 Q380 0 400 14 L400 40 L0 40 Z"
      fill="#f8fbff"
      opacity="0.92"
    />
  </svg>
);

const GAMES = [
  {
    href: "/oyin",
    title: "Maktab olami",
    desc: "Tangalaringni yig'ib, maktab binolarini va o'z qahramoningni kuchaytir.",
    icon: Castle,
    grad: "from-indigo-500 to-violet-600",
    ring: "border-indigo-400/40 shadow-[0_8px_28px_rgba(99,102,241,0.28)]",
    age: "1–11 sinf",
    winter: true,
    bg: "/imagine/maktab-bola-tolik.jpg",
  },
  {
    href: "/oyin/merge",
    title: "Merge",
    desc: "Bir xil plitkalarni birlashtirib, eng yuqori darajaga chiq.",
    icon: Puzzle,
    grad: "from-fuchsia-500 to-rose-500",
    ring: "border-fuchsia-400/40 shadow-[0_8px_28px_rgba(236,72,153,0.28)]",
    age: "1–11 sinf",
    winter: false,
    bg: "/imagine/maktab-olami-sahna.jpg",
  },
];

export default function IntellektualPage() {
  return (
    <div className="relative z-10 mx-auto max-w-3xl space-y-6 pb-10">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> O'yinlar
      </Link>

      {/* Sarlavha */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-indigo-600/20 via-violet-600/15 to-amber-500/15 p-5 sm:p-7 backdrop-blur-md">
        <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 shadow-lg">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Intelektual o'yinlar
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Aqling charxlansin — o'yna va o'rgan!</span>
            </p>
          </div>
        </div>
      </section>

      {/* O'yinlar: fon xiralashtirilib, ustiga faqat bitta toza yozuv qatlami qo'yildi */}
      <section className="grid gap-5 sm:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.href}
              className={`relative flex min-h-[280px] h-full flex-col overflow-hidden rounded-3xl border ${g.ring} bg-[#0b1530]`}
            >
              {/* Fon rasmi: rasm ichidagi eski matn qalqib chiqmasligi uchun blur va qoraytirilgan qatlam qo'shildi */}
              {g.bg && (
                <img
                  src={g.bg}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-right opacity-25 blur-[3px]"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0b1530]/92 via-[#101d3f]/82 to-[#0b1530]/88" />

              {g.winter && <SnowCap />}

              <div className="relative z-10 flex flex-1 flex-col p-5 pt-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${g.grad} p-3.5 shadow-md ring-2 ring-white/15`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold text-white">
                      {g.title}
                    </h2>
                    <span className="text-xs font-semibold text-sky-200/80">
                      {g.age}
                    </span>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-200">
                  {g.desc}
                </p>

                <Link
                  href={g.href}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${g.grad} py-3 text-sm font-bold text-white shadow-md transition active:scale-95`}
                >
                  <Play className="h-4 w-4 fill-white" /> O'ynash
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
