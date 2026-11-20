// Rozilik va qoidalar.
// • Hamma uchun: qoidalar, o'z imzolari.
// • Admin: butun tuman / barcha maktablar. Direktor/zavuch/MMTB: o'z maktabi. Sinf rahbari: o'z sinfi.
// • Har bir sinf uchun qoidalar va Face ID roziligi FOIZ bilan, rangli holatda.
// Yuz ma'lumoti bu sahifada hech qachon ko'rsatilmaydi.

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ScrollText, ShieldCheck, Printer, Loader2, Users, Search, CheckCircle2, XCircle, Lock,
  ScanFace, FileSignature, Ban, ChevronRight,
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
interface Student { login: string; full_name: string; status: Status; rules: boolean; signer_name: string | null; signed_at: string | null }
interface SummaryRow { maktab_id: number | null; maktab_nom: string; class_name: string; total: number; rules_signed: number; face_signed: number; enrolled: number }
interface ClassRow { class_name: string }

const KIND_UZ: Record<Rec["kind"], string> = { rules: "Qoidalar", face_id: "Face ID imzosi", face_id_revoked: "Face ID bekor qilindi" };
const SIGNER_UZ: Record<string, string> = { self: "O'zi", parent: "Ota-ona", revoked: "—" };
const fmt = (s: string) => new Date(s).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
// Rang: 90%+ yashil, 50–89% sariq, 50% dan past qizil
const tone = (p: number) => (p >= 90 ? "emerald" : p >= 50 ? "amber" : "rose") as "emerald" | "amber" | "rose";
const TONE_CLS = {
  emerald: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Yaxshi" },
  amber: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", label: "O'rtacha" },
  rose: { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", label: "Past" },
};

function StatusBadge({ st }: { st: Status }) {
  if (st === "enrolled")
    return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/15"><ScanFace className="w-3 h-3 mr-1" />Yuz olingan</Badge>;
  if (st === "signed")
    return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/15"><FileSignature className="w-3 h-3 mr-1" />Imzo bor · yuz olinmagan</Badge>;
  return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/15"><Lock className="w-3 h-3 mr-1" />Qulf · imzo yo'q</Badge>;
}

function Meter({ label, a, b }: { label: string; a: number; b: number }) {
  const p = pctOf(a, b);
  const t = TONE_CLS[tone(p)];
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className={`font-bold tabular-nums ${t.text}`}>{p}% <span className="font-normal text-muted-foreground">({a}/{b})</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${t.bar} transition-all`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export default function RozilikPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const role = user?.role ?? "";
  const isAdmin = role === "admin";
  const isMgmt = ["admin", "director", "zam_direktor", "zavuch"].includes(role);
  const canFace = isMgmt || ["sinf_rahbari", "boshlangich_oqituvchi"].includes(role);
  const ownClass = (user as unknown as { class_name?: string })?.class_name ?? "";

  const mine = useQuery<Rec[]>({ queryKey: ["consent-mine"], queryFn: () => get<Rec[]>("/consent/mine") });
  const summary = useQuery<SummaryRow[]>({
    queryKey: ["consent-summary"],
    queryFn: () => get<SummaryRow[]>("/consent/summary"),
    enabled: canFace,
  });
  const classes = useQuery<ClassRow[]>({
    queryKey: ["faceid-classes"],
    queryFn: () => get<ClassRow[]>("/faceid/classes"),
    enabled: isMgmt,
  });
  const records = useQuery<Rec[]>({
    queryKey: ["consent-records"],
    queryFn: () => get<Rec[]>("/consent/records"),
    enabled: isMgmt,
  });

  const [cls, setCls] = useState<string>(!isMgmt && ownClass ? ownClass : "");
  const [filter, setFilter] = useState<"all" | "locked" | "signed" | "enrolled" | "norules">("all");
  const [search, setSearch] = useState("");
  const students = useQuery<Student[]>({
    queryKey: ["consent-students", cls],
    queryFn: () => get<Student[]>(`/consent/students?class_name=${encodeURIComponent(cls)}`),
    enabled: canFace && !!cls,
  });

  const [form, setForm] = useState<{ login: string; name: string; type: "parent" | "self"; sig: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["consent-students"] });
    await qc.invalidateQueries({ queryKey: ["consent-summary"] });
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
    } finally { setBusy(false); }
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

  // Maktablar bo'yicha guruhlash (admin uchun)
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; rows: SummaryRow[] }>();
    for (const r of summary.data ?? []) {
      const key = String(r.maktab_id ?? "x");
      if (!m.has(key)) m.set(key, { name: r.maktab_nom || `${r.maktab_id ?? "—"}-maktab`, rows: [] });
      m.get(key)!.rows.push(r);
    }
    return Array.from(m.values());
  }, [summary.data]);

  const totals = useMemo(() => {
    const rows = summary.data ?? [];
    const total = rows.reduce((s, r) => s + r.total, 0);
    const rules = rows.reduce((s, r) => s + r.rules_signed, 0);
    const face = rows.reduce((s, r) => s + r.face_signed, 0);
    return { total, rules, face, rulesP: pctOf(rules, total), faceP: pctOf(face, total) };
  }, [summary.data]);

  const all = students.data ?? [];
  const counts = {
    locked: all.filter((s) => s.status === "locked").length,
    signed: all.filter((s) => s.status === "signed").length,
    enrolled: all.filter((s) => s.status === "enrolled").length,
    norules: all.filter((s) => !s.rules).length,
  };
  const shown = all
    .filter((s) => filter === "all" || (filter === "norules" ? !s.rules : s.status === filter))
    .filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));
  const shownRecords = (records.data ?? []).filter((r) =>
    `${r.subject_name} ${r.signer_name} ${r.class_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ScrollText className="w-6 h-6 text-primary" /> Rozilik</h1>
          <p className="text-sm text-muted-foreground mt-1">Kim imzoladi, kim imzolamadi — foiz va rang bilan</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Chop etish</Button>
      </div>

      {/* 1. Umumiy foiz */}
      {canFace && summary.data && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Umumiy holat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Meter label="Platforma qoidalari" a={totals.rules} b={totals.total} />
              <Meter label="Face ID roziligi" a={totals.face} b={totals.total} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ranglar: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">yashil 90% dan yuqori</span> ·{" "}
              <span className="text-amber-600 dark:text-amber-400 font-semibold">sariq 50–89%</span> ·{" "}
              <span className="text-rose-600 dark:text-rose-400 font-semibold">qizil 50% dan past</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2. Sinflar bo'yicha */}
      {canFace && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Sinflar bo'yicha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {summary.isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
            {(summary.data ?? []).length === 0 && !summary.isLoading && (
              <div className="text-sm text-muted-foreground py-6 text-center">Ma'lumot yo'q</div>
            )}
            {groups.map((g) => (
              <div key={g.name} className="space-y-2">
                {isAdmin && <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.name}</div>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.rows.map((r) => {
                    const active = cls === r.class_name;
                    const rp = pctOf(r.rules_signed, r.total);
                    const t = TONE_CLS[tone(rp)];
                    return (
                      <button
                        key={`${r.maktab_id}-${r.class_name}`}
                        onClick={() => setCls(r.class_name)}
                        className={`text-left rounded-xl border p-3 transition hover:border-primary/50 ${active ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="font-semibold text-sm">{r.class_name}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.bg} ${t.text}`}>{t.label}</span>
                        </div>
                        <div className="space-y-2">
                          <Meter label="Qoidalar" a={r.rules_signed} b={r.total} />
                          <Meter label="Face ID" a={r.face_signed} b={r.total} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                          <span>{r.total} o'quvchi · {r.enrolled} ta yuz olingan</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3. Tanlangan sinf: kim imzoladi / kim imzolamadi */}
      {canFace && cls && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {cls} sinfi — o'quvchilar
              <span className="ml-auto text-xs font-normal text-muted-foreground">{all.length} ta</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {([
                ["all", "Hammasi", all.length, "text-foreground"],
                ["norules", "Qoida imzosiz", counts.norules, "text-rose-600 dark:text-rose-400"],
                ["locked", "Qulf", counts.locked, "text-rose-600 dark:text-rose-400"],
                ["signed", "Imzo bor", counts.signed, "text-amber-600 dark:text-amber-400"],
                ["enrolled", "Yuz olingan", counts.enrolled, "text-emerald-600 dark:text-emerald-400"],
              ] as const).map(([k, label, n, c]) => (
                <button key={k} onClick={() => setFilter(filter === k ? "all" : k)}
                  className={`rounded-xl border p-2.5 text-center ${filter === k ? "border-primary bg-primary/5" : ""}`}>
                  <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
                  <div className={`text-xl font-bold tabular-nums ${c}`}>{n}</div>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Ism bo'yicha qidirish…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {students.isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
              <div className="divide-y rounded-xl border overflow-hidden">
                {shown.map((s) => (
                  <div key={s.login} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${s.status === "locked" || !s.rules ? "bg-rose-500/5" : s.status === "enrolled" ? "bg-emerald-500/5" : ""}`}>
                    {s.rules
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.full_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-semibold ${s.rules ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {s.rules ? "Qoidalar imzolangan" : "Qoidalar imzolanmagan"}
                        </span>
                        <StatusBadge st={s.status} />
                      </div>
                      {s.signer_name && <div className="text-[11px] text-muted-foreground mt-1">Face imzo: {s.signer_name} · {s.signed_at}</div>}
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
            )}

            {form && (
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="font-semibold text-sm">Face ID roziligi — imzo</div>
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
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Imzolash
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Mening imzolarim */}
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

      {/* 5. Barcha yozuvlar (rahbariyat) */}
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
