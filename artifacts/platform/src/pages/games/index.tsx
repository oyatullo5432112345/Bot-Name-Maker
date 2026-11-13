// O'yinlar — yagona kirish sahifasi.
// Hamma uchun: Intelektual o'yinlar. O'qituvchi/rahbariyat uchun: guruh o'yinlari.
import { Link } from "wouter";
import { Brain, Users, Trophy, Zap, Play, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari", "boshlangich_oqituvchi"];

const GROUP_GAMES = [
  {
    href: "/games/board",
    title: "Bamboozle",
    desc: "Jamoalar bo'lib bellashadi: bonus, jarima va kataklar bilan.",
    meta: "2–3 jamoa",
    icon: Trophy,
    grad: "from-amber-500 to-orange-500",
  },
  {
    href: "/games/wheel",
    title: "Omadli charxpalak",
    desc: "Charxpalak tasodifiy o'quvchi yoki savolni tanlaydi.",
    meta: "Tasodifiy tanlov",
    icon: Zap,
    grad: "from-rose-500 to-pink-600",
  },
];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-8 max-w-3xl pb-8">
      {/* Sarlavha */}
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground text-sm mt-1">O'ynab o'rganing</p>
      </header>

      {/* Bolalar uchun: Intelektual */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Intelektual o'yinlar</h2>
        <Link href="/intellektual" className="block group">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-400/40 bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-amber-500/10 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">Intelektual o'yinlar</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Maktab olami, Merge va boshqa aqliy o'yinlar</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>
        </Link>
      </section>

      {/* Guruh o'yinlari: faqat o'qituvchi va rahbariyat */}
      {isStaff && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Guruh o'yinlari
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUP_GAMES.map((g) => {
              const Icon = g.icon;
              return (
                <Link key={g.href} href={g.href} className="block group">
                  <div className="h-full rounded-3xl border bg-card p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.grad} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold">{g.title}</h3>
                        <span className="text-[11px] font-semibold text-muted-foreground">{g.meta}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed flex-1">{g.desc}</p>
                    <span className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${g.grad} py-2.5 text-sm font-bold text-white shadow-md`}>
                      <Play className="w-4 h-4 fill-white" /> O'ynash
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
