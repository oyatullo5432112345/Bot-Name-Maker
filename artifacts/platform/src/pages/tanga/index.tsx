import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, ShoppingBag, History, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnvonSummary, UnvonlarList } from "@/components/unvonlar";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Unvon {
  id: string; title: string; emoji: string; min_tanga: number;
  color: string; description: string; special?: string;
}
interface MyTanga {
  grade_tanga: number; bonus_tanga: number; spent: number; total: number;
  unvon: Unvon; next_unvon: Unvon | null;
  history: Array<{ reason: string; amount: number; source: string; created_at: string }>;
}
interface LeaderEntry {
  rank: number; login: string; name: string; class_name: string;
  total: number; unvon: Unvon;
}
interface ShopItem {
  id: string; name: string; cost: number; emoji: string; purchased: boolean;
}

type Tab = "mening" | "reyting" | "dokon" | "unvonlar";

const SOURCES: Record<string, string> = {
  grade: "📝 Baho", olimpiada: "🏟️ Olimpiada", attendance: "✅ Davomat",
  birthday: "🎂 Tug'ilgan kun", daily_login: "🔑 Kunlik kirish",
  game: "🎮 O'yin", shop: "🛍️ Do'kon", manual: "👤 Admin",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

export default function TangaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("mening");
  const isStudent = user?.role === "student";

  const { data: myData, isLoading: myLoading } = useQuery<MyTanga>({
    queryKey: ["tanga-my"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/tanga/my`, { headers: authH() });
      if (!r.ok) throw new Error("Yuklab bo'lmadi");
      return r.json() as Promise<MyTanga>;
    },
    enabled: isStudent && tab === "mening",
    staleTime: 60_000,
  });

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery<LeaderEntry[]>({
    queryKey: ["tanga-leaderboard"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/tanga/leaderboard`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<LeaderEntry[]>;
    },
    enabled: tab === "reyting",
    staleTime: 2 * 60_000,
  });

  const { data: shopItems = [], isLoading: shopLoading } = useQuery<ShopItem[]>({
    queryKey: ["tanga-shop"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/tanga/shop`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ShopItem[]>;
    },
    enabled: isStudent && tab === "dokon",
    staleTime: 60_000,
  });

  // Kunlik login bonusi — sahifa ochilganda avtomatik
  useEffect(() => {
    if (!isStudent) return;
    fetch(`${API_BASE}/tanga/daily-login`, { method: "POST", headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; message?: string }) => {
        if (d.ok && d.message) {
          toast({ title: "🪙 " + d.message });
          void qc.invalidateQueries({ queryKey: ["tanga-my"] });
        }
      })
      .catch(() => {});
  }, [isStudent]);

  const buyMutation = useMutation({
    mutationFn: async (item_id: string) => {
      const r = await fetch(`${API_BASE}/tanga/shop/buy`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ item_id }),
      });
      const d = await r.json() as { ok?: boolean; message?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Xatolik");
      return d;
    },
    onSuccess: (d) => {
      toast({ title: "✅ " + (d.message ?? "Muvaffaqiyatli!") });
      void qc.invalidateQueries({ queryKey: ["tanga-shop"] });
      void qc.invalidateQueries({ queryKey: ["tanga-my"] });
    },
    onError: (e: Error) => {
      toast({ title: "❌ " + e.message, variant: "destructive" });
    },
  });

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    ...(isStudent ? [{ id: "mening" as Tab, label: "Mening", icon: "🪙" }] : []),
    { id: "reyting", label: "Reyting", icon: <Trophy className="w-3.5 h-3.5" /> },
    ...(isStudent ? [{ id: "dokon" as Tab, label: "Do'kon", icon: <ShoppingBag className="w-3.5 h-3.5" /> }] : []),
    { id: "unvonlar", label: "Unvonlar", icon: <Crown className="w-3.5 h-3.5" /> },
  ];

  const myLogin = user?.login;
  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xl shadow">
          🪙
        </div>
        <div>
          <h1 className="text-xl font-bold">Tanga Tizimi</h1>
          <p className="text-sm text-muted-foreground">Baholar, faollik va yutuqlar uchun tanga to'pla!</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ===================== MENING ===================== */}
      {tab === "mening" && isStudent && (
        myLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : myData ? (
          <div className="space-y-4">
            {/* Balans kartochkasi */}
            <div className="rounded-2xl p-5 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${myData.unvon.color}CC, ${myData.unvon.color})` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm">Jami tanga</p>
                  <p className="text-5xl font-black mt-1">{myData.total}</p>
                  <p className="text-white/80 text-xs mt-1">🪙 tanga</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl">{myData.unvon.emoji}</p>
                  <p className="text-sm font-bold mt-1">{myData.unvon.title}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/20 rounded-xl p-2">
                  <p className="text-xl font-bold">{myData.grade_tanga}</p>
                  <p className="text-[10px] text-white/70">📝 Baholar</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2">
                  <p className="text-xl font-bold">{myData.bonus_tanga}</p>
                  <p className="text-[10px] text-white/70">🎁 Bonuslar</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2">
                  <p className="text-xl font-bold">{myData.spent}</p>
                  <p className="text-[10px] text-white/70">🛍️ Sarflangan</p>
                </div>
              </div>
            </div>

            {/* Joriy unvon va keyingi unvongacha progress */}
            <UnvonSummary userCoins={myData.total} />

            {/* Tanga formulasi */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  📐 Kunlik tanga formulasi
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  Kunlik 5 ta dars bahosi yig'indisi ÷ 5 = o'rtacha baho → tanga
                </p>
                <div className="space-y-1.5">
                  {[
                    { range: "4.5 – 5.0", tanga: 15, color: "text-green-600 dark:text-green-400" },
                    { range: "4.0 – 4.4", tanga: 10, color: "text-blue-600 dark:text-blue-400" },
                    { range: "3.5 – 3.9", tanga: 6,  color: "text-yellow-600 dark:text-yellow-400" },
                    { range: "3.0 – 3.4", tanga: 3,  color: "text-orange-500 dark:text-orange-400" },
                    { range: "3.0 dan past", tanga: 0, color: "text-muted-foreground" },
                  ].map(row => (
                    <div key={row.range} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{row.range}</span>
                      <span className={`font-bold ${row.color}`}>
                        {row.tanga > 0 ? `+${row.tanga} 🪙` : "0 tanga"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Qo'shimcha tanga manbalari */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🎯 Qo'shimcha tanga manbalari</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Olimpiadaga ro'yxatdan o'tish", "+5 🪙"],
                    ["Olimpiadada qatnashish", "+10 🪙"],
                    ["Olimpiadada 3-o'rin", "+30 🪙"],
                    ["Olimpiadada 2-o'rin", "+50 🪙"],
                    ["Olimpiadada 1-o'rin", "+100 🪙"],
                    ["Bir hafta ketma-ket kelish", "+10 🪙"],
                    ["Bir oy davomida qolmaslik", "+30 🪙"],
                    ["Saytga har kuni kirish", "+2 🪙"],
                    ["Tug'ilgan kunda sovg'a", "+20 🪙"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{val}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tarix */}
            {myData.history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" /> So'nggi harakatlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {myData.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium">{h.reason}</p>
                        <p className="text-muted-foreground">{SOURCES[h.source] ?? h.source} · {formatDate(h.created_at)}</p>
                      </div>
                      <span className={`font-bold tabular-nums ${h.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {h.amount > 0 ? "+" : ""}{h.amount} 🪙
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Ma'lumot yuklab bo'lmadi</CardContent></Card>
        )
      )}

      {/* ===================== REYTING ===================== */}
      {tab === "reyting" && (
        lbLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : leaderboard.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Hali ma'lumot yo'q</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {leaderboard.map(s => (
              <Card
                key={s.login}
                className={s.login === myLogin ? "border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10 ring-1 ring-amber-400/30" : ""}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {MEDAL[s.rank] ? (
                        <span className="text-xl">{MEDAL[s.rank]}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground tabular-nums">{s.rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{s.unvon.emoji}</span>
                        <p className={`font-semibold text-sm truncate ${s.login === myLogin ? "text-amber-600 dark:text-amber-400" : ""}`}>
                          {s.name}
                          {s.login === myLogin && <span className="text-[10px] ml-1 text-amber-500">(Sen)</span>}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.class_name} · {s.unvon.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">{s.total}</p>
                      <p className="text-[10px] text-muted-foreground">🪙 tanga</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ===================== DO'KON ===================== */}
      {tab === "dokon" && isStudent && (
        shopLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                💡 Tangalaringizni maxsus imtiyozlarga almashtiring! Sotib olingan narsalar profilingizda ko'rinadi.
              </p>
            </div>
            <div className="grid gap-3">
              {shopItems.map(item => (
                <Card key={item.id} className={item.purchased ? "opacity-70" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{item.cost} 🪙</p>
                      </div>
                      {item.purchased ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs">✅ Sotib olingan</Badge>
                      ) : (
                        <button
                          onClick={() => buyMutation.mutate(item.id)}
                          disabled={buyMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Sotib ol
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      )}

      {/* ===================== UNVONLAR ===================== */}
      {tab === "unvonlar" && (
        <UnvonlarList userCoins={isStudent ? (myData?.total ?? 0) : 0} />
      )}
    </div>
  );
}
