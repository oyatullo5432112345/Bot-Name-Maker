// Face ID — boshqaruv sahifasi. Tartib:
// 1) sarlavha va amallar  2) statistika  3) sinflar + oxirgi harakatlar
// 4) sozlamalar (chap)   5) xabarnomalar, pauza, xavfsizlik (o'ng)

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Play, ScanFace, Send, ShieldCheck, UserCheck, Clock, Users, Settings2,
  DoorOpen, ArrowDownLeft, ArrowUpRight, Trash2, GraduationCap, Bell, ListChecks,
  CalendarRange, Sparkles, ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/face";
import { MsgPauseCard } from "@/components/msg-pause-card";

interface Settings {
  late_after: string;
  notify: boolean;
  threshold: number;
  min_stay: number;
  default_end: string;
  open_from?: string;
  close_after?: string;
  quarter_start?: string;
  quarter_end?: string;
  hour_limit?: number;
}

interface Overview {
  date: string;
  time: string;
  settings: Settings;
  students: number;
  enrolled: number;
  arrived: number;
  late: number;
  left: number;
  early: number;
  classes: { class_name: string; total: number; enrolled: number; arrived: number; late: number; left: number; early: number }[];
  recent: { student_name: string; class_name: string; kind: "in" | "out"; status: string; time: string }[];
}

const THRESHOLDS = [
  { v: 0.42, label: "Qat'iy", hint: "Adashish kam, ba'zan tanimaydi" },
  { v: 0.48, label: "O'rtacha", hint: "Tavsiya etiladi" },
  { v: 0.54, label: "Yumshoq", hint: "Tez taniydi, adashish ehtimoli bor" },
];

