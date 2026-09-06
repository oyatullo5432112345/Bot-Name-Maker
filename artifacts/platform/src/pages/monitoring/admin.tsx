import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export interface QuestionItem {
  id?: string;
  questionText: string;
  options: string[];
  correctAnswer: string; // "A", "B", "C", "D"
}

interface AdminTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTest?: any;
  onSuccess: () => void;
  API_BASE: string;
  authHeaders: () => Record<string, string>;
}

export const AdminTestModal: React.FC<AdminTestModalProps> = ({
  isOpen,
  onClose,
  editingTest,
  onSuccess,
  API_BASE,
  authHeaders,
}) => {
  const [title, setTitle] = useState("");
  const [importMode, setImportMode] = useState(false);
  const [rawText, setRawText] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTest) {
      setTitle(editingTest.title || "");
      setQuestions(editingTest.questions || []);
    } else {
      setTitle("");
      setQuestions([]);
    }
    setImportMode(false);
    setRawText("");
  }, [editingTest, isOpen]);

  // MATNDAN SAVOLLARNI PARSE QILISH FUNKSIYASI
  const parseTextToQuestions = (text: string): QuestionItem[] => {
    const blocks = text.split(/(?=\d+[\.\)])/g).filter((b) => b.trim().length > 0);
    const parsed: QuestionItem[] = [];

    blocks.forEach((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return;

      let questionText = "";
      const options: string[] = [];
      let correctAnswer = "A";

      lines.forEach((line) => {
        if (/^\d+[\.\)]/.test(line)) {
          questionText = line.replace(/^\d+[\.\)]\s*/, "").trim();
        } else if (/^[a-d|A-D][\.\)]/.test(line)) {
          options.push(line.replace(/^[a-d|A-D][\.\)]\s*/, "").trim());
        } else if (/^Javob:\s*/i.test(line)) {
          correctAnswer = line.replace(/^Javob:\s*/i, "").trim().toUpperCase();
        }
      });

      if (questionText && options.length > 0) {
        parsed.push({
          questionText,
          options,
          correctAnswer,
        });
      }
    });

    return parsed;
  };

  const handleImport = () => {
    const parsed = parseTextToQuestions(rawText);
    if (parsed.length === 0) {
      toast.error("Savollar tanib olinmadi. Formatni tekshiring!");
      return;
    }
    setQuestions((prev) => [...prev, ...parsed]);
    setImportMode(false);
    setRawText("");
    toast.success(`${parsed.length} ta savol muvaffaqiyatli qo'shildi!`);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Test nomini kiriting!");
      return;
    }
    if (questions.length === 0) {
      toast.error("Kamida 1 ta savol qo'shilishi kerak!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        questions, // Savollar obyektlari massiv ko'rinishida yuboriladi
      };

      const url = editingTest
        ? `${API_BASE}/monitoring/tests/${editingTest.id}`
        : `${API_BASE}/monitoring/tests`;

      const res = await fetch(url, {
        method: editingTest ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Saqlashda xatolik yuz berdi");

      toast.success("Test muvaffaqiyatli saqlandi!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{editingTest ? "Testni tahrirlash" : "Yangi test"}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportMode(!importMode)}
            className="gap-1.5 text-xs"
          >
            <FileText className="w-4 h-4" />
            {importMode ? "Formaga qaytish" : "Matndan yuklash"}
          </Button>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Test nomi</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: 9-sinf Fizika monitoring"
            />
          </div>

          {importMode ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Test matnini tashlang</label>
              <Textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`1. O'zbekiston poytaxti?\na) Toshkent\nb) Samarqand\nJavob: A`}
              />
              <Button onClick={handleImport} className="w-full">
                Savollarga ajratish va yuklash
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Savollar ro'yxati ({questions.length})</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setQuestions([
                      ...questions,
                      { questionText: "", options: ["", "", "", ""], correctAnswer: "A" },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-1" /> Savol qo'shish
                </Button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={qIndex} className="p-3 border rounded-lg space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs">#{qIndex + 1}</span>
                    <Input
                      value={q.questionText}
                      onChange={(e) => {
                        const newQ = [...questions];
                        newQ[qIndex].questionText = e.target.value;
                        setQuestions(newQ);
                      }}
                      placeholder="Savol matni..."
                      className="bg-white"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {q.options.map((opt, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isCorrect = q.correctAnswer === letter;
                      return (
                        <div key={optIndex} className="flex items-center gap-1">
                          <Button
                            size="sm"
                            type="button"
                            variant={isCorrect ? "default" : "outline"}
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const newQ = [...questions];
                              newQ[qIndex].correctAnswer = letter;
                              setQuestions(newQ);
                            }}
                          >
                            {letter}
                          </Button>
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newQ = [...questions];
                              newQ[qIndex].options[optIndex] = e.target.value;
                              setQuestions(newQ);
                            }}
                            placeholder={`Variant ${letter}`}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
