import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  ArrowLeft, Users, Grid3x3, Upload, Loader2, Gift, Skull, Zap,
  HelpCircle, TrendingDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
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
  bonus: { label: "Bonus", icon: Gift, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
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

  const handleImport = async (file: File | null) => {
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
          <h1 className="text-2xl font-bold tracking-tight">🏆 Yangi Bamboozle</h1>
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

        <Button className="w-full" size="lg" onClick={startBuilding} disabled={!title.trim()}>
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
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => void handleImport(e.target.files?.[0] ?? null)} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-1.5">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Ish rejadan avto to'ldirish
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex items-start gap-1.5">
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Har bir katakcha turini pastdagi tugmalar bilan belgilang. "Savol" turidagilarni qo'lda yozing yoki "Ish rejadan avto to'ldirish" orqali bir zumda to'ldiring.
      </p>

      <div className="space-y-3">
        {cells.map((c, i) => {
          const meta = TYPE_META[c.type];
          const Icon = meta.icon;
          return (
            <div key={i} className="rounded-xl border p-3 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-lg bg-muted text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {(Object.keys(TYPE_META) as CellType[]).map(t => {
                  const m = TYPE_META[t];
                  const TIcon = m.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => updateCell(i, { type: t })}
                      className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 font-medium transition-colors ${c.type === t ? m.color : "border-border text-muted-foreground"}`}
                    >
                      <TIcon className="w-3 h-3" /> {m.label}
                    </button>
                  );
                })}
              </div>

              {c.type === "question" && (
                <div className="pl-9 space-y-2">
                  <Input placeholder="Savol matni" value={c.question} onChange={e => updateCell(i, { question: e.target.value })} className="h-8 text-sm" />
                  <div className="grid grid-cols-2 gap-1.5">
                    {c.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input type="radio" checked={c.correct_index === oi} onChange={() => updateCell(i, { correct_index: oi })} className="accent-primary shrink-0" />
                        <Input placeholder={`Variant ${oi + 1}`} value={opt} onChange={e => updateOption(i, oi, e.target.value)} className="h-7 text-xs" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(["oson", "orta", "qiyin"] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => updateCell(i, { difficulty: d, points: DEFAULT_POINTS[d] })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.difficulty === d ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {d === "oson" ? "Oson" : d === "orta" ? "O'rta" : "Qiyin"} • {DEFAULT_POINTS[d]} HP
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(c.type === "bonus" || c.type === "penalty") && (
                <div className="pl-9 flex items-center gap-2">
                  <Label className="text-xs">HP miqdori:</Label>
                  <Input type="number" min={1} max={100} value={c.points} onChange={e => updateCell(i, { points: Number(e.target.value) })} className="h-7 w-20 text-xs" />
                </div>
              )}

              {c.type === "steal" && (
                <div className="pl-9 flex items-center gap-2">
                  <Label className="text-xs">O'g'irlanadigan foiz:</Label>
                  <Input type="number" min={1} max={100} value={c.steal_percent} onChange={e => updateCell(i, { steal_percent: Number(e.target.value) })} className="h-7 w-20 text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}

              {c.type === "lose" && (
                <p className="pl-9 text-xs text-muted-foreground">Bu katakchani ochgan jamoaning ballari nolga tushadi 💀</p>
              )}
            </div>
          );
        })}
      </div>

      <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        O'yinni yaratish va arxivga saqlash
      </Button>
    </div>
  );
}
