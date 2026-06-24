import { useState, useEffect, useCallback } from "react";
import { Medal, Trophy, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface GolibItem {
  id: string; student_name: string; sinf: string; maktab: string;
  ball: number; orin: number;
  event_nomi: string; event_fan: string; bosqich: string; yil: number;
}

const FANLAR = [
  "Matematika","Fizika","Kimyo","Biologiya","Informatika","Ingliz tili",
  "Rus tili","Ona tili va adabiyot","Tarix","Geografiya","Huquq","Iqtisodiyot",
  "Astronomiya","Chizmachilik","Texnologiya",
];
const BOSQICHLAR = ["maktab","tuman","viloyat","respublika"];
const MEDAL = ["🥇","🥈","🥉"];
const MEDAL_BG = [
  "from-yellow-400/20 to-amber-500/20 border-yellow-400/40",
  "from-slate-300/20 to-slate-400/20 border-slate-400/40",
  "from-amber-600/20 to-orange-700/20 border-amber-600/40",
];
const MEDAL_TEXT = ["text-yellow-600","text-slate-600","text-amber-700"];

export default function GoliblarTab() {
  const { toast } = useToast();
  const [goliblar, setGoliblar] = useState<GolibItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFan, setFilterFan] = useState("");
  const [filterBosqich, setFilterBosqich] = useState("");
  const [filterYil, setFilterYil] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFan) params.set("fan", filterFan);
      if (filterBosqich) params.set("bosqich", filterBosqich);
      if (filterYil) params.set("yil", filterYil);
      const r = await fetch(`${API}/olimpiada/goliblar?${params}`, { headers: authH() });
      const d = await r.json() as unknown;
      setGoliblar(Array.isArray(d) ? d as GolibItem[] : []);
    } catch { toast({ variant: "destructive", title: "Yuklab bo'lmadi" }); }
    finally { setLoading(false); }
  }, [filterFan, filterBosqich, filterYil, toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = goliblar.filter(g =>
    !search || g.student_name.toLowerCase().includes(search.toLowerCase()) ||
    g.event_nomi.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = filtered.filter(g => g.orin <= 3).slice(0, 9);
  const rest  = filtered.filter(g => g.orin > 3);

  const years = [...new Set(goliblar.map(g => g.yil))].sort((a,b) => b-a);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center py-4">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-xl font-bold">G'oliblar Zali</h2>
        <p className="text-muted-foreground text-sm mt-1">Olimpiadalarda mukofot o'rinlarini olgan o'quvchilar</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Ism yoki tanlov nomi..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterFan} onChange={e => setFilterFan(e.target.value)}>
          <option value="">Barcha fanlar</option>
          {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterBosqich} onChange={e => setFilterBosqich(e.target.value)}>
          <option value="">Barcha bosqichlar</option>
          {BOSQICHLAR.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterYil} onChange={e => setFilterYil(e.target.value)}>
          <option value="">Barcha yillar</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Medal className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{search || filterFan ? "Qidiruv natijalari yo'q" : "Hali natijalar e'lon qilinmagan"}</p>
          <p className="text-sm mt-1">Olimpiada natijalari e'lon qilingach, bu yerda ko'rinadi</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium cards */}
          {top3.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Mukofot o'rinlari</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {top3.map((g, i) => {
                  const mIdx = g.orin - 1;
                  return (
                    <Card key={g.id} className={`border bg-gradient-to-br ${MEDAL_BG[mIdx] ?? MEDAL_BG[2]} overflow-hidden`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0 mt-1">{MEDAL[mIdx] ?? "🏅"}</div>
                          <div className="min-w-0">
                            <p className={`font-bold text-base leading-tight ${MEDAL_TEXT[mIdx] ?? ""}`}>{g.student_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{g.sinf} · {g.maktab || "—"}</p>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{g.event_nomi}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-background/70 px-1.5 py-0.5 rounded-md">{g.event_fan}</span>
                              <span className="text-xs bg-background/70 px-1.5 py-0.5 rounded-md">{g.yil}</span>
                              <span className={`text-xs font-bold ${MEDAL_TEXT[mIdx] ?? ""}`}>{g.ball} ball</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest of results */}
          {rest.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Boshqa natijalar</h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">O'rin</th>
                      <th className="px-3 py-2 text-left font-medium">Ism</th>
                      <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Sinf</th>
                      <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Tanlov</th>
                      <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Fan</th>
                      <th className="px-3 py-2 text-right font-medium">Ball</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((g, idx) => (
                      <tr key={g.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-3 py-2 font-medium text-center w-12">{g.orin}</td>
                        <td className="px-3 py-2 font-medium">{g.student_name}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{g.sinf}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs max-w-[160px] truncate">{g.event_nomi}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{g.event_fan}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{g.ball}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
