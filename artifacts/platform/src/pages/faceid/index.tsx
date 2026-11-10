// Face ID — boshqaruv sahifasi (admin / rahbariyat).
// Bo'limlar: holat, statistika, sozlamalar, xabarnomalar, xavfli amallar.

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

interface Overview {
  date: string;
  time: string;
  settings: {
    late_after: string; notify: boolean; threshold: number; min_stay: number; default_end: string;
    open_from?: string; close_after?: string; quarter_start?: string; quarter_end?: string; hour_limit?: number;
  };
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

const ACCENTS = {
  emerald: { wrap: "from-emerald-500/15 to-transparent", icon: "bg-emerald-500/15 text-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  amber:   { wrap: "from-amber-500/15 to-transparent",   icon: "bg-amber-500/15 text-amber-500",     text: "text-amber-600 dark:text-amber-400" },
  sky:     { wrap: "from-sky-500/15 to-transparent",     icon: "bg-sky-500/15 text-sky-500",         text: "text-sky-600 dark:text-sky-400" },
  violet:  { wrap: "from-violet-500/15 to-transparent",  icon: "bg-violet-500/15 text-violet-500",   text: "text-violet-600 dark:text-violet-400" },
} as const;

function StatCard({ icon: Icon, label, value, sub, accent, progress }: {
  icon: typeof Users; label: string; value: string | number; sub?: string;
  accent: keyof typeof ACCENTS; progress?: number;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${a.wrap} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.icon}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className={`mt-2 text-3xl sm:text-4xl font-bold tabular-nums ${a.text}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-background/60 overflow-hidden">
          <div className="h-full rounded-full bg-current opacity-70 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}

// Sozlamalar guruhi — sarlavha + izoh + maydonlar
function SettingsGroup({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
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
  const [smenaSel, setSmenaSel] = useState<"1" | "2">("1");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [summing, setSumming] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Maktab 2 smenali bo'lsa — smena tanlagich ko'rinadi
  useEffect(() => {
    void (async () => {
      try {
        const mine = await api<{ ikki_smena?: boolean }>("/maktablar/mine");
        setIsTwoShift(!!mine.ikki_smena);
      } catch { /* 1 smenali / super-admin — jim o'tadi */ }
    })();
  }, []);

  const applySettings = (s: Overview["settings"]) => {
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
    const smena = isTwoShift ? Number(smenaSel) : 0;
    void (async () => {
      try {
        const s = await api<Overview["settings"]>(`/faceid/settings?smena=${smena}`);
        applySettings(s);
      } catch { /* ignore */ }
    })();
  }, [isTwoShift, smenaSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    setSaving(true);
    try {
      const smena = isTwoShift ? Number(smenaSel) : 0;
      await api("/faceid/settings", {
        method: "POST",
        body: JSON.stringify({
          smena, late_after: lateAfter, notify, threshold: Number(threshold),
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
    if (!confirm("Face ID orqali hali kelmaganlar ro'yxati har bir sinf rahbariga (va direktorga) Telegramda yuborilsinmi?")) return;
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
    if (!confirm("Bugungi davomat xulosasi har bir sinf guruhiga (va maktab guruhiga) yuborilsinmi?")) return;
    setSumming(true);
    try {
      const r = await api<{ classes: number; sent: number }>("/faceid/group-summary", { method: "POST" });
      toast({ title: "Yuborildi", description: `${r.sent} ta guruhga xulosa yuborildi` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setSumming(false);
    }
  };

  const resetAll = async () => {
    if (!confirm("DIQQAT: hamma o'quvchi va xodimlarning yuz ma'lumotlari butunlay o'chiriladi. Ular qaytadan ro'yxatga olinishi kerak bo'ladi. Davom etasizmi?")) return;
    setResetting(true);
    try {
      const r = await api<{ deleted: number }>("/faceid/reset", { method: "POST" });
      toast({ title: "O'chirildi", description: `${r.deleted} ta yuz ma'lumoti o'chirildi` });
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

  return (
    <div className="space-y-6">
      {/* ═══ 1. Sarlavha va asosiy amallar ═══ */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent p-5 sm:p-7">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
              <ScanFace className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Face ID davomat</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Yuz orqali keldi/ketdi — oddiy telefon kamerasi bilan
              </p>
              {d && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border px-2.5 py-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Bugun {d.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border px-2.5 py-1">
                    <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                    Kamera: {d.settings.open_from ?? "06:00"} – {d.settings.close_after ?? "14:30"}
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
              <Button variant="outline" className="bg-background/70">
                <ScanFace className="w-4 h-4 mr-2" />Yuzlarni ro'yxatga olish
              </Button>
            </Link>
            <Link href="/faceid/today">
              <Button variant="outline" className="bg-background/70">
                <Clock className="w-4 h-4 mr-2" />Qo'lda to'g'rilash
              </Button>
            </Link>
            <Link href="/faceid/kiosk">
              <Button className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:opacity-90 shadow-md">
                <Play className="w-4 h-4 mr-2" />Bugungi Face ID ni boshlash
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {ov.isLoading && (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      )}
      {ov.isError && <div className="text-destructive text-sm">{(ov.error as Error).message}</div>}

      {d && (
        <>
          {/* ═══ 2. Statistika ═══ */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={UserCheck} label="Keldi" value={d.arrived} accent="emerald"
              sub={`${pct}% ro'yxatdagilardan`} progress={pct} />
            <StatCard icon={Clock} label="Kechikdi" value={d.late} accent="amber"
              sub={`${d.settings.late_after} dan keyin`} />
            <StatCard icon={DoorOpen} label="Ketdi" value={d.left} accent="sky"
              sub={d.early ? `${d.early} tasi erta ketgan` : `Maktabda: ${inSchool}`} />
            <StatCard icon={ScanFace} label="Ro'yxatda" value={d.enrolled} accent="violet"
              sub={`${d.students} o'quvchidan`} />
          </section>

          {/* ═══ 3. Boshlash yo'riqnomasi (ro'yxat bo'sh bo'lsa) ═══ */}
          {d.enrolled === 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 font-semibold mb-3">
                  <Sparkles className="w-4 h-4 text-primary" /> Qanday boshlanadi?
                </div>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  {[
                    { t: "Yuzlarni ro'yxatga oling", d: "Sinf rahbarlari har bir o'quvchini bir marta skanerlaydi (ota-ona roziligi bilan)." },
                    { t: "Kamerani ishga tushiring", d: "Ertalab \"Bugungi Face ID\" ni bosing va telefonni kirish eshigi yoniga qo'ying." },
                    { t: "Keldi yoziladi", d: "O'quvchi kameraga qaraydi, davomat belgilanadi va Telegramda xabar boradi." },
                    { t: "Ketdi yoziladi", d: "Uyga ketayotganda yana qaraydi. Dars tugashidan oldin bo'lsa — \"erta ketdi\"." },
                  ].map((s, i) => (
                    <li key={s.t} className="rounded-xl bg-background/70 border p-3">
                      <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">
                        {i + 1}
                      </div>
                      <div className="font-semibold">{s.t}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.d}</div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* ═══ 4. Sinflar va so'nggi harakatlar ═══ */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Sinflar bo'yicha — bugun
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.classes.map((c) => {
                  const p = c.enrolled ? Math.round((c.arrived / c.enrolled) * 100) : 0;
                  const isStaff = c.class_name === "Xodimlar";
                  return (
                    <div key={c.class_name} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
                          {isStaff && <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />}
                          <span className="truncate">{c.class_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                          <b className="text-foreground">{c.arrived}</b>/{c.enrolled} keldi
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isStaff ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"
                          }`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      {(c.late > 0 || c.left > 0 || c.early > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                          {c.late > 0 && <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5">{c.late} kech</span>}
                          {c.left > 0 && <span className="rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2 py-0.5">{c.left} ketdi</span>}
                          {c.early > 0 && <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5">{c.early} erta ketdi</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {d.classes.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">O'quvchilar hali qo'shilmagan</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Oxirgi harakatlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[420px] overflow-y-auto">
                {d.recent.map((r, i) => {
                  const late = r.kind === "in" && r.status === "late";
                  const excused = r.kind === "out" && r.status === "excused";
                  const early = r.kind === "out" && r.status === "early";
                  const warn = late || early;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        r.kind === "in"
                          ? (warn ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500")
                          : (warn ? "bg-amber-500/15 text-amber-500" : "bg-sky-500/15 text-sky-500")
                      }`}>
                        {r.kind === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.student_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.kind === "in" ? (late ? "kech keldi" : "keldi") : excused ? "ruxsat bilan ketdi" : early ? "erta ketdi" : "ketdi"} · {r.class_name}
                        </div>
                      </div>
                      <div className="text-xs font-semibold tabular-nums shrink-0 text-muted-foreground">{r.time}</div>
                    </div>
                  );
                })}
                {d.recent.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">Bugun hali hech kim o'tmadi</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══ 5. Sozlamalar va xabarnomalar ═══ */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" /> Sozlamalar
                  {isTwoShift && <span className="text-xs font-normal text-muted-foreground">({smenaSel}-smena)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isTwoShift && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">Smena:</span>
                    <div className="inline-flex rounded-xl bg-muted p-1">
                      {(["1", "2"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSmenaSel(s)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                            smenaSel === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s}-smena
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">har smenaga alohida vaqt</span>
                  </div>
                )}

                <SettingsGroup icon={Clock} title="Vaqt">
                  <Field label="Kech qolish vaqti" hint="Shu vaqtdan keyin kelgan \"kech\" hisoblanadi.">
                    <Input type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} />
                  </Field>
                  <Field label="Darslar tugashi (standart)" hint="Jadval yo'q bo'lsa ishlatiladi. Undan oldin ketsa — \"erta\".">
                    <Input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} />
                  </Field>
                  <Field label="Kamera ochilishi" hint="Shu vaqtdan kamera ishlaydi.">
                    <Input type="time" value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} />
                  </Field>
                  <Field label="Kamera yopilishi" hint="Shu vaqtdan keyin kun yakunlanadi.">
                    <Input type="time" value={closeAfter} onChange={(e) => setCloseAfter(e.target.value)} />
                  </Field>
                </SettingsGroup>

                <SettingsGroup icon={ScanFace} title="Aniqlik">
                  <Field label="Tanish aniqligi" hint={THRESHOLDS.find((t) => String(t.v) === threshold)?.hint ?? ""}>
                    <Select value={threshold} onValueChange={setThreshold}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {THRESHOLDS.map((t) => (
                          <SelectItem key={t.v} value={String(t.v)}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </SettingsGroup>

                <SettingsGroup icon={CalendarRange} title="Chorak hisobi">
                  <Field label="Chorak boshlanishi" hint="Bo'sh bo'lsa avtomatik aniqlanadi.">
                    <Input type="date" value={quarterStart} onChange={(e) => setQuarterStart(e.target.value)} />
                  </Field>
                  <Field label="Chorak tugashi" hint="Bo'sh bo'lsa bugungi kungacha.">
                    <Input type="date" value={quarterEnd} onChange={(e) => setQuarterEnd(e.target.value)} />
                  </Field>
                  <Field label="Soat chegarasi" hint="Shu soatga yetganda ogohlantiriladi (odatda 36).">
                    <Input type="number" min={1} max={500} value={hourLimit} onChange={(e) => setHourLimit(e.target.value)} />
                  </Field>
                </SettingsGroup>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <Switch checked={notify} onCheckedChange={setNotify} />
                    <span>
                      O'quvchiga Telegramda <b>"Keldingiz / Chiqdingiz"</b> xabari
                    </span>
                  </label>
                  <Button onClick={() => void saveSettings()} disabled={saving} className="sm:min-w-32">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Saqlash
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" /> Xabarnomalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Darslar boshlangach, hali kelmagan o'quvchilarni rahbarlarga yuboring.
                  </p>
                  <Button variant="outline" className="w-full justify-between" onClick={() => void notifyAbsent()} disabled={sending}>
                    <span className="flex items-center gap-2">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kelmaganlar — rahbarlarga
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between" onClick={() => void sendSummary()} disabled={summing}>
                    <span className="flex items-center gap-2">
                      {summing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                      Kunlik xulosa — sinf guruhlariga
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Xulosa har kuni soat 09:00 da avtomatik ham yuboriladi (guruh ulangan bo'lsa).
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-xs text-muted-foreground">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>
                  Rasmlar saqlanmaydi — faqat yuzning raqamli izi. Ro'yxatga olish ota-ona roziligi bilan,
                  istalgan o'quvchining ma'lumoti bir tugma bilan o'chiriladi.
                </span>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Xavfli amal
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Eski yuz ma'lumotlarini o'chiradi. Keyin hamma yangi 7 burchak bilan qaytadan olinadi.
                  </p>
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
