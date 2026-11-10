// Kirish IDlari — xodimlar (o'qituvchi va rahbariyat) uchun 5 xonali ID.
// Ekranda chiroyli jadval, "Chop etish" esa rasmiy A4 varaqni chiqaradi.

import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound, Printer, RefreshCw, Loader2, Users, Wand2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("talim_auth_token");
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });
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
  subjects?: string[] | null;
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

// Ro'yxatdagi tartib: avval rahbariyat, keyin o'qituvchilar
const ROLE_ORDER = [
  "director", "zam_direktor", "zavuch", "sinf_rahbari",
  "teacher", "boshlangich_oqituvchi", "kutubxonachi",
];

const roleRank = (role: string) => {
  const i = ROLE_ORDER.indexOf(role);
  return i === -1 ? 99 : i;
};

// Lavozim matni: fan bor bo'lsa "Matematika o'qituvchisi" ko'rinishida
function positionLabel(r: StaffIdRow): string {
  const subjects = (r.subjects ?? []).filter(Boolean);
  if (subjects.length > 0) {
    if (r.role === "teacher") return `${subjects.join(", ")} o'qituvchisi`;
    if (r.role === "sinf_rahbari") return `Sinf rahbari (${subjects.join(", ")} o'qituvchisi)`;
  }
  return ROLE_LABELS[r.role] ?? r.role;
}