type Accent = "emerald" | "amber" | "sky" | "violet";
const ACCENT: Record<Accent, { wrap: string; icon: string; text: string }> = {
  emerald: { wrap: "from-emerald-500/15", icon: "bg-emerald-500/15 text-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { wrap: "from-amber-500/15", icon: "bg-amber-500/15 text-amber-500", text: "text-amber-600 dark:text-amber-400" },
  sky: { wrap: "from-sky-500/15", icon: "bg-sky-500/15 text-sky-500", text: "text-sky-600 dark:text-sky-400" },
  violet: { wrap: "from-violet-500/15", icon: "bg-violet-500/15 text-violet-500", text: "text-violet-600 dark:text-violet-400" },
};

function StatCard({ icon: Icon, label, value, sub, accent, progress }: {
  icon: typeof Users; label: string; value: number | string; sub?: string; accent: Accent; progress?: number;
}) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${a.wrap} to-transparent p-4 flex flex-col`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.icon}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className={`mt-2 text-3xl sm:text-4xl font-bold tabular-nums ${a.text}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-auto pt-3">
          <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
            <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="w-full">{children}</div>
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </div>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function FaceIdPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const ov = useQuery<Overview>({
    queryKey: ["faceid-overview"],
    queryFn: () => api<Overview>("/faceid/overview"),
    refetchInterval: 30_000,
  });

  const [lateAfter, setLateAfter] = useState("08:00");
  const [notify, setNotify] = useState(true);
  const [threshold, setThreshold] = useState("0.48");
  const [defaultEnd, setDefaultEnd] = useState("13:30");
  const [openFrom, setOpenFrom] = useState("06:00");
  const [closeAfter, setCloseAfter] = useState("14:30");
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [hourLimit, setHourLimit] = useState("36");
  const [isTwoShift, setIsTwoShift] = useState(false);
  const [smena, setSmena] = useState<"1" | "2">("1");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [summing, setSumming] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const mine = await api<{ ikki_smena?: boolean }>("/maktablar/mine");
        setIsTwoShift(!!mine.ikki_smena);
      } catch { /* 1 smenali yoki super-admin */ }
    })();
  }, []);

  const apply = (s: Settings) => {
    setLateAfter(s.late_after);
    setNotify(s.notify);
    setThreshold(String(s.threshold));
    setDefaultEnd(s.default_end ?? "13:30");
    setOpenFrom(s.open_from ?? "06:00");
    setCloseAfter(s.close_after ?? "14:30");
    setQuarterStart(s.quarter_start ?? "");
    setQuarterEnd(s.quarter_end ?? "");
    setHourLimit(String(s.hour_limit ?? 36));
  };

  useEffect(() => {
    const n = isTwoShift ? Number(smena) : 0;
    void (async () => {
      try {
        apply(await api<Settings>(`/faceid/settings?smena=${n}`));
      } catch { /* ignore */ }
    })();
  }, [isTwoShift, smena]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      await api("/faceid/settings", {
        method: "POST",
        body: JSON.stringify({
          smena: isTwoShift ? Number(smena) : 0,
          late_after: lateAfter, notify, threshold: Number(threshold),
          default_end: defaultEnd, open_from: openFrom, close_after: closeAfter,
          quarter_start: quarterStart, quarter_end: quarterEnd, hour_limit: Number(hourLimit),
        }),
      });
      toast({ title: "✅ Sozlamalar saqlandi" });
      void qc.invalidateQueries({ queryKey: ["faceid-overview"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const notifyAbsent = async () => {
    if (!confirm("Hali kelmaganlar ro'yxati sinf rahbarlariga (va direktorga) yuborilsinmi?")) return;
    setSending(true);
    try {
      const r = await api<{ classes: number; sent: number }>("/faceid/notify-absent", { method: "POST" });
      toast({ title: "Yuborildi", description: `${r.classes} ta sinf · ${r.sent} ta xabar` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  const sendSummary = async () => {
    if (!confirm("Bugungi xulosa har bir sinf guruhiga yuborilsinmi?")) return;
    setSumming(true);
    try {
      const r = await api<{ classes: number; sent: number }>("/faceid/group-summary", { method: "POST" });
      toast({ title: "Yuborildi", description: `${r.sent} ta guruhga xulosa` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setSumming(false);
    }
  };

  const resetAll = async () => {
    if (!confirm("DIQQAT: barcha yuz ma'lumotlari o'chadi. Qaytadan ro'yxatga olish kerak bo'ladi. Davom etasizmi?")) return;
    setResetting(true);
    try {
      const r = await api<{ deleted: number }>("/faceid/reset", { method: "POST" });
      toast({ title: "O'chirildi", description: `${r.deleted} ta yuz ma'lumoti` });
      void qc.invalidateQueries({ queryKey: ["faceid-overview"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setResetting(false);
    }
  };

  const d = ov.data;
  const pct = d && d.enrolled ? Math.round((d.arrived / d.enrolled) * 100) : 0;
  const inSchool = d ? Math.max(0, d.arrived - d.left) : 0;
  const classes = d
    ? [...d.classes].sort((a, b) => a.class_name.localeCompare(b.class_name, undefined, { numeric: true }))
    : [];

  return (
    <div className="space-y-6">
      {/* 1. Sarlavha va amallar */}
      <section className="rounded-3xl border bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0">
              <ScanFace className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Face ID davomat</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Yuz orqali keldi/ketdi</p>
              {d && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border px-2.5 py-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {d.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border px-2.5 py-1">
                    <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                    Kamera {d.settings.open_from ?? "06:00"} – {d.settings.close_after ?? "14:30"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border px-2.5 py-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" /> {d.students} o'quvchi
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/faceid/enroll">
              <Button variant="outline" className="bg-background/70"><ScanFace className="w-4 h-4 mr-2" />Yuzlarni olish</Button>
            </Link>
            <Link href="/faceid/today">
              <Button variant="outline" className="bg-background/70"><Clock className="w-4 h-4 mr-2" />Bugungi davomat</Button>
            </Link>
            <Link href="/faceid/kiosk">
              <Button className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:opacity-90">
                <Play className="w-4 h-4 mr-2" />Kamerani boshlash
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {ov.isLoading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>}
      {ov.isError && <div className="text-destructive text-sm">{(ov.error as Error).message}</div>}

      {d && (
        <>
          {/* 2. Statistika */}
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={UserCheck} label="Keldi" value={d.arrived} accent="emerald" sub={`${pct}% ro'yxatdagilardan`} progress={pct} />
            <StatCard icon={Clock} label="Kechikdi" value={d.late} accent="amber" sub={`${d.settings.late_after} dan keyin`} />
            <StatCard icon={DoorOpen} label="Ketdi" value={d.left} accent="sky" sub={d.early ? `${d.early} tasi erta ketgan` : `Maktabda: ${inSchool}`} />
            <StatCard icon={ScanFace} label="Ro'yxatda" value={d.enrolled} accent="violet" sub={`${d.students} o'quvchidan`} />
          </section>

          {d.enrolled === 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 font-semibold mb-3"><Sparkles className="w-4 h-4 text-primary" /> Qanday boshlanadi?</div>
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
                  {[
                    { t: "Yuzlarni ro'yxatga oling", x: "Har bir o'quvchi bir marta, ota-ona roziligi bilan." },
                    { t: "Kamerani ishga tushiring", x: "\"Kamerani boshlash\" ni bosing, telefonni kirish yoniga qo'ying." },
                    { t: "Keldi yoziladi", x: "O'quvchi kameraga qaraydi, Telegramda xabar boradi." },
                    { t: "Ketdi yoziladi", x: "Smena tugaganda yana qaraydi." },
                  ].map((s, i) => (
                    <li key={s.t} className="rounded-xl bg-background/70 border p-3">
                      <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">{i + 1}</div>
                      <div className="font-semibold">{s.t}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.x}</div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* 3. Sinflar va oxirgi harakatlar — bir xil balandlik */}
          <div className="grid xl:grid-cols-3 gap-4 items-stretch">
            <Card className="xl:col-span-2 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Sinflar bo'yicha — bugun
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{classes.length} ta sinf</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[480px] overflow-y-auto">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {classes.map((c) => {
                    const p = c.enrolled ? Math.round((c.arrived / c.enrolled) * 100) : 0;
                    const staff = c.class_name === "Xodimlar";
                    return (
                      <div key={c.class_name} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-sm min-w-0">
                            {staff && <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />}
                            <span className="truncate">{c.class_name}</span>
                          </div>
                          <div className="text-xs tabular-nums text-muted-foreground shrink-0">
                            <b className="text-foreground">{c.arrived}</b>/{c.enrolled}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${staff ? "bg-violet-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"}`} style={{ width: `${p}%` }} />
                        </div>
                        {(c.late > 0 || c.left > 0 || c.early > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                            {c.late > 0 && <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">{c.late} kech</span>}
                            {c.left > 0 && <span className="rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 px-1.5 py-0.5">{c.left} ketdi</span>}
                            {c.early > 0 && <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">{c.early} erta</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {classes.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">O'quvchilar hali qo'shilmagan</div>}
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Oxirgi harakatlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
                {d.recent.map((r, i) => {
                  const late = r.kind === "in" && r.status === "late";
                  const early = r.kind === "out" && r.status === "early";
                  const excused = r.kind === "out" && r.status === "excused";
                  const warn = late || early;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        warn ? "bg-amber-500/15 text-amber-500" : r.kind === "in" ? "bg-emerald-500/15 text-emerald-500" : "bg-sky-500/15 text-sky-500"
                      }`}>
                        {r.kind === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.student_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.kind === "in" ? (late ? "kech keldi" : "keldi") : excused ? "ruxsat bilan ketdi" : early ? "erta ketdi" : "ketdi"} · {r.class_name}
                        </div>
                      </div>
                      <div className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">{r.time}</div>
                    </div>
                  );
                })}
                {d.recent.length === 0 && <div className="text-sm text-muted-foreground py-10 text-center">Bugun hali hech kim o'tmadi</div>}
              </CardContent>
            </Card>
          </div>

          {/* 4 + 5. Sozlamalar (chap) va boshqaruv (o'ng) */}
          <div className="grid xl:grid-cols-3 gap-4 items-start">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" /> Sozlamalar
                  {isTwoShift && <span className="text-xs font-normal text-muted-foreground">· {smena}-smena</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-7">
                {isTwoShift && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">Smena:</span>
                    <div className="inline-flex rounded-xl bg-muted p-1">
                      {(["1", "2"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSmena(s)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                            smena === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s}-smena
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Section icon={Clock} title="Vaqt">
                  <Field label="Kech qolish vaqti" hint="Shu vaqtdan keyin kelgan — kech.">
                    <Input type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} />
                  </Field>
                  <Field label="Darslar tugashi" hint="Shu vaqtdan oldin ketsa — erta ketdi.">
                    <Input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} />
                  </Field>
                  <Field label="Kamera ochilishi" hint="Shu vaqtdan kamera ishlaydi.">
                    <Input type="time" value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} />
                  </Field>
                  <Field label="Kamera yopilishi" hint="Shu vaqtdan keyin kun yakunlanadi.">
                    <Input type="time" value={closeAfter} onChange={(e) => setCloseAfter(e.target.value)} />
                  </Field>
                </Section>

                <Section icon={ScanFace} title="Aniqlik va chorak">
                  <Field label="Tanish aniqligi" hint={THRESHOLDS.find((t) => String(t.v) === threshold)?.hint ?? ""}>
                    <Select value={threshold} onValueChange={setThreshold}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {THRESHOLDS.map((t) => <SelectItem key={t.v} value={String(t.v)}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Soat chegarasi" hint="Shu soatga yetganda ogohlantiriladi (odatda 36).">
                    <Input type="number" min={1} max={500} value={hourLimit} onChange={(e) => setHourLimit(e.target.value)} />
                  </Field>
                  <Field label="Chorak boshlanishi" hint="Bo'sh bo'lsa avtomatik.">
                    <Input type="date" value={quarterStart} onChange={(e) => setQuarterStart(e.target.value)} />
                  </Field>
                  <Field label="Chorak tugashi" hint="Bo'sh bo'lsa bugungi kungacha.">
                    <Input type="date" value={quarterEnd} onChange={(e) => setQuarterEnd(e.target.value)} />
                  </Field>
                </Section>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-5">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <Switch checked={notify} onCheckedChange={setNotify} />
                    <span>O'quvchiga Telegramda <b>"Keldingiz / Chiqdingiz"</b> xabari</span>
                  </label>
                  <Button onClick={() => void save()} disabled={saving} className="sm:min-w-36">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Saqlash
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <MsgPauseCard />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Xabarnomalar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Button variant="outline" className="w-full justify-between h-11" onClick={() => void notifyAbsent()} disabled={sending}>
                    <span className="flex items-center gap-2">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kelmaganlar — rahbarlarga
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between h-11" onClick={() => void sendSummary()} disabled={summing}>
                    <span className="flex items-center gap-2">
                      {summing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                      Kunlik xulosa — sinf guruhlariga
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <p className="text-[11px] text-muted-foreground pt-1">Xulosa har kuni 09:00 da avtomatik ham yuboriladi.</p>
                </CardContent>
              </Card>

              <div className="flex gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-xs text-muted-foreground">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>Rasm saqlanmaydi — faqat yuzning raqamli izi. Ma'lumotni istalgan vaqt o'chirish mumkin.</span>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="text-sm font-semibold text-destructive flex items-center gap-2"><Trash2 className="w-4 h-4" /> Xavfli amal</div>
                  <p className="text-xs text-muted-foreground">Barcha yuz ma'lumotlarini o'chiradi. Keyin qaytadan olinadi.</p>
                  <Button variant="destructive" size="sm" onClick={() => void resetAll()} disabled={resetting}>
                    {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Hammasini o'chirish
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
