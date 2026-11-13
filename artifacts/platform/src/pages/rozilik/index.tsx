// Rozilik va qoidalar. Yuz ma'lumoti bu sahifada hech qachon ko'rsatilmaydi.
// Face ID holati: QULF (imzo yo'q) · IMZO BOR (yuz olinmagan) · YUZ OLINGAN (yashil).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ScrollText, ShieldCheck, Printer, Loader2, Users, Search, CheckCircle2, Lock, ScanFace, FileSignature, Ban,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { RulesBody } from "@/components/consent-gate";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authJson = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { headers: authJson() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
  return d as T;
}
async function post(path: string, body: unknown): Promise<void> {
  const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: authJson(), body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
}

interface Rec {
  id: number; subject_login: string; subject_name: string; subject_role: string; class_name: string;
  kind: "rules" | "face_id" | "face_id_revoked"; version: string; signer_type: string; signer_name: string;
  signature: string; recorded_by: string; accepted_at: string;
}
type Status = "locked" | "signed" | "enrolled";
interface Student { login: string; full_name: string; status: Status; signer_name: string | null; signed_at: string | null }
interface ClassRow { class_name: string }

const KIND_UZ: Record<Rec["kind"], string> = { rules: "Qoidalar", face_id: "Face ID imzosi", face_id_revoked: "Face ID bekor qilindi" };
const SIGNER_UZ: Record<string, string> = { self: "O'zi", parent: "Ota-ona", revoked: "—" };
const fmt = (s: string) => new Date(s).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

function StatusBadge({ st }: { st: Status }) {
  if (st === "enrolled")
    return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/15"><ScanFace className="w-3 h-3 mr-1" />Yuz olingan</Badge>;
  if (st === "signed")
    return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/15"><FileSignature className="w-3 h-3 mr-1" />Imzo bor · yuz olinmagan</Badge>;
  return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/15"><Lock className="w-3 h-3 mr-1" />Qulf · imzo yo'q</Badge>;
}

