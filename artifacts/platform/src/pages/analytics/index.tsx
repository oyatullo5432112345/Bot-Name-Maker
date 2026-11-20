// Faollik — foydalanuvchilar saytdan qanchalik faol foydalanayotgani.
//   • Rahbariyat — o'z maktabi: sinf → foydalanuvchi
//   • Admin — tuman → maktab → sinf → foydalanuvchi
// Bu sahifa yagona "Faollik" joyi. Bosh sahifada bu ko'rsatilmaydi.

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/face";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, ChevronRight, Users, School, MapPin, Clock, User, Search, Flame, CalendarDays, TrendingUp } from "lucide-react";

interface Person {
  login: string; full_name: string; role: string; class_name: string;
  maktab_id: number | null; maktab_nom: string | null; tuman: string | null;
  last_seen_txt: string; ago_sec: string; hits: number; d7: number; d30: number; today: boolean;
}
interface Reg { maktab_id: number | null; class_name: string; total: number }
interface Resp { scope: "tuman" | "maktab"; maktab_id: number | null; people: Person[]; registered: Reg[] }

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
  return `${Math.floor(h / 24)} kun oldin`;
}

const gradeNum = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };

function Tile({ icon: Icon, label, value, tone }: {
  icon: typeof Users; label: string; value: string | number;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const t = {
    emerald: "from-emerald-500/15 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15",
    sky: "from-sky-500/15 text-sky-600 dark:text-sky-400 bg-sky-500/15",
    violet: "from-violet-500/15 text-violet-600 dark:text-violet-400 bg-violet-500/15",
    amber: "from-amber-500/15 text-amber-600 dark:text-amber-400 bg-amber-500/15",
  }[tone];
  const [grad, text, iconBg] = t.split(" ").reduce<[string, string, string]>(
    (acc, cls) => {
      if (cls.startsWith("from-")) acc[0] = cls;
      else if (cls.startsWith("bg-")) acc[2] = cls;
      else acc[1] += (acc[1] ? " " : "") + cls;
      return acc;
    }, ["", "", ""]);
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${grad} to-transparent p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg} ${text}`}><Icon className="w-4 h-4" /></span>
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${text}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "sky" }) {
  const cls = tone === "green" ? "text-emerald-600 dark:text-emerald-400" : tone === "sky" ? "text-sky-600 dark:text-sky-400" : "text-foreground";
  return (
    <div className="text-center min-w-[64px]">
      <div className={`text-base font-bold tabular-nums ${cls}`}>{value}</div>
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
  const [search, setSearch] = useState("");

  const data = q.data;
  const isAdmin = data?.scope === "tuman";

  const totals = useMemo(() => {
    const p = data?.people ?? [];
    return {
      all: p.length,
      today: p.filter((x) => x.today).length,
      week: p.filter((x) => x.d7 > 0).length,
      hits: p.reduce((s, x) => s + (Number(x.hits) || 0), 0),
    };
  }, [data]);

  const view = useMemo(() => {
    if (!data) return null;
    const people = data.people;
    const ctxMaktab = isAdmin ? maktab : data.maktab_id;

    let pool = people;
    if (isAdmin && tuman) pool = pool.filter((p) => (p.tuman ?? "—") === tuman);
    if (isAdmin && maktab != null) pool = pool.filter((p) => p.maktab_id === maktab);
    if (cls != null) pool = pool.filter((p) => (p.class_name || "Xodimlar") === cls);

    const q2 = search.trim().toLowerCase();
    const match = (label: string) => !q2 || label.toLowerCase().includes(q2);

    let level: "tuman" | "maktab" | "class" | "user";
    if (isAdmin && !tuman) level = "tuman";
    else if (isAdmin && tuman && maktab == null) level = "maktab";
    else if (cls == null) level = "class";
    else level = "user";

    const agg = (rows: Person[]) => ({
      active: rows.length,
      today: rows.filter((r) => r.today).length,
      d7: rows.filter((r) => r.d7 > 0).length,
    });

    if (level === "tuman") {
      const keys = Array.from(new Set(people.map((p) => p.tuman ?? "—"))).sort().filter(match);
      return { level, groups: keys.map((k) => ({ key: k, label: k, ...agg(people.filter((p) => (p.tuman ?? "—") === k)) })), ctxMaktab };
    }
    if (level === "maktab") {
      const ids = Array.from(new Set(pool.map((p) => p.maktab_id)));
      const groups = ids.map((id) => {
        const rows = pool.filter((p) => p.maktab_id === id);
        return { key: String(id), label: rows[0]?.maktab_nom ?? `${id}-maktab`, id, ...agg(rows) };
      }).filter((g) => match(g.label)).sort((a, b) => a.label.localeCompare(b.label, "uz"));
      return { level, groups, ctxMaktab };
    }
    if (level === "class") {
      const keys = Array.from(new Set(pool.map((p) => p.class_name || "Xodimlar"))).filter(match);
      const groups = keys.map((k) => {
        const rows = pool.filter((p) => (p.class_name || "Xodimlar") === k);
        const reg = k === "Xodimlar" ? undefined : data.registered.find((r) => r.maktab_id === ctxMaktab && r.class_name === k)?.total;
        return { key: k, label: k, total: reg, ...agg(rows) };
      }).sort((a: { key: string }, b: { key: string }) => {
        if (a.key === "Xodimlar") return 1;
        if (b.key === "Xodimlar") return -1;
        const g = gradeNum(a.key) - gradeNum(b.key);
        return g !== 0 ? g : a.key.localeCompare(b.key, "uz");
      });
      return { level, groups, ctxMaktab };
    }
    const users = [...pool].filter((p) => match(p.full_name)).sort((a, b) => Number(a.ago_sec) - Number(b.ago_sec));
    return { level, users, ctxMaktab };
  }, [data, isAdmin, tuman, maktab, cls, search]);

  const resetTo = (lvl: "root" | "tuman" | "maktab") => {
    if (lvl === "root") { setTuman(null); setMaktab(null); setCls(null); }
    else if (lvl === "tuman") { setMaktab(null); setCls(null); }
    else setCls(null);
  };

  const crumbs = [
    { label: isAdmin ? "Barcha tumanlar" : "Sinflar", on: () => resetTo("root"), show: true },
    { label: tuman ?? "", on: () => resetTo("tuman"), show: isAdmin && !!tuman },
    { label: data?.people.find((p) => p.maktab_id === maktab)?.maktab_nom ?? `${maktab}-maktab`, on: () => resetTo("maktab"), show: isAdmin && maktab != null },
    { label: cls ?? "", on: null as null | (() => void), show: cls != null },
  ].filter((c) => c.show);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Faollik
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Tuman bo'yicha" : "Maktabingiz bo'yicha"} — foydalanuvchilar saytdan qanchalik faol foydalanmoqda
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Qidirish…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Umumiy ko'rsatkichlar */}
      {data && (
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Tile icon={Users} label="Jami faol" value={totals.all} tone="violet" />
          <Tile icon={Flame} label="Bugun faol" value={totals.today} tone="emerald" />
          <Tile icon={CalendarDays} label="7 kun ichida" value={totals.week} tone="sky" />
          <Tile icon={TrendingUp} label="Jami kirish" value={totals.hits} tone="amber" />
        </section>
      )}

      {/* Breadcrumb */}
      {crumbs.length > 1 && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              {c.on ? (
                <button className="text-primary hover:underline" onClick={c.on}>{c.label}</button>
              ) : (
                <span className="font-semibold">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : q.isError ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Ma'lumotni yuklab bo'lmadi</CardContent></Card>
      ) : !view || !data ? null : view.level === "user" ? (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Users className="w-4 h-4 text-primary" /> Foydalanuvchilar <span className="text-muted-foreground font-normal">({view.users!.length})</span>
            </div>
            {view.users!.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Hali hech kim faol bo'lmagan</div>
            ) : (
              <div className="divide-y">
                {view.users!.map((p) => (
                  <div key={p.login} className="flex items-center gap-3 py-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{ROLE_UZ[p.role] ?? p.role}{p.class_name ? ` · ${p.class_name}` : ""}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{agoText(p.ago_sec)}</span>
                        {p.today && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">bugun faol</span>}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-5 pl-2">
                      <Mini label="7 kun" value={`${Math.round((p.d7 / 7) * 100)}%`} tone={p.d7 > 0 ? "green" : undefined} />
                      <Mini label="30 kun" value={p.d30} tone="sky" />
                      <Mini label="jami" value={p.hits} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : view.groups!.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Hali faollik yo'q</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {view.groups!.map((g) => {
            const Icon = view.level === "tuman" ? MapPin : view.level === "maktab" ? School : Users;
            const onClick = () => {
              if (view.level === "tuman") setTuman(g.key);
              else if (view.level === "maktab") setMaktab((g as { id: number }).id);
              else setCls(g.key);
            };
            const total = (g as { total?: number }).total;
            const pct = total ? Math.round((g.active / total) * 100) : null;
            return (
              <button
                key={g.key}
                onClick={onClick}
                className="group text-left rounded-2xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 font-semibold min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                    <span className="truncate">{g.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2">
                  <Mini label="bugun" value={g.today} tone="green" />
                  <Mini label="7 kun" value={g.d7} tone="sky" />
                  <Mini label={total != null ? "faol %" : "faol"} value={total != null ? `${pct ?? 0}%` : g.active} />
                </div>
                {pct !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{pct}% ro'yxatdagilardan faol</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {cls != null && view?.level === "user" && (
        <div className="flex justify-start">
          <Button variant="outline" size="sm" onClick={() => resetTo("maktab")}>← Sinflarga qaytish</Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        "Faol" — foydalanuvchi saytga kirib, biror amal bajargani. Har foydalanuvchi uchun 2 daqiqada bir marta qayd etiladi.
      </p>
    </div>
  );
}
