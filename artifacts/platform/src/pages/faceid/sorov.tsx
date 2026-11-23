// Face ID — sababli kelmaslik (bugun yoki ertaga) va dars vaqtida ketish so'rovi.
// Ketish faqat direktor, zavuch yoki MMTB tasdiqlagandan keyin ruxsat etiladi.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, X } from "lucide-react";
import { API_BASE, authHeaders } from "@/lib/face";
import { toast } from "@/hooks/use-toast";

interface Student { login: string; full_name: string; class_name: string }
interface ExitReq {
  id: number; student_login: string; student_name: string; class_name: string; date: string;
  leave_time: string; reason: string; requested_by: string; status: string; decided_by: string; decided_time: string | null;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function call<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), "Content-Type": "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Xatolik (${r.status})`);
  return j as T;
}

export default function FaceSorovPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [login, setLogin] = useState("");
  const [mode, setMode] = useState<"absence" | "exit">("absence");
  const [day, setDay] = useState<"today" | "tomorrow">("tomorrow");
  const [leaveTime, setLeaveTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<ExitReq[]>([]);
  const [canDecide, setCanDecide] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [h, e] = await Promise.all([
      call<{ students: Student[] }>(`/faceid/hisobot?date=${todayIso()}`),
      call<{ requests: ExitReq[]; can_decide: boolean }>(`/faceid/exit-requests?date=${todayIso()}`),
    ]);
    setStudents(h.students ?? []);
    setRequests(e.requests ?? []);
    setCanDecide(Boolean(e.can_decide));
  };

  useEffect(() => {
    reload().catch((err: Error) => toast({ variant: "destructive", title: "Xatolik", description: err.message })).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!login || !reason.trim()) { toast({ variant: "destructive", title: "O'quvchi va sabab kerak" }); return; }
    setBusy(true);
    try {
      if (mode === "absence") {
        const date = day === "today" ? todayIso() : tomorrowIso();
        await call("/faceid/absence-notice", { method: "POST", body: JSON.stringify({ student_login: login, date, reason }) });
        toast({ title: "Sababli kelmaslik belgilandi" });
      } else {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(leaveTime)) { toast({ variant: "destructive", title: "Ketish vaqtini HH:MM ko'rinishida kiriting" }); return; }
        await call("/faceid/exit-request", { method: "POST", body: JSON.stringify({ student_login: login, leave_time: leaveTime, reason }) });
        toast({ title: "So'rov yuborildi", description: "Tasdiqlanmaguncha ketish ruxsat etilmaydi" });
      }
      setReason("");
      await reload();
    } catch (err) {
      toast({ variant: "destructive", title: "Bo'lmadi", description: (err as Error).message });
    } finally { setBusy(false); }
  };

  const decide = async (id: number, approve: boolean) => {
    try {
      await call(`/faceid/exit-request/${id}/decide`, { method: "POST", body: JSON.stringify({ approve }) });
      await reload();
    } catch (err) {
      toast({ variant: "destructive", title: "Bo'lmadi", description: (err as Error).message });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <Link href="/faceid/hisobot" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kunlik hisobot
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">So'rovlar</h1>
        <p className="text-sm text-muted-foreground mt-1">Sababli kelmaslik va dars vaqtida ketish so'rovlari.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Yangi so'rov</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={mode === "absence" ? "default" : "outline"} onClick={() => setMode("absence")}>Sababli kelmaslik</Button>
            <Button size="sm" variant={mode === "exit" ? "default" : "outline"} onClick={() => setMode("exit")}>Dars vaqtida ketish</Button>
          </div>
          <select value={login} onChange={(e) => setLogin(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">O'quvchini tanlang</option>
            {students.map((s) => <option key={s.login} value={s.login}>{s.class_name} · {s.full_name}</option>)}
          </select>
          {mode === "absence" ? (
            <div className="flex gap-2">
              <Button size="sm" variant={day === "today" ? "default" : "outline"} onClick={() => setDay("today")}>Bugun</Button>
              <Button size="sm" variant={day === "tomorrow" ? "default" : "outline"} onClick={() => setDay("tomorrow")}>Ertaga</Button>
            </div>
          ) : (
            <input value={leaveTime} onChange={(e) => setLeaveTime(e.target.value)} placeholder="Ketish vaqti (HH:MM)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          )}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sabab" rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <Button onClick={submit} disabled={busy}>{busy ? "Yuborilmoqda…" : "Yuborish"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Bugungi ketish so'rovlari</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">So'rov yo'q</p>}
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">{r.student_name} · {r.class_name}</div>
                <div className="text-xs text-muted-foreground">Ketish: {r.leave_time} · {r.reason} · {r.requested_by}</div>
              </div>
              {r.status === "pending" ? (
                canDecide ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(r.id, true)}><Check className="h-4 w-4 mr-1" /> Tasdiqlash</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r.id, false)}><X className="h-4 w-4 mr-1" /> Rad etish</Button>
                  </div>
                ) : <span className="text-xs text-amber-600">Kutilmoqda</span>
              ) : (
                <span className={`text-xs font-medium ${r.status === "approved" ? "text-emerald-600" : "text-red-500"}`}>
                  {r.status === "approved" ? "Tasdiqlangan" : "Rad etilgan"} · {r.decided_by}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