function todayStr(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Jadval: ekran va chop etish uchun bir xil
function StaffTable({
  rows,
  actions,
}: {
  rows: StaffIdRow[];
  actions?: (r: StaffIdRow) => ReactNode;
}) {
  return (
    <table className="w-full border-collapse text-sm text-slate-900 bg-white">
      <thead>
        <tr className="bg-[#1e2a5a] text-white">
          <th className="px-3 py-2.5 text-left font-semibold w-10">№</th>
          <th className="px-3 py-2.5 text-left font-semibold">F.I.O</th>
          <th className="px-3 py-2.5 text-left font-semibold">Lavozim</th>
          <th className="px-3 py-2.5 text-center font-semibold w-36">Kirish ID</th>
          {actions && <th className="px-3 py-2.5 w-12 no-print" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const hasId = !!r.login_id && r.login_id.length === 5;
          return (
            <tr
              key={r.id}
              className={`${i % 2 ? "bg-slate-50" : "bg-white"} border-b border-slate-200`}
              style={{ pageBreakInside: "avoid" }}
            >
              <td className="px-3 py-2.5 text-slate-500 tabular-nums">{i + 1}</td>
              <td className="px-3 py-2.5 font-semibold">{r.full_name}</td>
              <td className="px-3 py-2.5">{positionLabel(r)}</td>
              <td className="px-3 py-2.5 text-center">
                {hasId ? (
                  <span className="font-mono text-lg font-black tracking-[0.25em] text-[#1e2a5a]">
                    {r.login_id}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-rose-500">Berilmagan</span>
                )}
              </td>
              {actions && <td className="px-3 py-2.5 text-right no-print">{actions(r)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function LoginIdsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [myId, setMyId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const isAdmin = user?.role === "admin";
  const canSeeAll =
    !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);

  useEffect(() => {
    api<{ login_id: string }>("/auth/my-id")
      .then((d) => setMyId(d.login_id))
      .catch(() => {});
  }, []);

  const staffList = useQuery<StaffIdRow[]>({
    queryKey: ["staff-ids-all"],
    queryFn: () => api<StaffIdRow[]>("/admin/staff-ids"),
    enabled: canSeeAll,
  });

  // Admin akkaunti ro'yxatga kirmaydi; qolganlari lavozim tartibida chiqadi
  const rows = useMemo(() => {
    return (staffList.data ?? [])
      .filter((r) => r.role !== "admin")
      .sort(
        (a, b) =>
          roleRank(a.role) - roleRank(b.role) ||
          a.full_name.localeCompare(b.full_name, "uz")
      );
  }, [staffList.data]);

  const stats = useMemo(() => {
    const withId = rows.filter((r) => r.login_id && r.login_id.length === 5).length;
    return { total: rows.length, withId, withoutId: rows.length - withId };
  }, [rows]);

  const handleRegenerateAll = async () => {
    if (!confirm("Barcha xodimlarga yangi 5 xonali ID berilsinmi?\n\nEski ID lar bekor qilinadi. Bu amalni qaytarib bo'lmaydi.")) return;
    setRegenerating(true);
    try {
      const r = await api<{ updated: number }>("/admin/staff-ids/regenerate-all", { method: "POST" });
      toast({ title: "Yangilandi ✅", description: `${r.updated} ta xodimga yangi ID berildi` });
      await qc.invalidateQueries({ queryKey: ["staff-ids-all"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setRegenerating(false);
    }
  };

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
    <div className="space-y-4 max-w-4xl">
      {/* Chop etish uchun uslublar */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #print-sheet, #print-sheet * { visibility: visible; }
          #print-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #fff; color: #0f172a;
          }
          #print-sheet thead { display: table-header-group; }
          #print-sheet tr { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Sarlavha */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kirish ID lari</h1>
          <Badge variant="outline" className="text-xs">Xodimlar uchun</Badge>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => void staffList.refetch()}>
          <RefreshCw className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Yangilash</span>
        </Button>
        <Button size="sm" onClick={print} disabled={rows.length === 0}>
          <Printer className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Chop etish</span>
        </Button>
      </div>

      {/* Ogohlantirish */}
      <Card className="no-print border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <b>Diqqat:</b> O'quvchilar <b>4 xonali kod</b> bilan kiradi (bot orqali). Bu sahifada faqat{" "}
            <b>xodimlar</b> uchun 5 xonali ID ko'rsatiladi.
          </div>
        </CardContent>
      </Card>

      {/* Shaxsiy ID */}
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
          <Card>
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

      {/* Hammasini yangilash (faqat admin) */}
      {isAdmin && stats.withoutId > 0 && (
        <Card className="no-print border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                {stats.withoutId} ta xodimga ID berilmagan
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                "Hammasini yangilash" barcha xodimlarga yangi 5 xonali ID beradi.
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

      {staffList.isLoading && (
        <div className="flex justify-center py-8 no-print"><Loader2 className="w-6 h-6 animate-spin" /></div>
      )}
      {staffList.isError && (
        <div className="text-destructive text-sm no-print">{(staffList.error as Error).message}</div>
      )}

      {/* Ekrandagi jadval */}
      {rows.length > 0 && (
        <div className="no-print rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <StaffTable
              rows={rows}
              actions={
                isAdmin
                  ? (r) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void regenerateOne(r.id, r.full_name)}
                        title="Yangi ID berish"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                    )
                  : undefined
              }
            />
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground bg-slate-50 border-t border-slate-200">
            Jami: {rows.length} ta xodim
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

      {/* Chop etish varag'i (faqat chop etishda ko'rinadi) */}
      <div id="print-sheet" className="hidden print:block">
        <div className="flex items-center justify-between gap-4 border-b-4 border-[#1e2a5a] pb-3 mb-4">
          <img src="/tuman-logo.jpg" alt="" className="h-20 w-20 object-contain" />
          <div className="text-center flex-1">
            <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Toshloq tumani</div>
            <div className="text-lg font-black text-[#1e2a5a] leading-tight">
              Maktabgacha va maktab ta'limi bo'limi
            </div>
            <div className="text-sm font-bold mt-1 text-slate-700">
              TA'LIM PLATFORM — XODIMLAR KIRISH IDLARI
            </div>
          </div>
          <img src="/kelajak-logo.jpg" alt="" className="h-20 w-20 object-contain rounded-lg" />
        </div>

        <div className="rounded-lg overflow-hidden border border-slate-300">
          <StaffTable rows={rows} />
        </div>

        <div className="mt-3 text-xs text-slate-600 flex justify-between">
          <span>Jami: <b>{rows.length}</b> ta xodim</span>
          <span>Sana: <b>{todayStr()}</b></span>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-16 text-sm">
          <div>
            <div className="border-b border-slate-700 h-8" />
            <div className="mt-1 text-slate-600">Direktor (imzo)</div>
          </div>
          <div>
            <div className="border-b border-slate-700 h-8" />
            <div className="mt-1 text-slate-600">M.O.</div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
          <b>Diqqat:</b> ushbu kirish IDlari maxfiy. Har bir ID faqat tegishli xodimga beriladi
          va uchinchi shaxslarga berilmaydi.
        </div>
      </div>
    </div>
  );
  }
