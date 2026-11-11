// Dars jadvalini fayl orqali ommaviy qo'shish.
// Asl jadval (grid) yoki shablon yuklansa — tizim o'zi o'qiydi.
// O'qituvchisi yozilmagan darslar sariq rangda ajratiladi.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Upload, Download, Loader2, CheckCircle2, RotateCcw, AlertTriangle, UserX,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseTimetableWorkbook, type TimetableRow } from "@/lib/timetable-grid";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function authJson(): HeadersInit {
  const t = localStorage.getItem("talim_auth_token");
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

interface Analyzed {
  index: number;
  class_name: string;
  day: string;
  day_of_week: number | null;
  period: number | null;
  subject: string;
  teacher: string;
  status: "new" | "update" | "warning" | "rejected";
  reason: string;
}

interface PreviewResp {
  rows: Analyzed[];
  counts: { new: number; update: number; warning: number; rejected: number };
}

const STATUS_STYLE: Record<Analyzed["status"], { label: string; cls: string }> = {
  new: { label: "Yangi", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  update: { label: "Yangilanadi", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  warning: { label: "Ogohlantirish", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  rejected: { label: "Rad etildi", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
};

export function TimetableBulkSection() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const call = async <T,>(path: string, body: unknown): Promise<T> => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: authJson(),
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
    return d as T;
  };

  const reset = () => {
    setFileName("");
    setRows([]);
    setPreview(null);
    setSaved(null);
  };

  const payload = (list: TimetableRow[]) =>
    list.map((r) => ({
      class_name: r.class_name,
      day: r.day,
      period: r.period,
      subject: r.subject,
      teacher: r.teacher,
    }));

  const onFile = async (file: File) => {
    setParsing(true);
    setSaved(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const parsed = await parseTimetableWorkbook(file);
      setRows(parsed);
      setPreview(await call<PreviewResp>("/timetable/bulk/preview", { rows: payload(parsed) }));
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    const total = preview.counts.new + preview.counts.update + preview.counts.warning;
    if (total === 0) return;
    if (!confirm(`${total} ta dars saqlansinmi? (${preview.counts.update} tasi mavjudini yangilaydi)`)) return;
    setBusy(true);
    try {
      const r = await call<{ saved: number }>("/timetable/bulk/commit", { rows: payload(rows) });
      setSaved(r.saved);
      setPreview(null);
      toast({ title: "Dars jadvali saqlandi", description: `${r.saved} ta dars` });
      await qc.invalidateQueries();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // O'qituvchisi yozilmagan darslar soni (rad etilmaganlar orasida)
  const noTeacher = preview
    ? preview.rows.filter((r) => !r.teacher && r.status !== "rejected").length
    : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Dars jadvalini fayl orqali ommaviy qo'shish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Asl jadval Excel faylini to'g'ridan-to'g'ri yuklang — tizim sinflar, kunlar va darslarni
            o'zi ajratadi. Mavjud dars yangilanadi. O'qituvchi ismi tizimdagi F.I.O bilan bir xil bo'lishi kerak.
          </p>
          <a href={`${import.meta.env.BASE_URL}tayyor_dars_jadvali.xlsx`} download>
            <Button variant="outline" size="sm" className="shrink-0">
              <Download className="w-4 h-4 mr-2" /> Shablon
            </Button>
          </a>
        </div>

        {!preview && saved === null && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 cursor-pointer hover:bg-muted/40 transition">
            {parsing ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
            <span className="text-sm font-medium">{parsing ? "Tahlil qilinmoqda…" : "Excel faylni tanlang"}</span>
            <span className="text-xs text-muted-foreground">.xlsx, .xls — asl jadval yoki shablon</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={parsing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}:</span>
              <Badge variant="outline" className={STATUS_STYLE.new.cls}>Yangi: {preview.counts.new}</Badge>
              <Badge variant="outline" className={STATUS_STYLE.update.cls}>Yangilanadi: {preview.counts.update}</Badge>
              <Badge variant="outline" className={STATUS_STYLE.warning.cls}>Ogohlantirish: {preview.counts.warning}</Badge>
              <Badge variant="outline" className={STATUS_STYLE.rejected.cls}>Rad: {preview.counts.rejected}</Badge>
              {noTeacher > 0 && (
                <Badge variant="outline" className="bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-500/50">
                  <UserX className="w-3 h-3 mr-1" /> O'qituvchisiz: {noTeacher}
                </Badge>
              )}
            </div>

            <div className="max-h-96 overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left w-20">Sinf</th>
                    <th className="px-3 py-2 text-left w-28">Kun</th>
                    <th className="px-3 py-2 text-left w-14">#</th>
                    <th className="px-3 py-2 text-left">Fan</th>
                    <th className="px-3 py-2 text-left">O'qituvchi</th>
                    <th className="px-3 py-2 text-left w-40">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => {
                    const note = rows[r.index]?.note ?? "";
                    const noT = !r.teacher && r.status !== "rejected";
                    return (
                      <tr
                        key={r.index}
                        className={`border-t align-top ${noT ? "bg-amber-400/15" : ""}`}
                      >
                        <td className="px-3 py-1.5 font-semibold">{r.class_name}</td>
                        <td className="px-3 py-1.5">{r.day}</td>
                        <td className="px-3 py-1.5 tabular-nums">{r.period}</td>
                        <td className={`px-3 py-1.5 ${noT ? "font-semibold text-amber-700 dark:text-amber-300" : ""}`}>
                          {r.subject}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.teacher ? (
                            r.teacher
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                              <UserX className="w-3.5 h-3.5" /> Yozilmagan
                            </span>
                          )}
                          {note && <div className="text-[11px] text-muted-foreground mt-0.5">{note}</div>}
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className={STATUS_STYLE[r.status].cls}>
                            {STATUS_STYLE[r.status].label}
                          </Badge>
                          {r.reason && <div className="text-[11px] text-muted-foreground mt-0.5">{r.reason}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={reset} disabled={busy}>
                <RotateCcw className="w-4 h-4 mr-2" /> Boshqa fayl
              </Button>
              <Button onClick={() => void commit()} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Saqlash
              </Button>
            </div>
          </div>
        )}

        {saved !== null && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="font-semibold flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Saqlandi: {saved} ta dars
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              O'qituvchisiz darslar sariq rangda ko'rsatilgan edi. Ularni tahrirlab o'qituvchini qo'shing.
            </div>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" /> Yangi fayl yuklash
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
