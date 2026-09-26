// Face ID — boshqaruv sahifasi (admin / rahbariyat). Keldi/ketdi holati, sozlamalar.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Play, ScanFace, Send, ShieldCheck, UserCheck, Clock, Users, Settings2,
  DoorOpen, ArrowDownLeft, ArrowUpRight, Trash2, GraduationCap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/face";

interface Overview {
  date: string;
  time: string;
  settings: { late_after: string; notify: boolean; threshold: number; min_stay: number };
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
  { v: 0.42, label: "Qat'iy — adashish kam, ba'zan tanimaydi" },
  { v: 0.48, label: "O'rtacha (tavsiya)" },
  { v: 0.54, label: "Yumshoq — tez taniydi, adashish ehtimoli bor" },
];

const STAT_ACCENT = {
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
} as const;

function Stat({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; accent: keyof typeof STAT_ACCENT;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${STAT_ACCENT[accent]} p-4`}>
      <div className="flex items-center gap-2 text-sm font-medium opacity-90"><Icon className="w-4 h-4" />{label}</div>
      <div className="mt-1 text-3xl sm:text-4xl font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
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
  const [minStay, setMinStay] = useState("20");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!ov.data) return;
    setLateAfter(ov.data.settings.late_after);
    setNotify(ov.data.settings.notify);
    setThreshold(String(ov.data.settings.threshold));
    setMinStay(String(ov.data.settings.min_stay ?? 20));
  }, [ov.data?.settings.late_after, ov.data?.settings.notify, ov.data?.settings.threshold, ov.data?.settings.min_stay]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api("/faceid/settings", { method: "POST", body: JSON.stringify({ late_after: lateAfter, notify, threshold: Number(threshold), min_stay: Number(minStay) }) });
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
    <div className="space-y-5">
      {/* Sarlavha */}
      <div className="rounded-3xl border bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
              <ScanFace className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Face ID davomat</h1>
              <p className="text-sm text-muted-foreground">Yuz orqali keldi/ketdi — oddiy telefon kamerasi bilan</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/faceid/enroll"><Button variant="outline"><ScanFace className="w-4 h-4 mr-2" />Yuzlarni ro'yxatga olish</Button></Link>
            <Link href="/faceid/kiosk">
              <Button className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:opacity-90 shadow-md">
                <Play className="w-4 h-4 mr-2" />Bugungi Face ID ni boshlash
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {ov.isLoading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" /></div>}
      {ov.isError && <div className="text-destructive">{(ov.error as Error).message}</div>}

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={UserCheck} label="Bugun keldi" value={d.arrived} sub={`${pct}% ro'yxatdagilardan`} accent="emerald" />
            <Stat icon={Clock} label="Kechikkanlar" value={d.late} sub={`${d.settings.late_after} dan keyin`} accent="amber" />
            <Stat icon={DoorOpen} label="Ketdi" value={d.left} sub={d.early ? `${d.early} tasi erta ketgan` : `Maktabda: ${inSchool}`} accent="sky" />
            <Stat icon={ScanFace} label="Ro'yxatda" value={d.enrolled} sub={`${d.students} o'quvchidan · ${d.time}`} accent="violet" />
          </div>

          {d.enrolled === 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-5 text-sm space-y-1">
                <div className="font-semibold">Qanday boshlanadi?</div>
                <div>1. <b>Yuzlarni ro'yxatga olish</b> — sinf rahbarlari telefonda har bir o'quvchini bir marta skanerlaydi (ota-ona roziligi bilan).</div>
                <div>2. Ertalab <b>Bugungi Face ID ni boshlash</b> ni bosing va telefonni kirish eshigi yoniga qo'ying.</div>
                <div>3. O'quvchi kameraga qaraydi → "keldi" yoziladi, o'quvchiga Telegram xabar.</div>
                <div>4. Uyga ketayotganda yana qaraydi → "ketdi" (dars jadvalidan oldin bo'lsa — "erta ketdi").</div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Sinflar bo'yicha — bugun</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {d.classes.map((c) => {
                  const p = c.enrolled ? Math.round((c.arrived / c.enrolled) * 100) : 0;
                  const isStaff = c.class_name === "Xodimlar";
                  return (
                    <div key={c.class_name} className="flex items-center gap-3">
                      <div className="w-16 font-semibold text-sm flex items-center gap-1 shrink-0">
                        {isStaff && <GraduationCap className="w-3.5 h-3.5 text-violet-500" />}
                        <span className="truncate">{c.class_name}</span>
                      </div>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${isStaff ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"}`} style={{ width: `${p}%` }} />
                      </div>
                      <div className="w-40 sm:w-48 text-right text-xs text-muted-foreground tabular-nums">
                        <b className="text-foreground">{c.arrived}</b>/{c.enrolled} keldi
                        {c.late > 0 && <span className="text-amber-500"> · {c.late} kech</span>}
                        {c.left > 0 && <span className="text-sky-500"> · {c.left} ketdi</span>}
                        {c.early > 0 && <span className="text-amber-500"> ({c.early} erta)</span>}
                      </div>
                    </div>
                  );
                })}
                {d.classes.length === 0 && <div className="text-sm text-muted-foreground py-2">O'quvchilar hali qo'shilmagan</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Oxirgi harakatlar</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {d.recent.map((r, i) => {
                  const late = r.kind === "in" && r.status === "late";
                  const early = r.kind === "out" && r.status === "early";
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        r.kind === "in" ? (late ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500")
                                        : (early ? "bg-amber-500/15 text-amber-500" : "bg-sky-500/15 text-sky-500")}`}>
                        {r.kind === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.student_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.kind === "in" ? (late ? "kech keldi" : "keldi") : early ? "erta ketdi" : "ketdi"} · {r.class_name}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums shrink-0">{r.time}</div>
                    </div>
                  );
                })}
                {d.recent.length === 0 && <div className="text-sm text-muted-foreground py-2">Bugun hali hech kim o'tmadi</div>}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Sozlamalar</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-sm">Kech qolish vaqti</label>
                  <Input type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} />
                  <label className="text-sm">Ketish hisoblanadi (kelgandan keyin)</label>
                  <Select value={minStay} onValueChange={setMinStay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 60, 120].map((m) => <SelectItem key={m} value={String(m)}>{m} daqiqadan keyin</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className="text-sm">Tanish aniqligi</label>
                  <Select value={threshold} onValueChange={setThreshold}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {THRESHOLDS.map((t) => <SelectItem key={t.v} value={String(t.v)}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                  O'quvchiga Telegramda "Keldingiz / Chiqdingiz" xabari
                </label>
                <Button onClick={() => void saveSettings()} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Saqlash
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" />Kelmaganlar</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Darslar boshlangach, hali kelmagan o'quvchilar ro'yxatini har bir sinf rahbariga va direktorga Telegramda yuboring.</p>
                <Button variant="outline" onClick={() => void notifyAbsent()} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Yuborish
                </Button>
                <div className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Rasmlar saqlanmaydi — faqat yuzning raqamli izi. Ro'yxatga olish ota-ona roziligi bilan; istalgan o'quvchining ma'lumoti bir tugma bilan o'chiriladi.</span>
                </div>

                {isAdmin && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <div className="text-xs font-semibold text-destructive flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Eski yuz ma'lumotlarini tozalash</div>
                    <p className="text-xs text-muted-foreground">Eski (3 namunali) ro'yxatdan o'tganlarni o'chiradi. Keyin hamma yangi 7 burchak bilan qaytadan olinadi.</p>
                    <Button variant="destructive" size="sm" onClick={() => void resetAll()} disabled={resetting}>
                      {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Hammasini o'chirish
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