export default function RozilikPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const role = user?.role ?? "";
  const canFace = ["admin", "director", "zam_direktor", "zavuch", "sinf_rahbari", "boshlangich_oqituvchi"].includes(role);
  const isMgmt = ["admin", "director", "zam_direktor", "zavuch"].includes(role);

  const mine = useQuery<Rec[]>({ queryKey: ["consent-mine"], queryFn: () => get<Rec[]>("/consent/mine") });
  const classes = useQuery<ClassRow[]>({
    queryKey: ["faceid-classes"],
    queryFn: () => get<ClassRow[]>("/faceid/classes"),
    enabled: canFace,
  });
  const [cls, setCls] = useState("");
  const students = useQuery<Student[]>({
    queryKey: ["consent-students", cls],
    queryFn: () => get<Student[]>(`/consent/students?class_name=${encodeURIComponent(cls)}`),
    enabled: canFace && !!cls,
  });
  const records = useQuery<Rec[]>({
    queryKey: ["consent-records"],
    queryFn: () => get<Rec[]>("/consent/records"),
    enabled: isMgmt,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [form, setForm] = useState<{ login: string; name: string; type: "parent" | "self"; sig: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["consent-students"] });
    await qc.invalidateQueries({ queryKey: ["consent-records"] });
  };

  const sign = async () => {
    if (!form) return;
    setBusy(true);
    try {
      await post("/consent/face", { student_login: form.login, signer_type: form.type, signer_name: form.name.trim(), signature: form.sig.trim() });
      toast({ title: "Imzo saqlandi ✅", description: "Endi yuz olish mumkin" });
      setForm(null);
      await refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (s: Student) => {
    if (!confirm(`${s.full_name} uchun Face ID roziligi bekor qilinsinmi?\n\nYuz ma'lumoti butunlay o'chadi va o'quvchi qulfga tushadi.`)) return;
    try {
      await post("/consent/face-revoke", { student_login: s.login });
      toast({ title: "Rozilik bekor qilindi", description: "Yuz ma'lumoti o'chirildi" });
      await refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
  };

  const all = students.data ?? [];
  const counts = {
    locked: all.filter((s) => s.status === "locked").length,
    signed: all.filter((s) => s.status === "signed").length,
    enrolled: all.filter((s) => s.status === "enrolled").length,
  };
  const shown = all
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));
  const shownRecords = (records.data ?? []).filter((r) =>
    `${r.subject_name} ${r.signer_name} ${r.class_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ScrollText className="w-6 h-6 text-primary" /> Rozilik va qoidalar</h1>
          <p className="text-sm text-muted-foreground mt-1">Elektron imzo, Face ID ruxsati va qoidalar</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Chop etish</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Platforma qoidalari</CardTitle></CardHeader>
        <CardContent><RulesBody /></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Mening imzolarim</CardTitle></CardHeader>
        <CardContent>
          {mine.isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (mine.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Hali imzo qo'yilmagan</div>
          ) : (
            <div className="divide-y">
              {(mine.data ?? []).map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <Badge variant="outline">{KIND_UZ[r.kind]}</Badge>
                  <span className="text-muted-foreground">{SIGNER_UZ[r.signer_type] ?? r.signer_type} imzosi:</span>
                  <span className="font-medium">{r.signer_name}</span>
                  <span className="font-serif italic text-muted-foreground">{r.signature}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(r.accepted_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canFace && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Face ID ruxsati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Imzo bo'lmasa o'quvchi qulfda turadi va yuzi olinmaydi. Yuz olingan o'quvchi yashil ko'rinadi.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <select className="h-10 rounded-md border bg-background px-3 text-sm sm:w-64" value={cls} onChange={(e) => setCls(e.target.value)}>
                <option value="">Sinfni tanlang</option>
                {(classes.data ?? []).map((c) => <option key={c.class_name} value={c.class_name}>{c.class_name}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Ism bo'yicha qidirish…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {cls && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setFilter(filter === "locked" ? "all" : "locked")} className={`rounded-xl border p-3 text-center ${filter === "locked" ? "border-rose-500 bg-rose-500/10" : ""}`}>
                    <div className="text-xs uppercase text-muted-foreground">Qulf</div><div className="text-xl font-bold text-rose-600">{counts.locked}</div>
                  </button>
                  <button onClick={() => setFilter(filter === "signed" ? "all" : "signed")} className={`rounded-xl border p-3 text-center ${filter === "signed" ? "border-amber-500 bg-amber-500/10" : ""}`}>
                    <div className="text-xs uppercase text-muted-foreground">Imzo bor</div><div className="text-xl font-bold text-amber-600">{counts.signed}</div>
                  </button>
                  <button onClick={() => setFilter(filter === "enrolled" ? "all" : "enrolled")} className={`rounded-xl border p-3 text-center ${filter === "enrolled" ? "border-emerald-500 bg-emerald-500/10" : ""}`}>
                    <div className="text-xs uppercase text-muted-foreground">Yuz olingan</div><div className="text-xl font-bold text-emerald-600">{counts.enrolled}</div>
                  </button>
                </div>

                <div className="divide-y rounded-xl border overflow-hidden">
                  {shown.map((s) => (
                    <div key={s.login} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${s.status === "locked" ? "bg-rose-500/5" : s.status === "enrolled" ? "bg-emerald-500/5" : ""}`}>
                      {s.status === "locked" ? <Lock className="w-4 h-4 text-rose-500 shrink-0" /> : s.status === "enrolled" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <FileSignature className="w-4 h-4 text-amber-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{s.full_name}</div>
                        <div className="mt-1"><StatusBadge st={s.status} /></div>
                        {s.signer_name && <div className="text-[11px] text-muted-foreground mt-1">Imzo: {s.signer_name} · {s.signed_at}</div>}
                      </div>
                      <div className="flex gap-2">
                        {s.status === "locked" && (
                          <Button size="sm" onClick={() => setForm({ login: s.login, name: "", type: "parent", sig: "" })}>Imzo olish</Button>
                        )}
                        {s.status !== "locked" && (
                          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => void revoke(s)}>
                            <Ban className="w-3.5 h-3.5 mr-1" />Bekor qilish
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {shown.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">O'quvchi topilmadi</div>}
                </div>
              </>
            )}

            {form && (
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="font-semibold text-sm">Rozilik imzosi</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["parent", "self"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      className={`rounded-xl border px-3 py-2 text-sm ${form.type === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      {t === "parent" ? "Ota-ona (vakil)" : "O'quvchining o'zi"}
                    </button>
                  ))}
                </div>
                <Input placeholder="Imzo chiquvchining ism-familiyasi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Imzo: yuqoridagi ism-familiyani aynan yozing" className="font-serif italic" value={form.sig} onChange={(e) => setForm({ ...form, sig: e.target.value })} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setForm(null)}>Bekor</Button>
                  <Button disabled={busy || form.name.trim().length < 5 || form.sig.trim().toUpperCase() !== form.name.trim().toUpperCase()} onClick={() => void sign()}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Imzolash
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isMgmt && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">Barcha yozuvlar <Badge variant="outline">{(records.data ?? []).length}</Badge></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Ism, sinf yoki imzo bo'yicha…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {records.isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Sana</th>
                      <th className="px-3 py-2 text-left">Kim</th>
                      <th className="px-3 py-2 text-left">Sinf</th>
                      <th className="px-3 py-2 text-left">Turi</th>
                      <th className="px-3 py-2 text-left">Imzo chiquvchi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRecords.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{fmt(r.accepted_at)}</td>
                        <td className="px-3 py-2 font-medium">{r.subject_name}</td>
                        <td className="px-3 py-2">{r.class_name || "—"}</td>
                        <td className="px-3 py-2"><Badge variant="outline">{KIND_UZ[r.kind]}</Badge></td>
                        <td className="px-3 py-2">{r.kind === "face_id_revoked" ? "—" : `${SIGNER_UZ[r.signer_type] ?? r.signer_type}: ${r.signer_name}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
