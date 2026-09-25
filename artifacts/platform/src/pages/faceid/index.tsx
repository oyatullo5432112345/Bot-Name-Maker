// Face ID — boshqaruv sahifasi (admin / rahbariyat)

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, ScanFace, Send, ShieldCheck, UserCheck, Clock, Users, Settings2, DoorOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="w-4 h-4" />{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function FaceIdPage() {
  const qc = useQueryClient();
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
    if (!confirm("Face ID orqali hali kelmaganlar ro'yxati har bir sinf rahbariga Telegramda yuborilsinmi?")) return;
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

  const d = ov.data;
  const pct = d && d.enrolled ? Math.round((d.arrived / d.enrolled) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScanFace className="w-6 h-6 text-primary" /> Face ID davomat</h1>
          <p className="text-sm text-muted-foreground">Maktabga kelish va ketishni yuz orqali avtomatik belgilash — oddiy telefon kamerasi bilan</p>
        </div>
        <div className="flex gap-2">
          <Link href="/faceid/enroll"><Button variant="outline"><ScanFace className="w-4 h-4 mr-2" />Yuzlarni ro'yxatga olish</Button></Link>
          <Link href="/faceid/kiosk">
            <Button className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:opacity-90">
              <Play className="w-4 h-4 mr-2" />Bugungi Face ID ni boshlash
            </Button>
          </Link>
        </div>
      </div>

      {ov.isLoading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" /></div>}
      {ov.isError && <div className="text-destructive">{(ov.error as Error).message}</div>}

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={UserCheck} label="Bugun keldi" value={d.arrived} sub={`${pct}% ro'yxatdagilardan`} />
            <Stat icon={Clock} label="Kechikkanlar" value={d.late} sub={`${d.settings.late_after} dan keyin`} />
            <Stat icon={DoorOpen} label="Ketdi" value={d.left} sub={d.early ? `${d.early} tasi erta ketgan` : `Maktabda: ${Math.max(0, d.arrived - d.left)}`} />
            <Stat icon={ScanFace} label="Face ID'da ro'yxatda" value={d.enrolled} sub={`${d.students} o'quvchidan · ${d.time}`} />
          </div>

          {d.enrolled === 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-5 text-sm space-y-1">
                <div className="font-semibold">Qanday boshlanadi?</div>
                <div>1. <b>Yuzlarni ro'yxatga olish</b> — sinf rahbarlari telefonda har bir o'quvchini bir marta skanerlaydi (ota-ona roziligi bilan).</div>
                <div>2. Ertalab <b>Bugungi Face ID ni boshlash</b> ni bosing va telefonni kirish eshigi yoniga qo'ying.</div>
                <div>3. O'quvchi kameraga qaraydi → davomatga avtomatik "keldi" yoziladi, o'quvchiga Telegramdan xabar boradi.</div>
                <div>4. Uyga ketayotganda yana qaraydi → "ketdi" (dars jadvalidan oldin bo'lsa — "erta ketdi").</div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Sinflar bo'yicha — bugun</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {d.classes.map((c) => {
                  const p = c.enrolled ? Math.round((c.arrived / c.enrolled) * 100) : 0;
                  return (
                    <div key={c.class_name} className="flex items-center gap-3">
                      <div className="w-14 font-semibold text-sm">{c.class_name}</div>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${p}%` }} />
                      </div>
                      <div className="w-44 text-right text-xs text-muted-foreground tabular-nums">
                        <b className="text-foreground">{c.arrived}</b>/{c.enrolled} keldi
                        {c.late > 0 && <span className="text-amber-500"> · {c.late} kech</span>}
                        {c.left > 0 && <span className="text-sky-500"> · {c.left} ketdi</span>}
                        {c.early > 0 && <span className="text-amber-500"> ({c.early} erta)</span>}
                        {c.enrolled < c.total && <span> · {c.total - c.enrolled} ro'yxatsiz</span>}
                      </div>
                    </div>
                  );
                })}
                {d.classes.length === 0 && <div className="text-sm text-muted-foreground">O'quvchilar hali qo'shilmagan</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Oxirgi harakatlar</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {d.recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate flex items-center gap-1.5">
                      {r.kind === "in" ? (
                        <ArrowDownLeft className={`w-4 h-4 shrink-0 ${r.status === "late" ? "text-amber-500" : "text-emerald-500"}`} />
                      ) : (
                        <ArrowUpRight className={`w-4 h-4 shrink-0 ${r.status === "early" ? "text-amber-500" : "text-sky-500"}`} />
                      )}
                      {r.student_name}
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {r.kind === "in" ? (r.status === "late" ? "kech keldi" : "keldi") : r.status === "early" ? "erta ketdi" : "ketdi"} · {r.class_name} · {r.time}
                    </span>
                  </div>
                ))}
                {d.recent.length === 0 && <div className="text-sm text-muted-foreground">Bugun hali hech kim o'tmadi</div>}
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
                <p className="text-muted-foreground">Darslar boshlangach, Face ID orqali hali kelmagan o'quvchilar ro'yxatini har bir sinf rahbariga Telegramda yuboring.</p>
                <Button variant="outline" onClick={() => void notifyAbsent()} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Sinf rahbarlariga yuborish
                </Button>
                <div className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Rasmlar saqlanmaydi — faqat yuzning raqamli izi. Ro'yxatga olish ota-ona roziligi bilan; istalgan o'quvchining ma'lumoti bir tugma bilan o'chiriladi.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
