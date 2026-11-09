// Kirish IDlari — faqat O'QITUVCHILAR uchun 5 xonali ID.
// O'quvchilar endi 4 xonali kod bilan kiradi (bot orqali) — bu sahifada ko'rinmaydi.
// Admin: "Yangilash" tugmasi bilan barcha xodimlarga 5 xonali ID beradi.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Printer, RefreshCw, Loader2, Users, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
function authHeaders(): HeadersInit {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${r.status})`);
  return data as T;
}

interface StaffIdRow {
  id: string;
  full_name: string;
  login: string;
  role: string;
  login_id: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  director: "Direktor",
  zam_direktor: "MMTB",
  zavuch: "O'quv ishlari mudiri",
  sinf_rahbari: "Sinf rahbari",
  teacher: "O'qituvchi",
  kutubxonachi: "Kutubxonachi",
  boshlangich_oqituvchi: "Boshlang'ich o'qituvchi",
};

export default function LoginIdsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [myId, setMyId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const isAdmin = user?.role === "admin";
  const canSeeAll = !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);

  // O'z ID sini ko'rish
  useEffect(() => {
    api<{ login_id: string }>("/auth/my-id").then((d) => setMyId(d.login_id)).catch(() => {});
  }, []);

  // Barcha xodimlar ro'yxati (5 xonali ID lar bilan)
  const staffList = useQuery<StaffIdRow[]>({
    queryKey: ["staff-ids-all"],
    queryFn: () => api<StaffIdRow[]>("/admin/staff-ids"),
    enabled: canSeeAll,
  });

  // Statistika
  const stats = (() => {
    const rows = staffList.data ?? [];
    const withId = rows.filter(r => r.login_id && r.login_id.length === 5).length;
    const withoutId = rows.filter(r => !r.login_id || r.login_id.length !== 5).length;
    return { total: rows.length, withId, withoutId };
  })();

  // Barcha ID larni yangilash (5 xonali formatda)
  const handleRegenerateAll = async () => {
    if (!confirm("Barcha xodimlarga yangi 5 xonali ID berilsinmi?\n\nEski ID lar bekor qilinadi va yangilari beriladi. Bu amalni qaytarib bo'lmaydi.")) return;
    setRegenerating(true);
    try {
      const r = await api<{ updated: number }>("/admin/staff-ids/regenerate-all", { method: "POST" });
      toast({ title: "Yangilandi ✅", description: `${r.updated} ta xodimga yangi 5 xonali ID berildi` });
      await qc.invalidateQueries({ queryKey: ["staff-ids-all"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setRegenerating(false);
    }
  };

  // Bitta ID ni yangilash
  const regenerateOne = async (staffId: string, fullName: string) => {
    if (!confirm(`${fullName} uchun yangi 5 xonali ID berilsinmi?`)) return;
    try {
      await api<{ login_id: string }>("/admin/staff-ids/regenerate", {
        method: "POST",
        body: JSON.stringify({ staff_id: staffId }),
      });
      toast({ title: "Yangilandi ✅" });
      await qc.invalidateQueries({ queryKey: ["staff-ids-all"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
  };

  const print = () => window.print();

  return (
    <div className="space-y-4 max-w-3xl">
      <style>{`@media print { .no-print { display:none !important; } body * { visibility:hidden; } .print-area, .print-area * { visibility:visible; } .print-area { position:fixed; inset:0; padding:24px; } }`}</style>

      {/* Sarlavha */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kirish ID lari</h1>
          <Badge variant="outline" className="text-xs">O'qituvchilar uchun</Badge>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => void staffList.refetch()}>
          <RefreshCw className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Yangilash</span>
        </Button>
        <Button size="sm" onClick={print}>
          <Printer className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Chop etish</span>
        </Button>
      </div>

      {/* Ogohlantirish — o'quvchilar endi bu sahifada yo'q */}
      <Card className="no-print border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <b>Diqqat:</b> O'quvchilar endi <b>4 xonali kod</b> bilan kiradi (bot orqali). Bu sahifada faqat
            <b> o'qituvchilar va xodimlar</b> uchun 5 xonali ID ko'rsatiladi.
          </div>
        </CardContent>
      </Card>

      {/* O'z ID si */}
      {myId && (
        <div className="no-print rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sizning kirish ID</div>
            <div className="text-2xl font-bold font-mono tracking-[0.3em] text-primary">{myId}</div>
          </div>
        </div>
      )}

      {/* Statistika */}
      {canSeeAll && staffList.data && (
        <div className="no-print grid grid-cols-3 gap-2">
          <Card className="border-border">
            <CardContent className="py-3 text-center">
              <div className="text-xs text-muted-foreground font-bold uppercase">Jami</div>
              <div className="text-2xl font-black text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-3 text-center">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Bor
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.withId}</div>
            </CardContent>
          </Card>
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="py-3 text-center">
              <div className="text-xs text-rose-700 dark:text-rose-300 font-bold uppercase flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Yo'q
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.withoutId}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Yangilash tugmasi (faqat admin) */}
      {isAdmin && stats.withoutId > 0 && (
        <Card className="no-print border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                {stats.withoutId} ta xodimga 5 xonali ID berilmagan
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                "Hammasini yangilash" tugmasi barcha xodimlarga yangi 5 xonali ID beradi.
              </div>
            </div>
            <Button
              onClick={handleRegenerateAll}
              disabled={regenerating}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
              Hammasini yangilash
            </Button>
          </CardContent>
        </Card>
      )}

      {staffList.isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {staffList.isError && <div className="text-destructive text-sm">{(staffList.error as Error).message}</div>}

      {/* Ro'yxat */}
      {staffList.data && staffList.data.length > 0 && (
        <div className="print-area">
          <div className="text-lg font-bold mb-3 hidden print:block">
            Xodimlar — 5 xonali kirish IDlari
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            {staffList.data.map((r, i) => {
              const hasId = r.login_id && r.login_id.length === 5;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <span className="w-7 text-right text-muted-foreground text-sm tabular-nums">{i + 1}.</span>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {r.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[r.role] ?? r.role}</div>
                  </div>
                  {hasId ? (
                    <span className="font-mono font-bold text-lg tracking-widest text-primary w-24 text-right">
                      {r.login_id}
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-xs border-rose-400 text-rose-500">Yo'q</Badge>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="no-print"
                      onClick={() => void regenerateOne(r.id, r.full_name)}
                      title="Yangi ID berish"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Jami: {staffList.data.length} ta xodim
            {stats.withoutId > 0 && ` · ${stats.withoutId} tasiga ID berilmagan`}
          </div>
        </div>
      )}

      {!canSeeAll && !staffList.isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold">Ruxsat yo'q</p>
            <p className="text-xs mt-1">Bu sahifa faqat rahbariyat uchun</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
                                               }
