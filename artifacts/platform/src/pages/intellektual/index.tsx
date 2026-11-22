// Intelektual o'yinlar — bolalar uchun. Qulf yo'q, hamma o'yin ochiq.
import { Link } from "wouter";
import { Brain, Puzzle, Castle, ArrowLeft, Play, Sparkles } from "lucide-react";

// Qishki dizayn: Maktab olami kartasi uchun muz qoplamasi va Yangi yil shapkasi
const SnowCap = () => (
  <svg aria-hidden viewBox="0 0 400 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -top-1 h-8 w-full">
    <path d="M0 14 Q20 0 40 12 Q60 0 80 14 Q100 2 120 12 Q140 0 160 14 Q180 2 200 12 Q220 0 240 14 Q260 2 280 12 Q300 0 320 14 Q340 2 360 12 Q380 0 400 14 L400 40 L0 40 Z" fill="#f8fbff" opacity="0.95" />
  </svg>
);

const Icicles = () => (
  <svg aria-hidden viewBox="0 0 120 60" className="pointer-events-none absolute -bottom-2 -left-1 h-12 w-28 opacity-90">
    <path d="M8 0 L16 46 L24 0 Z M40 0 L48 34 L56 0 Z M72 0 L78 52 L86 0 Z M100 0 L106 26 L112 0 Z" fill="#e0f2fe" />
  </svg>
);

const GAMES = [
  {
    href: "/oyin",
    title: "Maktab olami",
    desc: "Tangalaringni yig'ib, maktab binolarini va o'z qahramoningni kuchaytir.",
    icon: Castle,
    grad: "from-indigo-500 to-violet-600",
    ring: "border-indigo-400/40",
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
    ring: "border-fuchsia-400/40",
    age: "1–11 sinf",
    bg: "/imagine/maktab-olami-sahna.jpg",
  },
];

export default function IntellektualPage() {
  return (
    <div className="space-y-6 max-w-3xl pb-8">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> O'yinlar
      </Link>

      {/* Sarlavha */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-amber-500/10 p-6 sm:p-8">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shadow-lg">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Intelektual o'yinlar</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Aqling charxlansin — o'yna va o'rgan!
            </p>
          </div>
        </div>
      </section>

      {/* O'yinlar: har bir o'yin o'z kirish havolasi bilan */}
      <section className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.href} className={`relative h-full overflow-hidden rounded-3xl border ${g.ring} shadow-sm flex flex-col min-h-[300px] ${g.winter ? "bg-[#0b1530]" : "bg-card"}`}>
              {g.bg && (
                <img src={g.bg} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1530] via-[#0b1530]/70 to-transparent" />
              {g.winter && <SnowCap />}
              <div className="relative flex flex-1 flex-col p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${g.grad} flex items-center justify-center shadow-md`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white">{g.title}</h2>
                    <span className="text-[11px] font-semibold text-white/70">{g.age}</span>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-white/85">{g.desc}</p>
                <Link
                  href={g.href}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${g.grad} py-3 text-sm font-bold text-white shadow-md transition active:scale-95`}
                >
                  <Play className="w-4 h-4 fill-white" /> O'ynash
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
