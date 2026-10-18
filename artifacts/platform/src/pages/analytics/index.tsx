// Faollik analitikasi — foydalanuvchilar saytdan qanchalik faol foydalanayotgani.
//   • Direktor/rahbariyat — o'z maktabi: Sinf → Foydalanuvchi.
//   • Super-admin — hammasi: Tuman → Maktab → Sinf → Foydalanuvchi.
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/face";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, ChevronRight, Users, School, MapPin, Clock, User } from "lucide-react";

interface Person {
  login: string; full_name: string; role: string; class_name: string;
  maktab_id: number | null; maktab_nom: string | null; tuman: string | null;
  last_seen_txt: string; ago_sec: string; hits: number; d7: number; d30: number; today: boolean;
}
interface Reg { maktab_id: number | null; class_name: string; total: number; }
interface Resp { scope: "tuman" | "maktab"; maktab_id: number | null; people: Person[]; registered: Reg[]; }

const ROLE_UZ: Record<string, string> = {
  student: "O'quvchi", teacher: "O'qituvchi", sinf_rahbari: "Sinf rahbari",
  boshlangich_oqituvchi: "Boshlang'ich o'qituvchi", director: "Direktor",
  zam_direktor: "Zam. direktor", zavuch: "Zavuch", admin: "Admin", mudir: "Mudir",
};

function agoText(secRaw: string): string {
  const sec = Number(secRaw) || 0;
  if (sec < 60) return "hozirgina";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  return `${d} kun oldin`;
}

const gradeNum = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };

function StatPill({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "sky" | "muted" }) {
  const cls = tone === "green" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "sky" ? "text-sky-600 dark:text-sky-400" : "text-foreground";
  return (
    <div className="text-center">
      <div className={`text-lg font-bold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const q = useQuery<Resp>({
    queryKey: ["analytics-activity"],
    queryFn: () => api<Resp>("/analytics/activity"),
    refetchInterval: 60_000,
  });
  const [tuman, setTuman] = useState<string | null>(null);
  const [maktab, setMaktab] = useState<number | null>(null);
  const [cls, setCls] = useState<string | null>(null);

  const data = q.data;
  const isAdmin = data?.scope === "tuman";

  const view = useMemo(() => {
    if (!data) return null;
    const people = data.people;
    const ctxMaktab = isAdmin ? maktab : data.maktab_id;

    // Joriy "pool" — drill holatiga qarab filtrlangan
    let pool = people;
    if (isAdmin && tuman) pool = pool.filter((p) => (p.tuman ?? "—") === tuman);
    if (isAdmin && maktab != null) pool = pool.filter((p) => p.maktab_id === maktab);
    if (cls != null) pool = pool.filter((p) => (p.class_name || "Xodimlar") === cls);

    let level: "tuman" | "maktab" | "class" | "user";
    if (isAdmin && !tuman) level = "tuman";
    else if (isAdmin && tuman && maktab == null) level = "maktab";
    else if (cls == null) level = "user-or-class";
    else level = "user";
    // "user-or-class": agar sinflar bo'lsa — sinf darajasi, aks holda bevosita foydalanuvchi
    if (level === "user-or-class") level = "class";

    const groupAgg = (rows: Person[]) => ({
      active: rows.length,
      today: rows.filter((r) => r.today).length,
      d7: rows.filter((r) => r.d7 > 0).length,
    });

    if (level === "tuman") {
      const keys = Array.from(new Set(people.map((p) => p.tuman ?? "—"))).sort();
      const groups = keys.map((k) => ({ key: k, ...groupAgg(people.filter((p) => (p.tuman ?? "—") === k)) }));
      return { level, groups, ctxMaktab };
    }
    if (level === "maktab") {
      const inTuman = pool;
      const ids = Array.from(new Set(inTuman.map((p) => p.maktab_id)));
      const groups = ids.map((id) => {
        const rows = inTuman.filter((p) => p.maktab_id === id);
        return { key: String(id), label: rows[0]?.maktab_nom ?? `${id}-maktab`, id, ...groupAgg(rows) };
      }).sort((a, b) => a.label.localeCompare(b.label, "uz"));
      return { level, groups, ctxMaktab };
    }
    if (level === "class") {
      const keys = Array.from(new Set(pool.map((p) => p.class_name || "Xodimlar")));
      const groups = keys.map((k) => {
        const rows = pool.filter((p) => (p.class_name || "Xodimlar") === k);
        const reg = k === "Xodimlar" ? undefined
          : data.registered.find((r) => r.maktab_id === ctxMaktab && r.class_name === k)?.total;
        return { key: k, total: reg, ...groupAgg(rows) };
      }).sort((a, b) => {
        if (a.key === "Xodimlar") return 1;
        if (b.key === "Xodimlar") return -1;
        const g = gradeNum(a.key) - gradeNum(b.key);
        return g !== 0 ? g : a.key.localeCompare(b.key, "uz");
      });
      return { level, groups, ctxMaktab };
    }
    // user
    const users = [...pool].sort((a, b) => Number(a.ago_sec) - Number(b.ago_sec));
    return { level, users, ctxMaktab };
  }, [data, isAdmin, tuman, maktab, cls]);

  const resetTo = (lvl: "root" | "tuman" | "maktab") => {
    if (lvl === "root") { setTuman(null); setMaktab(null); setCls(null); }
    else if (lvl === "tuman") { setMaktab(null); setCls(null); }
    else if (lvl === "maktab") { setCls(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" /> Faollik
        </h1>
        <p className="text-muted-foreground mt-1">
          Foydalanuvchilar saytdan qanchalik faol foydalanayotgani
          {isAdmin ? " — tuman bo'yicha" : " — maktabingiz bo'yicha"}.
        </p>
      </div>

      {/* Breadcrumb */}
      {(tuman || maktab != null || cls != null) && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button className="text-primary hover:underline" onClick={() => resetTo("root")}>
            {isAdmin ? "Barcha tumanlar" : "Sinflar"}
          </button>
          {isAdmin && tuman && (<><ChevronRight className="w-4 h-4 text-muted-foreground" /><button className="text-primary hover:underline" onClick={() => resetTo("tuman")}>{tuman}</button></>)}
          {isAdmin && maktab != null && (<><ChevronRight className="w-4 h-4 text-muted-foreground" /><button className="text-primary hover:underline" onClick={() => resetTo("maktab")}>{data?.people.find((p) => p.maktab_id === maktab)?.maktab_nom ?? `${maktab}-maktab`}</button></>)}
          {cls != null && (<><ChevronRight className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{cls}</span></>)}
        </div>
      )}

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : q.isError ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Ma'lumotni yuklab bo'lmadi</CardContent></Card>
      ) : !view || !data ? null : view.level === "user" ? (
        // ── Foydalanuvchilar ro'yxati
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Foydalanuvchilar ({view.users!.length})</CardTitle></CardHeader>
          <CardContent>
            {view.users!.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Hali hech kim faol bo'lmagan</div>
            ) : (
              <div className="divide-y">
                {view.users!.map((p) => (
                  <div key={p.login} className="flex items-center gap-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{ROLE_UZ[p.role] ?? p.role}{p.class_name ? ` · ${p.class_name}` : ""}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{agoText(p.ago_sec)}</span>
                        {p.today && <span className="text-emerald-600 dark:text-emerald-400">bugun faol</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-2">
                      <StatPill label="7 kun" value={`${p.d7}/7`} tone={p.d7 > 0 ? "green" : "muted"} />
                      <StatPill label="30 kun" value={p.d30} tone="sky" />
                      <StatPill label="jami" value={p.hits} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // ── Guruhlar (tuman / maktab / sinf) — bosib ichiga kiriladi
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {view.groups!.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="py-10 text-center text-muted-foreground text-sm">Hali faollik yo'q</CardContent></Card>
          ) : view.groups!.map((g) => {
            const icon = view.level === "tuman" ? MapPin : view.level === "maktab" ? School : Users;
            const Icon = icon;
            const onClick = () => {
              if (view.level === "tuman") setTuman(g.key);
              else if (view.level === "maktab") setMaktab((g as { id: number }).id);
              else setCls(g.key);
            };
            const label = view.level === "maktab" ? (g as { label: string }).label : g.key;
            const total = (g as { total?: number }).total;
            return (
              <button key={g.key} onClick={onClick} className="text-left rounded-xl border bg-card p-4 hover:bg-accent/40 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-semibold min-w-0">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center justify-between">
                  <StatPill label="faol bugun" value={g.today} tone="green" />
                  <StatPill label="faol (7 kun)" value={g.d7} tone="sky" />
                  <StatPill label={total != null ? "faol / jami" : "faol"} value={total != null ? `${g.active}/${total}` : g.active} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        "Faol" — foydalanuvchi saytga kirib, biror amal bajargani. Har foydalanuvchi uchun 2 daqiqada bir marta qayd etiladi.
      </p>
    </div>
  );
}
