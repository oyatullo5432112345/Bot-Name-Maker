// Bosh sahifa: oylik "Tasdiqlash" kartasi (hamma uchun) va maktab faolligi "+" ko'rinishi (rahbariyat uchun).
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldCheck, Activity } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
  return data as T;
}

interface StatusRes { confirmed: boolean }
interface ConfirmAnalytics { period: string; schools: { maktab_id: number; nom: string; total: number; confirmed: number }[] }

/** Oyiga bir marta — "Men o'zimman" tasdiqlash */
export function ConfirmCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const status = useQuery<StatusRes>({
    queryKey: ["confirm-status"],
    queryFn: () => call<StatusRes>("/confirm/status"),
    enabled: !!user,
  });
  const confirm = useMutation({
    mutationFn: () => call<{ ok: boolean }>("/confirm", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["confirm-status"] });
      void qc.invalidateQueries({ queryKey: ["confirm-analytics"] });
    },
  });

  if (!user) return null;
  const done = status.data?.confirmed || confirm.isSuccess;

  return (
    <Card className={done ? "border-emerald-500/40" : "border-primary/40"}>
      <CardContent className="py-4 flex items-center gap-3 flex-wrap">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/15 text-primary"}`}>
          {done ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-semibold">{done ? "Bu oy tasdiqlandi ✅" : "Siz o'zingizmisiz?"}</div>
          <div className="text-xs text-muted-foreground">
            {done ? "Bu oylik faollik qayd etildi" : "Oyiga bir marta tasdiqlang — maktab faolligiga +1 qo'shiladi"}
          </div>
          {confirm.isError && <div className="text-xs text-destructive mt-1">{(confirm.error as Error).message}</div>}
        </div>
        {!done && (
          <Button onClick={() => confirm.mutate()} disabled={confirm.isPending || status.isLoading}>
            {confirm.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Tasdiqlash
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const MAX_PLUS = 60; // ekranga sig'adigan eng ko'p "+" belgisi

/** Rahbariyat: har maktabda bu oy tasdiqlaganlar soni — har bir kishiga bitta "+" */
export function ConfirmPluses() {
  const q = useQuery<ConfirmAnalytics>({
    queryKey: ["confirm-analytics"],
    queryFn: () => call<ConfirmAnalytics>("/analytics/confirm"),
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Maktab faolligi (bu oy)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}
        {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}
        {(q.data?.schools ?? []).map((s) => {
          const pct = s.total > 0 ? Math.round((s.confirmed / s.total) * 100) : 0;
          const shown = Math.min(s.confirmed, MAX_PLUS);
          return (
            <div key={s.maktab_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.nom}</span>
                <span className="text-muted-foreground tabular-nums">{s.confirmed} / {s.total} · {pct}%</span>
              </div>
              <div className="font-mono text-emerald-600 dark:text-emerald-400 leading-relaxed break-all min-h-[1.5rem]">
                {s.confirmed === 0 ? <span className="text-muted-foreground font-sans">hali tasdiqlanmagan</span> : (
                  <>
                    {"+".repeat(shown)}
                    {s.confirmed > MAX_PLUS && <span className="ml-1 font-sans text-xs">+{s.confirmed - MAX_PLUS}</span>}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {q.data && q.data.schools.length === 0 && <div className="text-sm text-muted-foreground">Ma'lumot yo'q</div>}
      </CardContent>
    </Card>
  );
}
