// Sinflar sahifasidagi "Fayl orqali ommaviy qo'shish" bo'limi.
// Fayl → tahlil (yangi / mavjud / rad) → tasdiqlash → yaratish → kirish ma'lumotlari (CSV).

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet, Upload, Download, Loader2, CheckCircle2, AlertTriangle, Info, RotateCcw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseImportFile, type ImportRow } from "@/lib/bulk-import";

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
  full_name: string;
  birth_date: string;
  gender: string;
  status: "new" | "exists" | "rejected";
  reason: string;
}
interface PreviewResp {
  rows: Analyzed[];
  new_classes: string[];
  counts: { new: number; exists: number; rejected: number };
}
interface CommitResp {
  classes_created: string[];
  created: { full_name: string; class_name: string; login: string; password: string; login_id: string }[];
  errors: { full_name: string; error: string }[];
  counts: { new: number; exists: number; rejected: number };
}

const STATUS_STYLE: Record<Analyzed["status"], { label: string; cls: string }> = {
  new: { label: "Yangi", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  exists: { label: "Mavjud", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  rejected: { label: "Rad etildi", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
};

export function BulkImportSection() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [result, setResult] = useState<CommitResp | null>(null);

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
    setResult(null);
  };

  const onFile = async (file: File) => {
    setParsing(true);
    setResult(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.length === 0) throw new Error("Faylda qator topilmadi");
      setRows(parsed);
      setPreview(await call<PreviewResp>("/bulk/preview", { rows: parsed }));
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!preview || preview.counts.new === 0) return;
    const extra = preview.new_classes.length ? ` va ${preview.new_classes.length} ta yangi sinf` : "";
    if (!confirm(`${preview.counts.new} ta o'quvchi${extra} qo'shilsinmi?`)) return;
    setBusy(true);
    try {
      const r = await call<CommitResp>("/bulk/commit", { rows });
      setResult(r);
      setPreview(null);
      toast({ title: "Ommaviy qo'shish yakunlandi", description: `${r.created.length} ta o'quvchi qo'shildi` });
      await qc.invalidateQueries();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const downloadCredentials = (list: CommitResp["created"]) => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      "Sinf,F.I.O,Login,Parol,Kirish ID",
      ...list.map((c) => [c.class_name, c.full_name, c.login, c.password, c.login_id].map(esc).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kirish-malumotlari.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Fayl orqali ommaviy qo'shish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Tayyor shablonni yuklab oling, to'ldiring yoki o'zingizning ro'yxatingizni yuklang.
            Faqat <b>5–11 sinflar</b> qabul qilinadi. Mavjud o'quvchilar takror qo'shilmaydi.
          </p>
          <a href={`${import.meta.env.BASE_URL}tayyor_import.xlsx`} download>
            <Button variant="outline" size="sm" className="shrink-0">
              <Download className="w-4 h-4 mr-2" /> Tayyor shablon
            </Button>
          </a>
        </div>

        {!preview && !result && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 cursor-pointer hover:bg-muted/40 transition">
            {parsing ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
            <span className="text-sm font-medium">{parsing ? "Tahlil qilinmoqda…" : "Excel yoki CSV faylni tanlang"}</span>
            <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
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
              <Badge variant="outline" className={STATUS_STYLE.exists.cls}>Mavjud: {preview.counts.exists}</Badge>
              <Badge variant="outline" className={STATUS_STYLE.rejected.cls}>Rad: {preview.counts.rejected}</Badge>
              {preview.new_classes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Yangi sinflar: {preview.new_classes.join(", ")}
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">#</th>
                    <th className="px-3 py-2 text-left w-20">Sinf</th>
                    <th className="px-3 py-2 text-left">F.I.O</th>
                    <th className="px-3 py-2 text-left w-28">Holat</th>
                    <th className="px-3 py-2 text-left">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.index} className="border-t">
                      <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{r.index + 1}</td>
                      <td className="px-3 py-1.5 font-semibold">{r.class_name}</td>
                      <td className="px-3 py-1.5">{r.full_name}</td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className={STATUS_STYLE[r.status].cls}>
                          {STATUS_STYLE[r.status].label}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={reset} disabled={busy}>
                <RotateCcw className="w-4 h-4 mr-2" /> Boshqa fayl
              </Button>
              <Button onClick={() => void commit()} disabled={busy || preview.counts.new === 0}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {preview.counts.new} ta o'quvchini qo'shish
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Yakunlandi
              </div>
              <div>Qo'shildi: <b>{result.created.length}</b> o'quvchi · Yangi sinf: <b>{result.classes_created.length}</b></div>
              <div className="text-muted-foreground">Mavjud (o'tkazib yuborilgan): {result.counts.exists} · Rad etilgan: {result.counts.rejected}</div>
              {result.errors.length > 0 && (
                <div className="text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Xatolik: {result.errors.length} ta
                </div>
              )}
            </div>

            {result.created.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                  <span>
                    Parollar faqat hozir ko'rsatiladi va boshqa joyda saqlanmaydi. Hozir CSV faylni yuklab oling.
                  </span>
                </div>
                <Button onClick={() => downloadCredentials(result.created)}>
                  <Download className="w-4 h-4 mr-2" /> Kirish ma'lumotlarini yuklab olish (CSV)
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Yangi fayl yuklash
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
