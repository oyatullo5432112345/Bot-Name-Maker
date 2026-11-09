// Face ID — bugungi keldi/ketdini qo'lda to'g'rilash (rahbariyat / sinf rahbari).
// Ruxsat bilan erta ketgan, yoki Face ID ishlamagan holatlar uchun.

import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClassChips } from "@/components/class-chips";
import {
  ArrowLeft, Loader2, LogIn, DoorOpen, ShieldCheck, X, Clock, UserX, Download, Repeat, Palette,
  Stethoscope, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api, API_BASE, authHeaders } from "@/lib/face";

interface ClassRow { class_name: string; total?: number; enrolled?: number }
interface TodayRow {
  login: string; full_name: string;
  arrived: string | null; status: string | null;
  left: string | null; early: boolean; excused: boolean;
  chronic: boolean;
}

export default function FaceTodayPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const scoped = !!user && ["sinf_rahbari", "boshlangich_oqituvchi"].includes(user.role);
  const isManager = !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const [cls, setCls] = useState<string>(scoped ? (user?.class_name ?? "") : "");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [dl, setDl] = useState(false);

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

  // Sinf bo'yicha statistika (keldi / sababli / kelmagan / foiz)
  const stats = useMemo(() => {
    const rows = list.data ?? [];
    const total = rows.length;
    let arrived = 0;   // kelgan (keldi + kech keldi)
    let excused = 0;   // sababli
    let absent = 0;    // kelmagan (sababsiz)
    for (const r of rows) {
      if (r.arrived) arrived++;
      else if (r.excused) excused++;
      else absent++;
    }
    // Foiz: keldi + sababli (ular "yo'q" hisoblanmaydi) / jami
    const pct = total > 0 ? Math.round(((arrived + excused) / total) * 100) : 0;
    let color: "green" | "amber" | "red" = "green";
    if (absent > 0) color = "red";
    else if (excused > 0 && arrived < total) color = "amber";
    return { total, arrived, excused, absent, pct, color };
  }, [list.data]);

  const act = (login: string, action: "in" | "out" | "out_excused" | "clear" | "absent_excused" | "club", name: string) => async () => {
    let reason: string | undefined;
    if (action === "absent_excused") {
      const r = window.prompt(`${name} — bugun sababli (kela olmaydi).\nSababini yozing (guruhga shu matn chiqadi):`, "");
      if (r === null) return;
      reason = r.trim() || undefined;
    }
    setBusy(`${login}:${action}`);
    try {
      await api("/faceid/manual", { method: "POST", body: JSON.stringify({ student_login: login, action, time: time || undefined, reason }) });
      const msg = action === "in" ? "keldi" : action === "out" ? "ketdi" : action === "out_excused" ? "ruxsat bilan ketdi" : action === "absent_excused" ? "sababli (kelmadi)" : action === "club" ? "to'garakda qoldi" : "tozalandi";
      toast({ title: `${name}: ${msg}` });
      void qc.invalidateQueries({ queryKey: ["faceid-today", cls] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setBusy(""); }
  };

  const toggleChronic = (login: string, name: string, on: boolean) => async () => {
    let note: string | undefined;
    if (on) {
      const r = window.prompt(`${name} — "Muntazam kelmaydigan" deb belgilansinmi?\nIzoh (ixtiyoriy):`, "");
      if (r === null) return;
      note = r.trim() || undefined;
    }
    setBusy(`${login}:chronic`);
    try {
      await api("/faceid/chronic", { method: "POST", body: JSON.stringify({ student_login: login, on, note }) });
      toast({ title: `${name}: ${on ? "muntazam deb belgilandi" : "muntazamdan chiqarildi"}` });
      void qc.invalidateQueries({ queryKey: ["faceid-today", cls] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setBusy(""); }
  };

  const downloadArchive = async () => {
    setDl(true);
    try {
      const d = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
      const res = await fetch(`${API_BASE}/faceid/archive?date=${d}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Xatolik (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `davomat-${d}.doc`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setDl(false); }
  };

  const rows = (list.data ?? []).filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()));

  // Ranglar
  const statColor = {
    green: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
    amber: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
    red:   { bg: "bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-400", icon: UserX },
  };
  const SC = statColor[stats.color];
  const SIcon = SC.icon;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        {isManager && <Link href="/faceid"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>}
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Bugungi davomat — qo'lda</h1>
          <p className="text-sm text-muted-foreground">Ruxsat bilan erta ketgan yoki Face ID ishlamagan holatlarni to'g'rilash</p>
        </div>
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => void downloadArchive()} disabled={dl} className="shrink-0">
            {dl ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Kunlik hisobot (Word)
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          {!scoped && (
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Sinfni tanlang</div>
              <ClassChips classes={classes.data ?? []} value={cls} onChange={setCls} />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
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

      {/* Sinfning umumiy holati — rangli karta */}
      {cls && !list.isLoading && stats.total > 0 && (
        <Card className={`border-2 ${SC.border} ${SC.bg} overflow-hidden`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${SC.bg} ${SC.border} border flex items-center justify-center shrink-0`}>
                <SIcon className={`w-6 h-6 ${SC.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{cls}-sinf — bugungi holat</div>
                <div className={`text-3xl font-black ${SC.text} tabular-nums leading-tight`}>{stats.pct}%</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2 text-center">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Keldi</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.arrived}</div>
              </div>
              <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-center">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Sababli</div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">{stats.excused}</div>
              </div>
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-2 text-center">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Kelmagan</div>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">{stats.absent}</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${stats.color === "green" ? "bg-emerald-500" : stats.color === "amber" ? "bg-amber-500" : "bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"}`}
                style={{ width: `${stats.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              Jami {stats.total} o'quvchi · {stats.arrived + stats.excused} ta hisobga olindi
            </p>
          </CardContent>
        </Card>
      )}

      {list.isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {list.isError && <div className="text-destructive text-sm">{(list.error as Error).message}</div>}

      <div className="space-y-2">
        {rows.map((r) => {
          const b = busy.startsWith(`${r.login}:`);
          // Rang holati: kelgan (yashil), sababli (sariq), kelmagan (qizil)
          const isArrived = !!r.arrived;
          const isExcused = !r.arrived && r.excused;
          const isAbsent = !r.arrived && !r.excused;
          const cardCls = isArrived
            ? "border-emerald-500/40 bg-emerald-500/5"
            : isExcused
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-rose-500/40 bg-rose-500/5";
          return (
            <div key={r.login} className={`rounded-xl border-2 ${cardCls} px-4 py-3 transition-colors`}>
              <div className="flex items-center gap-3">
                {/* Chap holat indikatori */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isArrived ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                  isExcused ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                  "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                }`}>
                  {isArrived ? <CheckCircle2 className="w-5 h-5" /> :
                   isExcused ? <Stethoscope className="w-5 h-5" /> :
                   <UserX className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {r.full_name}
                    {r.chronic && <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded px-1.5 py-0.5">Muntazam</span>}
                  </div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {r.arrived ? (
                      <span className={r.status === "late" ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                        {r.status === "late" ? "Kech keldi" : "Keldi"}: {r.arrived}
                      </span>
                    ) : r.excused && !r.left ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> Sababli (kelmadi)
                      </span>
                    ) : <span className="text-rose-600 dark:text-rose-400 font-semibold">Kelmagan</span>}
                    {r.left && (
                      <span className={r.excused ? "text-violet-500" : r.early ? "text-amber-500" : "text-sky-500"}>
                        {r.excused ? "Ruxsat bilan ketdi" : r.early ? "Erta ketdi" : "Ketdi"}: {r.left}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {isManager && (
                  <>
                    <Button size="sm" variant="outline" className="text-emerald-600" disabled={b} onClick={act(r.login, "in", r.full_name)}>
                      <LogIn className="w-3.5 h-3.5 mr-1" /> Keldi
                    </Button>
                    <Button size="sm" variant="outline" className="text-sky-600" disabled={b} onClick={act(r.login, "out", r.full_name)}>
                      <DoorOpen className="w-3.5 h-3.5 mr-1" /> Ketdi
                    </Button>
                    <Button size="sm" variant="outline" className="text-violet-600" disabled={b} onClick={act(r.login, "out_excused", r.full_name)}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Ruxsat bilan ketdi
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="text-amber-600" disabled={b} onClick={act(r.login, "absent_excused", r.full_name)}>
                  <Stethoscope className="w-3.5 h-3.5 mr-1" /> Sababli (kelmadi)
                </Button>
                <Button size="sm" variant="outline" className="text-fuchsia-600" disabled={b} onClick={act(r.login, "club", r.full_name)}>
                  <Palette className="w-3.5 h-3.5 mr-1" /> To'garak qoldi
                </Button>
                <Button size="sm" variant="outline" className={r.chronic ? "text-rose-600" : "text-muted-foreground"} disabled={b} onClick={toggleChronic(r.login, r.full_name, !r.chronic)}>
                  <Repeat className="w-3.5 h-3.5 mr-1" /> {r.chronic ? "Muntazamdan chiqarish" : "Muntazam"}
                </Button>
                {isManager && (r.arrived || r.left) && (
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
