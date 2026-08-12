import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import { Trophy, Gamepad2, Wallet, Medal, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// ─────────────────────────────────────────────────────────────
// Reyting Markazi — avval 4 ta mustaqil sahifada tarqoq bo'lgan
// reyting tizimlarini (baholar, o'yinlar, tanga/unvon, olimpiada)
// bitta joyga jamlaydi. Har birining backend/mantiqi o'z holicha
// ajratilgan qoladi — faqat foydalanuvchiga bitta "eshik" ko'rsatiladi.
// ─────────────────────────────────────────────────────────────

interface Card {
  key: string;
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
}

const CARDS: Card[] = [
  {
    key: "baholar",
    title: "Baholar reytingi",
    desc: "O'quvchilar, sinflar va fanlar bo'yicha eng yuqori baholovchilar",
    href: "/reyting",
    icon: <Medal className="w-6 h-6" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    key: "oyinlar",
    title: "O'yinlar reytingi",
    desc: "Ta'lim o'yinlarida to'plangan ballar bo'yicha eng zo'rlar",
    href: "/games/reyting",
    icon: <Gamepad2 className="w-6 h-6" />,
    gradient: "from-pink-500 to-rose-600",
  },
  {
    key: "tanga",
    title: "Tanga va unvonlar",
    desc: "Tanga to'plab unvon oshiring — reyting jadvali",
    href: "/tanga",
    icon: <Wallet className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    key: "olimpiada",
    title: "Olimpiada reytingi",
    desc: "Tuman va maktab bo'yicha olimpiada g'oliblari",
    href: "/olimpiada",
    icon: <Trophy className="w-6 h-6" />,
    gradient: "from-emerald-500 to-teal-600",
  },
];

interface TangaInfo { total: number; unvon: { title: string; emoji: string } }

export default function ReytingMarkaziPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const { data: tanga } = useQuery<TangaInfo>({
    queryKey: ["reyting-markazi-tanga"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/tanga/my`, { headers: authH() });
      if (!r.ok) throw new Error("err");
      return r.json() as Promise<TangaInfo>;
    },
    enabled: isStudent,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reyting Markazi</h1>
        <p className="text-muted-foreground mt-1">
          Barcha reyting turlari — bitta joyda
        </p>
      </div>

      {isStudent && tanga && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Sizning holatingiz</p>
            <p className="text-2xl font-bold mt-0.5">{tanga.unvon.emoji} {tanga.unvon.title}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{tanga.total}</p>
            <p className="text-white/70 text-xs">🪙 tanga</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.key} href={c.href}>
            <div className="group relative rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card">
              <div className={`h-2 bg-gradient-to-r ${c.gradient}`} />
              <div className="p-5 flex items-center gap-4">
                <div className={`shrink-0 rounded-xl p-3 bg-gradient-to-br ${c.gradient} text-white shadow-sm`}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{c.title}</h3>
                  <p className="text-muted-foreground text-sm mt-0.5">{c.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Har bir reyting turi o'z mantig'i bo'yicha alohida hisoblanadi — bu yerda esa faqat
        ularning barchasiga tezroq o'tish uchun bitta markaziy sahifa jamlangan.
      </div>
    </div>
  );
}
