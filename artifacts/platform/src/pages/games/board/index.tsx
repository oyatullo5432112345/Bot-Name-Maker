import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Grid3x3, Trophy, ArrowLeft, Loader2, Trash2, PlayCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface BoardGameRow {
  id: string; title: string; subject: string | null; class_name: string | null;
  team_count: number; cell_count: number; session_status: string;
  created_by_login: string | null; play_count: number; last_played_at: string | null;
}

export default function BoardGameListPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [statsOpenId, setStatsOpenId] = useState<string | null>(null);

  const { data: games = [], isLoading } = useQuery<BoardGameRow[]>({
    queryKey: ["board-games", search, mineOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (mineOnly) params.set("mine", "true");
      const r = await fetch(`${API_BASE}/board-games?${params.toString()}`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Bu o'yinni butunlay o'chirasizmi?")) return;
    const r = await fetch(`${API_BASE}/board-games/${id}`, { method: "DELETE", headers: authH() });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast({ variant: "destructive", title: "Xatolik", description: json.error ?? "O'chirib bo'lmadi" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["board-games"] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/games" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> O'yinlarga qaytish
      </Link>

      <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-card to-card p-6 sm:p-7">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-blue-400" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-400/80 uppercase tracking-widest mb-1">Guruh o'yini</p>
              <h1 className="text-2xl font-bold tracking-tight">Bamboozle</h1>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-md">Jamoalar bo'lib o'ynaladigan savol-javob o'yini — bonus, jarima va o'g'irlash katakchalari bilan</p>
            </div>
          </div>
          <Link href="/games/board/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> Yangi o'yin</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Qidirish (nomi yoki fani)..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button
          variant={mineOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setMineOnly(m => !m)}
          className="shrink-0"
        >
          Mening o'yinlarim
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : games.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            {mineOnly ? "Siz hali o'yin yaratmagansiz" : "Hali o'yin yaratilmagan"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map(g => {
            const isOwner = g.created_by_login === user?.login;
            const statsOpen = statsOpenId === g.id;
            return (
              <Card key={g.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <Link href={`/games/board/${g.id}`}>
                    <div className="cursor-pointer">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {g.team_count} jamoa
                        </span>
                        <span className="text-xs font-medium bg-muted rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Grid3x3 className="w-3 h-3" /> {g.cell_count} katak
                        </span>
                        {g.session_status === "finished" && (
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Yakunlangan
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold truncate">{g.title}</h3>
                      {g.subject && <p className="text-muted-foreground text-sm truncate">{g.subject}</p>}
                      {g.class_name && <p className="text-xs text-muted-foreground mt-0.5">{g.class_name}</p>}
                    </div>
                  </Link>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <button
                      onClick={() => setStatsOpenId(statsOpen ? null : g.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> {g.play_count ?? 0} marta o'ynalgan
                      {statsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isOwner && (
                      <button onClick={(e) => handleDelete(g.id, e)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {statsOpen && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                      {g.last_played_at
                        ? `Oxirgi marta: ${new Date(g.last_played_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Hali o'ynalmagan"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
