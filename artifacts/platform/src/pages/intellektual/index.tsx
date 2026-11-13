// Intelektual o'yinlar — bolalar uchun. Qulf yo'q, hamma o'yin ochiq.
import { Link } from "wouter";
import { Brain, Puzzle, Castle, ArrowLeft, Play, Sparkles } from "lucide-react";

const GAMES = [
  {
    href: "/oyin",
    title: "Maktab olami",
    desc: "Tangalaringni yig'ib, maktab binolarini va o'z qahramoningni kuchaytir.",
    icon: Castle,
    grad: "from-indigo-500 to-violet-600",
    ring: "border-indigo-400/40",
    age: "1–11 sinf",
  },
  {
    href: "/oyin/merge",
    title: "Merge",
    desc: "Bir xil plitkalarni birlashtirib, eng yuqori darajaga chiq.",
    icon: Puzzle,
    grad: "from-fuchsia-500 to-rose-500",
    ring: "border-fuchsia-400/40",
    age: "1–11 sinf",
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

      {/* O'yinlar */}
      <section className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = g.icon;
          return (
            <Link key={g.href} href={g.href} className="block group">
              <div className={`h-full rounded-3xl border ${g.ring} bg-card p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${g.grad} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold">{g.title}</h2>
                    <span className="text-[11px] font-semibold text-muted-foreground">{g.age}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed flex-1">{g.desc}</p>
                <span className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${g.grad} py-3 text-sm font-bold text-white shadow-md group-active:scale-95 transition`}>
                  <Play className="w-4 h-4 fill-white" /> O'ynash
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
