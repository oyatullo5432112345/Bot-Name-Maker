// Face ID — bugungi keldi/ketdini qo'lda to'g'rilash (rahbariyat / sinf rahbari).
// Ruxsat bilan erta ketgan, yoki Face ID ishlamagan holatlar uchun.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, LogIn, DoorOpen, ShieldCheck, X, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/face";

interface ClassRow { class_name: string }
interface TodayRow {
  login: string; full_name: string;
  arrived: string | null; status: string | null;
  left: string | null; early: boolean; excused: boolean;
}

export default function FaceTodayPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const scoped = !!user && ["sinf_rahbari"].includes(user.role);
  const isManager = !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const [cls, setCls] = useState<string>(scoped ? (user?.class_name ?? "") : "");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");

  const classes = useQuery<ClassRow[]>({
    queryKey: ["faceid-classes-today"],
    queryFn: () => api<ClassRow[]>("/faceid/classes"),
    enabled: !scoped,
  });
  useEffect(() => {
    if (!scoped && !cls && classes.data?.length) setCls(classes.data[0]!.class_name);
  }, [scoped, cls, classes.data]);

  const list = useQuery<TodayRow[]>({
    queryKey: ["faceid-today", cls],
    queryFn: () => api<TodayRow[]>(`/faceid/today?class_name=${encodeURIComponent(cls)}`),
    enabled: !!cls,
    refetchInterval: 30_000,
  });

  const act = (login: string, action: "in" | "out" | "out_excused" | "clear", name: string) =>
    (async () => {
      setBusy(`${login}:${action}`);
      try {
        await api("/faceid/manual", { method: "POST", body: JSON.stringify({ student_login: login, action, time: time || undefined }) });
        const msg = action === "in" ? "keldi" : action === "out" ? "ketdi" : action === "out_excused" ? "ruxsat bilan ketdi" : "tozalandi";
        toast({ title: `${name}: ${msg}` });
        void qc.invalidateQueries({ queryKey: ["faceid-today", cls] });
      } catch (e) {
        toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
      } finally { setBusy(""); }
    })();

  const rows = (list.data ?? []).filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        {isManager && <Link href="/faceid"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Bugungi davomat — qo'lda</h1>
          <p className="text-sm text-muted-foreground">Ruxsat bilan erta ketgan yoki Face ID ishlamagan holatlarni to'g'rilash</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {!scoped && (
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="sm:w-44"><SelectValue placeholder="Sinf" /></SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((c) => <SelectItem key={c.class_name} value={c.class_name}>{c.class_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Ism bo'yicha qidirish…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Vaqt:</span>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" />
              {time && <button onClick={() => setTime("")} className="text-muted-foreground hover:text-foreground" title="Tozalash"><X className="w-4 h-4" /></button>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Vaqt bo'sh bo'lsa — hozirgi vaqt ishlatiladi. To'ldirsangiz — o'sha vaqt yoziladi.</p>
        </CardContent>
      </Card>

      {list.isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {list.isError && <div className="text-destructive text-sm">{(list.error as Error).message}</div>}

      <div className="space-y-2">
        {rows.map((r) => {
          const b = busy.startsWith(`${r.login}:`);
          return (
            <div key={r.login} className="rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.full_name}</div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {r.arrived ? (
                      <span className={r.status === "late" ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}>
                        {r.status === "late" ? "Kech keldi" : "Keldi"}: {r.arrived}
                      </span>
                    ) : <span className="text-muted-foreground">Kelmagan</span>}
                    {r.left && (
                      <span className={r.excused ? "text-violet-500" : r.early ? "text-amber-500" : "text-sky-500"}>
                        {r.excused ? "Ruxsat bilan ketdi" : r.early ? "Erta ketdi" : "Ketdi"}: {r.left}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Button size="sm" variant="outline" className="text-emerald-600" disabled={b} onClick={act(r.login, "in", r.full_name)}>
                  <LogIn className="w-3.5 h-3.5 mr-1" /> Keldi
                </Button>
                <Button size="sm" variant="outline" className="text-sky-600" disabled={b} onClick={act(r.login, "out", r.full_name)}>
                  <DoorOpen className="w-3.5 h-3.5 mr-1" /> Ketdi
                </Button>
                <Button size="sm" variant="outline" className="text-violet-600" disabled={b} onClick={act(r.login, "out_excused", r.full_name)}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Ruxsat bilan ketdi
                </Button>
                {(r.arrived || r.left) && (
                  <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={b} onClick={act(r.login, "clear", r.full_name)}>
                    <X className="w-3.5 h-3.5 mr-1" /> Tozalash
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {!list.isLoading && cls && rows.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Topilmadi</div>}
      </div>
    </div>
  );
}
