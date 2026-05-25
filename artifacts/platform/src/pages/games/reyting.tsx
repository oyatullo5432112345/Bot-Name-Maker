import { useState, useEffect } from "react";
import { Link } from "wouter";
import { getRatings, type RatingEntry } from "@/lib/game-score";
import { ChevronLeft, Trophy, Medal, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const GAMES = [
  { id: "sozoyini", label: "So'z O'yini", emoji: "🔤", color: "text-violet-600" },
  { id: "jumboq",   label: "Jumboq",      emoji: "🧩", color: "text-amber-600" },
  { id: "arqon",    label: "Arqon",       emoji: "🪢", color: "text-emerald-600" },
  { id: "poyga",    label: "Poyga",       emoji: "🏎️", color: "text-rose-600" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Reyting() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState("sozoyini");
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRatings(activeGame).then((r) => { setRatings(r); setLoading(false); });
  }, [activeGame]);

  const topThree = ratings.slice(0, 3);
  const rest = ratings.slice(3);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/games">
          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Reyting jadvali</h1>
          <p className="text-muted-foreground text-sm">Eng yaxshi o'yinchilar</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            className={`py-2 rounded-xl border-2 text-center text-xs font-medium transition-all ${
              activeGame === g.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="text-xl mb-0.5">{g.emoji}</div>
            <div className="truncate px-1">{g.label}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : ratings.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-muted-foreground">Hali hech kim o'ynamagan</p>
          <p className="text-sm text-muted-foreground mt-1">Birinchi bo'ling!</p>
          <Link href={`/games/${activeGame}`}>
            <button className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              O'ynash →
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 items-end">
              {[topThree[1], topThree[0], topThree[2]].map((entry, displayPos) => {
                if (!entry) return <div key={displayPos} />;
                const rank = displayPos === 1 ? 1 : displayPos === 0 ? 2 : 3;
                const heights = ["h-28", "h-36", "h-24"];
                const colors = ["bg-gray-100 border-gray-200", "bg-yellow-50 border-yellow-300", "bg-amber-50 border-amber-200"];
                const isMe = entry.user_login === user?.login;
                return (
                  <div
                    key={entry.user_login}
                    className={`${heights[displayPos]} rounded-2xl border-2 ${colors[displayPos]} ${isMe ? "ring-2 ring-primary" : ""} flex flex-col items-center justify-end p-2 pb-3 gap-1`}
                  >
                    <RankIcon rank={rank} />
                    <div className="text-xs font-semibold text-center leading-tight truncate w-full text-center">
                      {entry.full_name.split(" ")[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.class_name}</div>
                    <div className={`text-base font-bold ${rank === 1 ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {entry.total_score}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border bg-card overflow-hidden">
            {(topThree.length < 3 ? ratings : rest).map((entry, i) => {
              const rank = topThree.length < 3 ? i + 1 : i + 4;
              const isMe = entry.user_login === user?.login;
              return (
                <div
                  key={entry.user_login}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <RankIcon rank={rank} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm truncate ${isMe ? "text-primary" : ""}`}>
                      {entry.full_name} {isMe && <span className="text-xs font-normal">(siz)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.class_name} • {entry.wins}W / {entry.losses}L</div>
                  </div>
                  <div className="text-base font-bold text-primary shrink-0">{entry.total_score}</div>
                </div>
              );
            })}
          </div>

          {user?.login && !ratings.find((r) => r.user_login === user.login) && (
            <div className="text-center text-sm text-muted-foreground py-2">
              Siz hali bu o'yinda ishtirok etmadingiz
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <Trophy className="w-3.5 h-3.5" />
        Har o'yin yutilganda +5, yutqizilganda -2 ball
      </div>
    </div>
  );
}
