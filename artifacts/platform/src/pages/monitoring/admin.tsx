import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, FileText, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface QuestionItem {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
}

interface TestData {
  id: string;
  title: string;
  subject: string;
  quarter: number;
  duration_minutes: number;
  has_options: boolean;
  is_anonymous: boolean;
  timed: boolean;
  pause_seconds: number;
  is_open: boolean;
  questions: QuestionItem[];
}

export default function MonitoringAdminPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [quarter, setQuarter] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [hasOptions, setHasOptions] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [timed, setTimed] = useState(true);
  const [pauseSeconds, setPauseSeconds] = useState(0);

  // Raw text import & Manual questions
  const [rawText, setRawText] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([
    { question: "", options: ["", "", "", ""], correct_index: 0 },
  ]);

  const { data: tests = [], isLoading } = useQuery<TestData[]>({
    queryKey: ["admin-monitoring-tests"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  // Matnni avtomatik savollarga ajratish (Smart Parser)
  const handleParseText = () => {
    if (!rawText.trim()) return;

    const blocks = rawText.split(/\n\s*\n/);
    const parsed: QuestionItem[] = [];

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      let qText = lines[0].replace(/^\d+[\.\)]\s*/, "");
      let opts: string[] = [];
      let cIdx = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(javob|ans|correct):/i.test(line)) {
          const ansChar = line.split(":")[1]?.trim().toUpperCase();
          if (ansChar) {
            const code = ansChar.charCodeAt(0) - 65; // A -> 0, B -> 1
            if (code >= 0 && code < 4) cIdx = code;
          }
        } else if (/^[a-d][\.\)]/i.test(line)) {
          opts.push(line.replace(/^[a-d][\.\)]\s*/i, ""));
        }
      }

      if (opts.length === 0) opts = ["", "", "", ""];
      parsed.push({ question: qText, options: opts, correct_index: cIdx });
    }

    if (parsed.length > 0) {
      setQuestions(parsed);
      toast({ title: "Muvaffaqiyatli!", description: `${parsed.length} ta savol ajratib olindi.` });
    } else {
      toast({ title: "Xatolik", description: "Matn formatini aniqlab bo'lmadi.", variant: "destructive" });
    }
  };

  const openCreateDialog = () => {
    setEditingTestId(null);
    setTitle("");
    setSubject("");
    setQuarter(1);
    setDurationMinutes(30);
    setHasOptions(true);
    setIsAnonymous(false);
    setTimed(true);
    setPauseSeconds(0);
    setRawText("");
    setQuestions([{ question: "", options: ["", "", "", ""], correct_index: 0 }]);
    setDialogOpen(true);
  };

  const openEditDialog = (t: TestData) => {
    setEditingTestId(t.id);
    setTitle(t.title);
    setSubject(t.subject);
    setQuarter(t.quarter);
    setDurationMinutes(t.duration_minutes);
    setHasOptions(t.has_options);
    setIsAnonymous(t.is_anonymous);
    setTimed(t.timed);
    setPauseSeconds(t.pause_seconds || 0);
    setQuestions(t.questions && t.questions.length > 0 ? t.questions : [{ question: "", options: ["", "", "", ""], correct_index: 0 }]);
    setDialogOpen(true);
  };

  const handleSaveTest = async () => {
    if (!title || !subject) {
      toast({ title: "Xatolik", description: "Mavzu va Fan nomini kiriting.", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      subject,
      quarter: Number(quarter),
      duration_minutes: Number(durationMinutes),
      has_options: hasOptions,
      is_anonymous: isAnonymous,
      timed,
      pause_seconds: Number(pauseSeconds),
      questions,
    };

    const url = editingTestId ? `${API_BASE}/monitoring/tests/${editingTestId}` : `${API_BASE}/monitoring/tests`;
    const method = editingTestId ? "PUT" : "POST";

    try {
      const r = await fetch(url, {
        method,
        headers: authH(),
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("Saqlashda xatolik");

      toast({ title: "Muvaffaqiyatli!", description: editingTestId ? "Test tahrirlandi" : "Yangi test yaratildi" });
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-monitoring-tests"] });
    } catch {
      toast({ title: "Xatolik", description: "Serverga saqlashda muammo yuz berdi", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Haqiqatdan ham bu testni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`${API_BASE}/monitoring/tests/${id}`, { method: "DELETE", headers: authH() });
      toast({ title: "O'chirildi" });
      qc.invalidateQueries({ queryKey: ["admin-monitoring-tests"] });
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda muammo", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Testlar Boshqaruvi</h1>
          <p className="text-sm text-muted-foreground">Testlar yaratish, tahrirlash va matndan avto-yuklash</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" /> Yangi Test
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Card key={t.id} className="relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.title} • {t.quarter}-chorak</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Savollar soni: <b>{t.questions?.length || 0} ta</b></p>
                  <p>Vaqt: <b>{t.duration_minutes} daqiqa</b></p>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditDialog(t)}>
                    <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Test Yaratish / Tahrirlash Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTestId ? "Testni Tahrirlash" : "Yangi Test Yaratish"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fan Nomi</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matematika" />
              </div>
              <div>
                <Label>Mavzu / Sarlovha</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="1-ch chorak nazorati" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Chorak</Label>
                <Input type="number" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} />
              </div>
              <div>
                <Label>Davomiyligi (Daqiqa)</Label>
                <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </div>
              <div>
                <Label>Pauza (Sekund)</Label>
                <Input type="number" value={pauseSeconds} onChange={(e) => setPauseSeconds(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={hasOptions} onCheckedChange={setHasOptions} id="opts" />
                <Label htmlFor="opts">Variantli Test</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={timed} onCheckedChange={setTimed} id="time" />
                <Label htmlFor="time">Vaqt Cheklovi</Label>
              </div>
            </div>

            {/* Smart Text Importer */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
              <Label className="flex items-center gap-1.5 font-bold text-primary">
                <Sparkles className="w-4 h-4" /> Matndan Avtomatik Yuklash (Smart Importer)
              </Label>
              <Textarea
                rows={4}
                placeholder={`1. O'zbekiston poytaxti qaysi?\na) Samarqand\nb) Toshkent\nc) Buxoro\nd) Xiva\nJavob: B`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleParseText} className="gap-1.5">
                <FileText className="w-4 h-4" /> Matnni Savollarga Ajratish
              </Button>
            </div>

            {/* Savollar Ro'yxati */}
            <div className="space-y-4 pt-2">
              <Label className="font-bold text-base">Savollar Ro'yxati ({questions.length} ta)</Label>
              {questions.map((q, qIdx) => (
                <Card key={qIdx} className="p-3 space-y-2 relative">
                  <Input
                    placeholder={`${qIdx + 1}-savol matni...`}
                    value={q.question}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[qIdx].question = e.target.value;
                      setQuestions(copy);
                    }}
                  />
                  {hasOptions && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`q_${qIdx}`}
                            checked={q.correct_index === oIdx}
                            onChange={() => {
                              const copy = [...questions];
                              copy[qIdx].correct_index = oIdx;
                              setQuestions(copy);
                            }}
                          />
                          <Input
                            placeholder={`Variant ${String.fromCharCode(65 + oIdx)}`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...questions];
                              copy[qIdx].options[oIdx] = e.target.value;
                              setQuestions(copy);
                            }}
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuestions([...questions, { question: "", options: ["", "", "", ""], correct_index: 0 }])}
                className="w-full gap-1"
              >
                <Plus className="w-4 h-4" /> Qo'lda Savol Qo'shish
              </Button>
            </div>

            <Button onClick={handleSaveTest} className="w-full mt-4 font-bold">
              {editingTestId ? "O'zgarishlarni Saqlash" : "Testni E'lon Qilish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
