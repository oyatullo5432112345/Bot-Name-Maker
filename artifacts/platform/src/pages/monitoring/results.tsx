// Natijalar oynasi: savollar kesimida variantlar statistikasi (+ testda o'quvchilar ro'yxati)
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Download, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mApi, letter, scoreTone, type Stats, type TestRow } from "./api";

interface ResultRow { student_login: string; student_name: string; class_name: string; score: number; total: number; percentage: number }

const pctOf = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

function downloadCsv(test: TestRow, stats: Stats) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [["Savol", "Variant", "Tanlaganlar soni", "Foiz"]];
  for (const q of stats.questions) {
    q.options.forEach((o, i) => rows.push([q.question, `${letter(i)}) ${o}`, q.counts[i] ?? 0, `${pctOf(q.counts[i] ?? 0, q.answered)}%`]));
  }
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${test.title.replace(/[^\p{L}\p{N}]+/gu, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsDialog({ test, onClose }: { test: TestRow | null; onClose: () => void }) {
  const id = test?.id;
  const isSurvey = test?.kind === "survey";

  const stats = useQuery<Stats>({
    queryKey: ["monitoring-stats", id],
    queryFn: () => mApi<Stats>(`/tests/${id}/stats`),
    enabled: !!id,
  });
  const results = useQuery<ResultRow[]>({
    queryKey: ["monitoring-results", id],
    queryFn: () => mApi<ResultRow[]>(`/tests/${id}/results`),
    enabled: !!id && !isSurvey,
  });

  const s = stats.data;
  const avg = results.data && results.data.length
    ? Math.round(results.data.reduce((a, r) => a + r.percentage, 0) / results.data.length)
    : null;

  return (
    <Dialog open={!!test} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{test?.title}</DialogTitle>
          <DialogDescription>{isSurvey ? "So'rovnoma natijalari" : `${test?.subject} · ${test?.quarter}-chorak natijalari`}</DialogDescription>
        </DialogHeader>

        {stats.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : stats.isError || !s ? (
          <p className="text-sm text-destructive py-8 text-center">{(stats.error as Error | null)?.message ?? "Yuklab bo'lmadi"}</p>
        ) : s.total === 0 ? (
          <div className="py-14 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Hali hech kim javob bermagan</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Umumiy ko'rsatkichlar */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold">
                <Users className="w-4 h-4" /> {s.total} ta javob
              </span>
              {avg !== null && (
                <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold ${scoreTone(avg)}`}>
                  <Trophy className="w-4 h-4" /> O'rtacha {avg}%
                </span>
              )}
              {isSurvey && (
                <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => downloadCsv(test!, s)}>
                  <Download className="w-3.5 h-3.5" /> CSV yuklab olish
                </Button>
              )}
            </div>

            {s.by_class.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Sinflar bo'yicha ishtirok</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.by_class.map((c) => (
                    <span key={c.class_name} className="rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
                      <b>{c.class_name}</b> · {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Savollar kesimida */}
            <div className="space-y-4">
              {s.questions.map((q, qi) => {
                const top = Math.max(...q.counts, 0);
                const correctPct = q.correct_index !== null ? pctOf(q.counts[q.correct_index] ?? 0, q.answered) : null;
                return (
                  <div key={q.id} className="rounded-2xl border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-snug"><span className="text-muted-foreground mr-1">{qi + 1}.</span>{q.question}</p>
                      {correctPct !== null && (
                        <span className={`shrink-0 text-xs font-bold rounded-lg px-2 py-1 ${scoreTone(correctPct)}`}>{correctPct}% to'g'ri</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {q.options.map((o, oi) => {
                        const c = q.counts[oi] ?? 0;
                        const p = pctOf(c, q.answered);
                        const isCorrect = q.correct_index === oi;
                        const isTop = isSurvey && top > 0 && c === top;
                        return (
                          <div key={oi} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className={`flex items-center gap-1.5 min-w-0 ${isTop || isCorrect ? "font-semibold" : ""}`}>
                                <span className="text-muted-foreground shrink-0">{letter(oi)}</span>
                                <span className="truncate">{o}</span>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                              </span>
                              <span className="tabular-nums text-muted-foreground shrink-0">{c} · {p}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isCorrect ? "bg-emerald-500" : isTop ? "bg-primary" : "bg-primary/40"}`}
                                style={{ width: `${p}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Testda: o'quvchilar ro'yxati */}
            {!isSurvey && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">O'quvchilar natijasi</p>
                <div className="rounded-2xl border divide-y overflow-hidden">
                  {(results.data ?? []).map((r, i) => (
                    <div key={r.student_login} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{r.student_name}</span>
                      <span className="text-xs text-muted-foreground">{r.class_name}</span>
                      <span className={`text-xs font-bold rounded-lg px-2 py-1 tabular-nums ${scoreTone(r.percentage)}`}>{r.score}/{r.total} · {r.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
