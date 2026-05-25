import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { getMyScores } from "@/lib/game-score";
import { Trophy, Star, Zap, Car, Sword, Puzzle } from "lucide-react";

interface GameCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  href: string;
  icon: React.ReactNode;
  levels?: string;
}

const GAMES: GameCard[] = [
  {
    id: "sozoyini",
    title: "So'z O'yini",
    description: "Harflarni birlashtiriб so'z hosil qil! 30 ta qiyin bosqich seni kutmoqda.",
    emoji: "🔤",
    color: "from-violet-500 to-purple-600",
    href: "/games/sozoyini",
    icon: <Puzzle className="w-6 h-6" />,
    levels: "30 bosqich",
  },
  {
    id: "jumboq",
    title: "Jumboq",
    description: "Aqlingni sinab ko'r! Qiziqarli topishmoqlarni topish vaqti.",
    emoji: "🧩",
    color: "from-amber-500 to-orange-600",
    href: "/games/jumboq",
    icon: <Star className="w-6 h-6" />,
    levels: "20 jumboq",
  },
  {
    id: "arqon",
    title: "Arqon Tortish",
    description: "Bot bilan savol-javob musobaqasi! Kim ko'p to'g'ri javob bersa, arqonni o'z tomoniga tortadi.",
    emoji: "🪢",
    color: "from-emerald-500 to-teal-600",
    href: "/games/arqon",
    icon: <Sword className="w-6 h-6" />,
    levels: "10 savol",
  },
  {
    id: "poyga",
    title: "Poyga",
    description: "Davlat bayrog'ini top — mashinang ilgarilab ketsin! 3 ta bot raqib bilan yarish.",
    emoji: "🏎️",
    color: "from-rose-500 to-red-600",
    href: "/games/poyga",
    icon: <Car className="w-6 h-6" />,
    levels: "15 bayroq",
  },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyScores().then((s) => { setScores(s); setLoading(false); });
  }, []);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">O'yinlar</h1>
          <p className="text-muted-foreground mt-1">Ta'lim o'yinlari — o'rgan va maroqlan!</p>
        </div>
        <Link href="/games/reyting">
          <button className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-yellow-100 transition-colors">
            <Trophy className="w-4 h-4" />
            Reyting
          </button>
        </Link>
      </div>

      {user?.role === "student" && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Umumiy ballar</p>
              <p className="text-3xl font-bold mt-0.5">{loading ? "…" : totalScore} ball</p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {GAMES.map((g) => (
              <div key={g.id} className="bg-white/20 rounded-lg p-2 text-center">
                <div className="text-lg">{g.emoji}</div>
                <div className="text-xs font-medium mt-0.5">{loading ? "…" : (scores[g.id] ?? 0)}</div>
              </div>
            ))}
          </div>
          <p className="text-white/60 text-xs mt-2">Har bosqich: +5 ball • Yutqizsa: -2 ball</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <Link key={game.id} href={game.href}>
            <div className="group relative rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card">
              <div className={`h-2 bg-gradient-to-r ${game.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{game.emoji}</div>
                  <div className={`rounded-lg p-2 bg-gradient-to-br ${game.color} text-white shadow-sm`}>
                    {game.icon}
                  </div>
                </div>
                <h3 className="font-bold text-lg">{game.title}</h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{game.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  {game.levels && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {game.levels}
                    </span>
                  )}
                  {!loading && (
                    <span className="text-xs font-medium text-primary ml-auto">
                      {scores[game.id] ?? 0} ball
                    </span>
                  )}
                </div>
                <div className={`mt-3 w-full py-2 rounded-lg text-center text-sm font-semibold text-white bg-gradient-to-r ${game.color} shadow group-hover:shadow-md transition-shadow`}>
                  O'ynash →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-medium text-sm">Ball tizimi</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold">+5</span>
            Bosqich yoki o'yin yutilsa
          </div>
          <div className="flex items-center gap-2 text-red-500">
            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold">-2</span>
            O'yin yutqizilsa
          </div>
        </div>
      </div>
    </div>
  );
}
