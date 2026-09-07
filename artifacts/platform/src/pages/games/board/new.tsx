import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  ArrowLeft, Users, Grid3x3, Upload, Loader2, Gift, Skull, Zap,
  HelpCircle, TrendingDown, Sparkles, Copy, Check, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const getToken = () => 
  localStorage.getItem("talim_auth_token") || 
  localStorage.getItem("token") || 
  localStorage.getItem("auth_token") || 
  "";

const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

type CellType = "question" | "bonus" | "penalty" | "lose" | "steal";

interface DraftCell {
  type: CellType;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: "oson" | "orta" | "qiyin";
  points: number;
  steal_percent: number;
}

const TYPE_META: Record<CellType, { label: string; icon: typeof HelpCircle; color: string }> = {
  question: { label: "Savol", icon: HelpCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
  bonus: { label: "Bonus/Sovg'a", icon: Gift, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  penalty: { label: "Jarima", icon: TrendingDown, color: "text-amber-600 bg-amber-50 border-amber-200" },
  lose: { label: "Yutqazdingiz", icon: Skull, color: "text-red-600 bg-red-50 border-red-200" },
  steal: { label: "O'g'irlash", icon: Zap, color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const DEFAULT_POINTS = { oson: 10, orta: 20, qiyin: 30 };

const emptyCell = (): DraftCell => ({
  type: "question", question: "", options: ["", "", "", ""], correct_index: 0,
  difficulty: "orta", points: 20, steal_percent: 25,
});

function cellOptions(teamCount: 2 | 3) {
  return teamCount === 2 ? [8, 16] : [9, 18, 30];
}

export default function BoardGameNewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: classesData } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const classNames = ((classesData as { name: string }[] | undefined) ?? []).map(c => c.name).sort();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("__all__");
  const [teamCount, setTeamCount] = useState<2 | 3>(2);
  const [cellCount, setCellCount] = useState(8);
  const [cells, setCells] = useState<DraftCell[]>([]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI Import Modali
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [copied, setCopied] = useState(false);

  const startBuilding = () => {
    setCells(Array.from({ length: cellCount }, () => emptyCell()));
    setStep(2);
  };

  const updateCell = (idx: number, patch: Partial<DraftCell>) => {
    setCells(cs => cs.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const updateOption = (idx: number, oi: number, val: string) => {
    setCells(cs => cs.map((c, i) => {
      if (i !== idx) return c;
      const options = [...c.options]; options[oi] = val;
      return { ...c, options };
    }));
  };

  // AI Promptini hosil qilish
  const generatedPrompt = `Menga ${subject || "Umumiy"} fani bo'yicha ${cellCount} ta savol tuzib ber. Format aynan quyidagicha bo'lsin:

1. Savol matni?
a) Variant A
b) Variant B
c) Variant C
d) Variant D
Javob: B

2. Keyingi savol?
a) Variant 1
b) Variant 2
c) Variant 3
d) Variant 4
Javob: A`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast({ title: "Prompt nusxalandi!", description: "ChatGPT yoki Gemini-ga tashlab, javobini oling." });
    setTimeout(() => setCopied(false), 2000);
  };

  // Matndan avto-to'ldirish — endi savol bloklaridan tashqari
  // BONUS / JARIMA / YUTQAZISH / OG'IRLASH kalit so'zlari bilan
  // maxsus katakcha turlarini ham ketma-ket joylash mumkin.
  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const blocks = rawText.trim().split(/\n\s*\n|\n(?=\d+[\.\)])/g).filter(b => b.trim().length > 0);

    setCells(prevCells => {
      const nextCells = [...prevCells];
      let ci = 0;

      for (const block of blocks) {
        if (ci >= nextCells.length) break;

        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        const firstLine = lines[0];

        const bonusMatch = firstLine.match(/^bonus\s*:?\s*(\d+)?/i);
        const jarimaMatch = firstLine.match(/^jarima\s*:?\s*(\d+)?/i);
        const ogirlashMatch = firstLine.match(/^o'?g'?irlash\s*:?\s*(\d+)?/i);
        const yutqazishMatch = firstLine.match(/^(?:yutqazish|mag'?lubiyat)\b/i);

        if (bonusMatch) {
          nextCells[ci] = { ...emptyCell(), type: "bonus", points: bonusMatch[1] ? Number(bonusMatch[1]) : 20 };
          ci++; continue;
        }
        if (jarimaMatch) {
          nextCells[ci] = { ...emptyCell(), type: "penalty", points: jarimaMatch[1] ? Number(jarimaMatch[1]) : 15 };
          ci++; continue;
        }
        if (ogirlashMatch) {
          nextCells[ci] = { ...emptyCell(), type: "steal", steal_percent: ogirlashMatch[1] ? Number(ogirlashMatch[1]) : 25 };
          ci++; continue;
        }
        if (yutqazishMatch) {
          nextCells[ci] = { ...emptyCell(), type: "lose" };
          ci++; continue;
        }

        // Aks holda — bu oddiy savol bloki
        let questionText = firstLine.replace(/^\d+[\.\)]\s*/, "").trim();
        const options: string[] = [];
        let correctIndex = 0;

        lines.slice(1).forEach(line => {
          const ansMatch = line.match(/^(?:javob|javobi|ans|correct):\s*([a-d1-4])\b/i);
          if (ansMatch) {
            const val = ansMatch[1].toLowerCase();
            if (val === 'a' || val === '1') correctIndex = 0;
            else if (val === 'b' || val === '2') correctIndex = 1;
            else if (val === 'c' || val === '3') correctIndex = 2;
            else if (val === 'd' || val === '4') correctIndex = 3;
            return;
          }

          const optMatch = line.match(/^([a-d1-4])[\.\)]\s*(.*)/i);
          if (optMatch) {
            options.push(optMatch[2].trim());
          } else if (!line.toLowerCase().startsWith("javob")) {
            questionText += " " + line;
          }
        });

        while (options.length < 4) options.push("");

        nextCells[ci] = {
          ...emptyCell(),
          type: "question",
          question: questionText,
          options: options.slice(0, 4),
          correct_index: Math.min(correctIndex, 3),
        };
        ci++;
      }
      return nextCells;
    });

    setAiModalOpen(false);
    setRawText("");
    toast({ title: "Katakchalar to'ldirildi!", description: "Turlari, savollari va ballarini tekshirib chiqing." });
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Xato"));
        reader.readAsDataURL(file);
      });
      const questionCellCount = cells.filter(c => c.type === "question").length || cellCount;
      const r = await fetch(`${API_BASE}/board-games/import`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ file_base64: base64, media_type: file.type, count: questionCellCount }),
      });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      const imported = json.questions as { question: string; options: string[]; correct_index: number; difficulty: "oson"|"orta"|"qiyin" }[];
      let qi = 0;
      setCells(cs => cs.map(c => {
        if (c.type !== "question" || qi >= imported.length) return c;
        const q = imported[qi++]!;
        return { ...c, question: q.question, options: q.options, correct_index: q.correct_index, difficulty: q.difficulty, points: DEFAULT_POINTS[q.difficulty] };
      }));
      toast({ title: "Import qilindi", description: `${Math.min(qi, imported.length)} ta savol to'ldirildi` });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ variant: "destructive", title: "Sarlavhani kiriting" }); return; }
    const invalidQuestion = cells.find(c => c.type === "question" && (!c.question.trim() || c.options.some(o => !o.trim())));
    if (invalidQuestion) { toast({ variant: "destructive", title: "To'ldirilmagan savol bor", description: "Har bir savol katakchasida matn va barcha variantlar to'ldirilishi kerak" }); return; }

    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/board-games`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          title: title.trim(), subject: subject.trim() || undefined,
          class_name: className === "__all__" ? null : className,
          team_count: teamCount, cell_count: cellCount,
          cells: cells.map((c, i) => ({
            position: i, type: c.type,
            ...(c.type === "question" ? { question: c.question, options: c.options, correct_index: c.correct_index, difficulty: c.difficulty, points: DEFAULT_POINTS[c.difficulty] } : {}),
            ...(c.type === "bonus" || c.type === "penalty" ? { points: c.points } : {}),
            ...(c.type === "steal" ? { steal_percent: c.steal_percent } : {}),
          })),
        }),
      });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      toast({ title: "O'yin yaratildi!" });
      setLocation(`/games/board/${json.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Link href="/games/board" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏆 Yangi Bamboozle (Zukko)</h1>
          <p className="text-muted-foreground text-sm mt-1">Avval jamoalar sonini va katakchalar sonini tanlang</p>
        </div>

        <div className="space-y-1.5">
          <Label>O'yin nomi</Label>
          <Input placeholder="Masalan: Matematika — 5-sinf" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Fan</Label>
            <Input placeholder="Matematika" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sinf</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Belgilanmagan</SelectItem>
                {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Nechta jamoa?</Label>
          <div className="grid grid-cols-2 gap-2">
            {([2, 3] as const).map(n => (
              <button
                key={n}
                onClick={() => { setTeamCount(n); setCellCount(cellOptions(n)[0]!); }}
                className={`rounded-xl border-2 py-3 font-semibold transition-all ${teamCount === n ? "border-primary bg-primary/5" : "border-border"}`}
              >
                {n} ta jamoa
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Grid3x3 className="w-4 h-4" /> Nechta katakcha?</Label>
          <div className="grid grid-cols-3 gap-2">
            {cellOptions(teamCount).map(n => (
              <button
                key={n}
                onClick={() => setCellCount(n)}
                className={`rounded-xl border-2 py-3 font-semibold transition-all ${cellCount === n ? "border-primary bg-primary/5" : "border-border"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full font-bold" size="lg" onClick={startBuilding} disabled={!title.trim()}>
          Davom etish →
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Sozlamalarga qaytish
      </button>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{teamCount} jamoa • {cellCount} katakcha</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAiModalOpen(true)} className="gap-1.5 text-primary border-primary/30">
            <Sparkles className="w-3.5 h-3.5" /> Matndan avto to'ldirish
          </Button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => void handleImportFile(e.target.files?.[0] ?? null)} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-1.5">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Fayldan o'qish
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex items-start gap-1.5">
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
        Katakcha turini (Savol, Bonus, Jarima, O'g'irlash) tugmalar orqali qo'lda tanlashingiz, yoki "Matndan avto to'ldirish" orqali savol va maxsus katakchalarni bir vaqtda matn ko'rinishida joylashingiz mumkin.
      </p>

      <div className="space-y-3">
        {cells.map((c, i) => {
          const meta = TYPE_META[c.type];
          return (
            <div key={i} className="rounded-xl border p-3 space-y-2.5 bg-card shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-lg bg-muted text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {(Object.keys(TYPE_META) as CellType[]).map(t => {
                  const m = TYPE_META[t];
                  const TIcon = m.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => updateCell(i, { type: t })}
                      className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 font-medium transition-colors ${c.type === t ? m.color : "border-border text-muted-foreground hover:bg-muted/50"}`}
                    >
                      <TIcon className="w-3 h-3" /> {m.label}
                    </button>
                  );
                })}
              </div>

              {c.type === "question" && (
                <div className="pl-9 space-y-2">
                  <Input placeholder="Savol matni" value={c.question} onChange={e => updateCell(i, { question: e.target.value })} className="h-9 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    {c.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input type="radio" name={`correct-${i}`} checked={c.correct_index === oi} onChange={() => updateCell(i, { correct_index: oi })} className="accent-primary shrink-0" />
                        <Input placeholder={`Variant ${oi + 1}`} value={opt} onChange={e => updateOption(i, oi, e.target.value)} className="h-8 text-xs" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(["oson", "orta", "qiyin"] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => updateCell(i, { difficulty: d, points: DEFAULT_POINTS[d] })}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${c.difficulty === d ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {d === "oson" ? "Oson" : d === "orta" ? "O'rta" : "Qiyin"} • {DEFAULT_POINTS[d]} HP
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(c.type === "bonus" || c.type === "penalty") && (
                <div className="pl-9 flex items-center gap-2">
                  <Label className="text-xs">HP (Ochko) miqdori:</Label>
                  <Input type="number" min={5} max={100} step={5} value={c.points} onChange={e => updateCell(i, { points: Number(e.target.value) })} className="h-8 w-24 text-xs font-bold" />
                </div>
              )}

              {c.type === "steal" && (
                <div className="pl-9 flex items-center gap-2">
                  <Label className="text-xs">O'g'irlanadigan foiz:</Label>
                  <Input type="number" min={10} max={100} step={5} value={c.steal_percent} onChange={e => updateCell(i, { steal_percent: Number(e.target.value) })} className="h-8 w-24 text-xs font-bold" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}

              {c.type === "lose" && (
                <p className="pl-9 text-xs text-muted-foreground font-medium">Bu katakchani ochgan jamoaning barcha jamg'argan ballari nolga tushadi 💀</p>
              )}
            </div>
          );
        })}
      </div>

      <Button className="w-full font-bold" size="lg" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        O'yinni saqlash va boshlash
      </Button>

      {/* AI Matn orqali to'ldirish modali */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" /> Matndan avto to'ldirish
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="bg-muted p-3 rounded-xl space-y-2 border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">1-qadam: Tayyor promptni nusxalang</span>
                <Button variant="secondary" size="sm" onClick={copyPrompt} className="h-7 text-xs gap-1">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Nusxalandi" : "Promptni nusxalash"}
                </Button>
              </div>
              <p className="text-muted-foreground">ChatGPT yoki Gemini-ga kiring va ushbu promptni yuboring.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-xs">2-qadam: AI qaytargan matnni (yoki o'zingiz yozgan matnni) bu yerga tashlang</Label>
              <Textarea
                rows={10}
                placeholder={"1. O'zbekiston poytaxti qaysi?\na) Samarqand\nb) Toshkent\nc) Buxoro\nd) Xiva\nJavob: B\n\nBONUS: 20\n\nJARIMA: 15\n\nYUTQAZISH\n\nOG'IRLASH: 30"}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                Savollarni yuqoridagi 1-4 formatida yozing. Boshqa turdagi katakchalarni ham shu yerdan qo'shishingiz mumkin — alohida qatorga:
                <span className="font-mono"> BONUS: 20</span> (bonus ball), <span className="font-mono">JARIMA: 15</span> (ball ayirish),
                <span className="font-mono"> YUTQAZISH</span> (mag'lubiyat — ballar nolga tushadi), <span className="font-mono">OG'IRLASH: 30</span> (raqibdan foiz o'g'irlash).
                Har bir blok navbat bilan keyingi katakchaga joylanadi.
              </p>
            </div>

            <Button onClick={handleParseRawText} disabled={!rawText.trim()} className="w-full font-bold gap-2">
              <FileText className="w-4 h-4" /> Katakchalarga joylash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
          }
