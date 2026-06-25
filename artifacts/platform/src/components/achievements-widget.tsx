import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

interface Achievement {
  id: string; emoji: string; title: string; desc: string; earned: boolean;
}

interface AchievementsData {
  achievements: Achievement[];
  streak: number;
  total5s: number;
  total_grades: number;
}

export function AchievementsWidget({ login }: { login: string }) {
  const { data } = useQuery<AchievementsData>({
    queryKey: ["achievements", login],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/reyting/achievements/${login}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) return { achievements: [], streak: 0, total5s: 0, total_grades: 0 };
      return r.json() as Promise<AchievementsData>;
    },
    staleTime: 5 * 60_000,
  });

  const earned = data?.achievements.filter(a => a.earned) ?? [];
  const locked = data?.achievements.filter(a => !a.earned) ?? [];
  const all = [...earned, ...locked];

  if (all.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Award className="w-4 h-4" />
          Yutuqlar
          {earned.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              {earned.length}/{all.length} ta olindi
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data?.streak && data.streak >= 3 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 px-3 py-2">
            <span className="text-lg">🔥</span>
            <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
              {data.streak} kun ketma-ket darsga kelmoqdasiz!
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {all.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              title={`${a.title}: ${a.desc}`}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all cursor-default ${
                a.earned
                  ? "bg-gradient-to-b from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800"
                  : "bg-muted/40 border-border opacity-40 grayscale"
              }`}
            >
              <span className="text-xl">{a.emoji}</span>
              <p className="text-[9px] font-medium text-center leading-tight line-clamp-2">
                {a.title}
              </p>
              {a.earned && (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              )}
            </motion.div>
          ))}
        </div>

        {earned.length === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Birinchi bahongizni oling va yutuqlar ochiladi! 🌟
          </p>
        )}
      </CardContent>
    </Card>
  );
}
