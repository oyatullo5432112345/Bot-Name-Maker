import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Copy, CheckCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

interface CreatedStudent {
  full_name: string;
  login: string;
  password: string;
  class_name: string;
}

interface BulkResult {
  created: CreatedStudent[];
  errors: { full_name: string; error: string }[];
}

export default function BulkNewStudents() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [namesText, setNamesText] = useState("");
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      toast({ variant: "destructive", title: "Xatolik", description: "Kamida bitta o'quvchi ismi kiriting" });
      return;
    }
    if (!className.trim()) {
      toast({ variant: "destructive", title: "Xatolik", description: "Sinf nomini kiriting" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          students: names.map((full_name) => ({ full_name, class_name: className.trim() })),
        }),
      });
      const data = (await res.json()) as BulkResult;
      setResult(data);
      if (data.created.length > 0) {
        toast({
          title: "Muvaffaqiyatli",
          description: `${data.created.length} ta o'quvchi qo'shildi`,
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda xatolik" });
    }
    setLoading(false);
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = result.created
      .map((s) => `${s.full_name} | Login: ${s.login} | Mahfiy kod: ${s.password} | Sinf: ${s.class_name}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/students")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ommaviy o'quvchi qo'shish</h1>
          <p className="text-muted-foreground mt-1">Bir sinf uchun bir nechta o'quvchini birdaniga qo'shish</p>
        </div>
      </div>

      {!result ? (
        <div className="border rounded-md bg-card p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="class_name">Sinf nomi</Label>
            <Input
              id="class_name"
              placeholder="masalan: 10-A"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="names">O'quvchilar ismlari</Label>
            <p className="text-xs text-muted-foreground">
              Har bir qatorda bitta F.I.O kiriting
            </p>
            <Textarea
              id="names"
              placeholder={"Aliyev Abror Abrorovich\nValiyev Vali Valiyevich\nToshmatov Jasur Toshmatovich"}
              rows={10}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              className="font-mono text-sm"
            />
            {namesText.trim() && (
              <p className="text-xs text-muted-foreground">
                <Users className="inline w-3 h-3 mr-1" />
                {namesText.split("\n").filter((n) => n.trim()).length} ta o'quvchi
              </p>
            )}
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            💡 Har bir o'quvchiga avtomatik ravishda <strong>5 xonali mahfiy kod</strong> va <strong>login</strong> beriladi.
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setLocation("/students")} disabled={loading}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Qo'shish
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="default">{result.created.length} ta qo'shildi</Badge>
              {result.errors.length > 0 && (
                <Badge variant="destructive">{result.errors.length} ta xatolik</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyAll}>
                {copied ? <CheckCheck className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Nusxalandi!" : "Hammasini nusxalash"}
              </Button>
              <Button size="sm" onClick={() => setLocation("/students")}>
                O'quvchilar ro'yxatiga
              </Button>
            </div>
          </div>

          {result.created.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>F.I.O</TableHead>
                    <TableHead>Sinf</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Mahfiy kod (5 xonali)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.created.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.class_name}</TableCell>
                      <TableCell className="font-mono">{s.login}</TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary text-lg tracking-widest">
                          {s.password}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            void navigator.clipboard.writeText(
                              `${s.full_name} | Login: ${s.login} | Mahfiy kod: ${s.password}`
                            );
                            toast({ title: "Nusxalandi", description: s.full_name });
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="border border-destructive/40 rounded-md overflow-hidden">
              <div className="bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
                Qo'shilmagan o'quvchilar
              </div>
              {result.errors.map((e, i) => (
                <div key={i} className="px-4 py-2 text-sm border-t border-destructive/20">
                  <span className="font-medium">{e.full_name}</span>
                  <span className="text-muted-foreground ml-2">— {e.error}</span>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={() => { setResult(null); setNamesText(""); }}>
            ← Yana qo'shish
          </Button>
        </div>
      )}
    </div>
  );
}
