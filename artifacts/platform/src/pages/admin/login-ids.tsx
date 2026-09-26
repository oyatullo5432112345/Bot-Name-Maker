// Kirish IDlari — rahbariyat/o'qituvchi o'quvchilarga 5 xonali kirish IDsini ko'radi va chop etadi.
// Face ID ishlamaganda o'quvchi shu ID bilan platformaga kiradi.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Printer, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

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

interface ClassRow { class_name: string }
interface IdRow { full_name: string; login: string; login_id: string; class_name?: string }

const ALL = "__all__";

export default function LoginIdsPage() {
  const { user } = useAuth();
  const scoped = !!user && ["teacher", "sinf_rahbari"].includes(user.role); // o'z sinfini ko'radi
  const [cls, setCls] = useState<string>(scoped ? (user?.class_name ?? "") : ALL);
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    api<{ login_id: string }>("/auth/my-id").then((d) => setMyId(d.login_id)).catch(() => {});
  }, []);

  const classes = useQuery<ClassRow[]>({
    queryKey: ["faceid-classes-for-ids"],
    queryFn: () => api<ClassRow[]>("/faceid/classes"),
    enabled: !scoped,
  });
  const list = useQuery<IdRow[]>({
    queryKey: ["login-ids", cls],
    queryFn: () => api<IdRow[]>(`/auth/login-ids?class_name=${encodeURIComponent(cls)}`),
    enabled: scoped || !!cls,
  });
  const showClassCol = cls === ALL;

  const print = () => window.print();

  return (
    <div className="space-y-4 max-w-3xl">
      <style>{`@media print { .no-print { display:none !important; } body * { visibility:hidden; } .print-area, .print-area * { visibility:visible; } .print-area { position:fixed; inset:0; padding:24px; } }`}</style>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kirish IDlari</h1>
        </div>
        <div className="flex-1" />
        {!scoped && (
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sinf" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Hamma sinflar</SelectItem>
              {(classes.data ?? []).map((c) => <SelectItem key={c.class_name} value={c.class_name}>{c.class_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={() => void list.refetch()}><RefreshCw className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Yangilash</span></Button>
        <Button size="sm" onClick={print}><Printer className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Chop etish</span></Button>
      </div>

      {myId && (
        <div className="no-print rounded-2xl border bg-primary/5 px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">Sizning kirish ID</div>
            <div className="text-2xl font-bold font-mono tracking-[0.3em]">{myId}</div>
          </div>
        </div>
      )}

      <Card className="no-print">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Har bir o'quvchining 5 xonali kirish IDsi. Face ID ishlamaganda o'quvchi shu ID bilan kiradi.
          Ro'yxatni chop etib, o'quvchilarga bering. IDlarni sir tuting.
        </CardContent>
      </Card>

      {list.isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {list.isError && <div className="text-destructive text-sm">{(list.error as Error).message}</div>}

      <div className="print-area">
        <div className="text-lg font-bold mb-2 hidden print:block">
          {cls === ALL ? "Hamma sinflar" : (cls || user?.class_name)} — kirish IDlari
        </div>
        <div className="rounded-xl border divide-y">
          {(list.data ?? []).map((r, i) => (
            <div key={r.login} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 text-right text-muted-foreground text-sm">{i + 1}.</span>
              <span className="flex-1 font-medium truncate">{r.full_name}</span>
              {showClassCol && r.class_name && <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{r.class_name}</span>}
              <span className="font-mono font-bold text-lg tracking-widest w-20 text-right">{r.login_id}</span>
            </div>
          ))}
          {list.data && list.data.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">Topilmadi</div>}
        </div>
        {list.data && list.data.length > 0 && <div className="mt-2 text-xs text-muted-foreground">Jami: {list.data.length} ta</div>}
      </div>
    </div>
  );
}
