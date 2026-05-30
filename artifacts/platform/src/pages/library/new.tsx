import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya",
];

const CLASS_NAMES = [
  "1-A", "1-B", "2-A", "2-B", "3-A", "3-B", "4-A", "4-B",
  "5-A", "5-B", "6-A", "6-B", "7-A", "7-B", "8-A", "8-B",
  "9-A", "9-B", "10-A", "10-B", "11-A", "11-B",
];

export default function NewBookPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<"darslik" | "badiiy" | "ilmiy" | "boshqa">("boshqa");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isbn, setIsbn] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Xatolik", description: "Kitob nomini kiriting" });
      return;
    }
    if (Number(quantity) < 1) {
      toast({ variant: "destructive", title: "Xatolik", description: "Nusxalar soni kamida 1 bo'lishi kerak" });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        author: author.trim(),
        category,
        quantity: Number(quantity),
        description: description.trim(),
        isbn: isbn.trim(),
      };
      if (category === "darslik") {
        body.subject = subject;
        body.class_name = className;
      }
      if (publishedYear) {
        body.published_year = Number(publishedYear);
      }

      const res = await fetch(`${API_BASE}/library/books`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: "Kitob qo'shildi", description: `"${title}" kutubxonaga qo'shildi` });
        setLocation("/library");
      } else {
        const d = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: d.error ?? "Xatolik yuz berdi" });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/library")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="w-6 h-6 text-primary" />
            Yangi kitob qo'shish
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kutubxonaga yangi kitob yoki darslik qo'shish</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kitob nomi *</Label>
            <Input
              placeholder="Masalan: Algebra va matematik analiz"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Muallif</Label>
            <Input
              placeholder="Masalan: Alisher Navoiy"
              value={author}
              onChange={e => setAuthor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Kategoriya *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="darslik">📚 Darslik</SelectItem>
                  <SelectItem value="badiiy">📖 Badiiy adabiyot</SelectItem>
                  <SelectItem value="ilmiy">🔬 Ilmiy</SelectItem>
                  <SelectItem value="boshqa">📄 Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nusxalar soni *</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {category === "darslik" && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="space-y-1.5">
                <Label className="text-blue-800">Fan (ixtiyoriy)</Label>
                <Select value={subject || "__none__"} onValueChange={(v) => setSubject(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="border-blue-300 focus:ring-blue-400">
                    <SelectValue placeholder="Fan tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Belgilanmagan —</SelectItem>
                    {COMMON_SUBJECTS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-blue-800">Sinf (ixtiyoriy)</Label>
                <Select value={className || "__all__"} onValueChange={(v) => setClassName(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="border-blue-300 focus:ring-blue-400">
                    <SelectValue placeholder="Sinf..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">— Barcha sinflar —</SelectItem>
                    {CLASS_NAMES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ISBN (ixtiyoriy)</Label>
              <Input
                placeholder="978-9943-00-000-0"
                value={isbn}
                onChange={e => setIsbn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nashr yili (ixtiyoriy)</Label>
              <Input
                type="number"
                placeholder="2023"
                min="1900"
                max="2030"
                value={publishedYear}
                onChange={e => setPublishedYear(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tavsif (ixtiyoriy)</Label>
            <Textarea
              placeholder="Kitob haqida qisqacha ma'lumot..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setLocation("/library")}>
          Bekor qilish
        </Button>
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Saqlash
        </Button>
      </div>
    </div>
  );
}
