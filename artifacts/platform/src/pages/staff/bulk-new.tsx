import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Copy, CheckCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

const roleLabels: Record<string, string> = {
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  sinf_rahbari: "Sinf rahbari",
  teacher: "Fan o'qituvchisi",
  kutubxonachi: "Kutubxonachi",
};

const teachingRoles = ["director", "zam_direktor", "zavuch", "sinf_rahbari", "teacher"];

interface CreatedStaff {
  full_name: string;
  login: string;
  password: string;
  role: string;
}

interface BulkResult {
  created: CreatedStaff[];
  errors: { full_name: string; error: string }[];
}

export default function BulkNewStaff() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [namesText, setNamesText] = useState("");
  const [role, setRole] = useState("");
  const [canTeach, setCanTeach] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isTeacherRole = role === "teacher" || role === "sinf_rahbari";
  const isManagerRole = role === "director" || role === "zam_direktor" || role === "zavuch";
  const showSubjects = isTeacherRole || (isManagerRole && canTeach);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleSubmit = async () => {
    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      toast({ variant: "destructive", title: "Xatolik", description: "Kamida bitta xodim ismi kiriting" });
      return;
    }
    if (!role) {
      toast({ variant: "destructive", title: "Xatolik", description: "Lavozimni tanlang" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/staff/bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          staff: names.map((full_name) => ({
            full_name,
            role,
            subjects: showSubjects ? selectedSubjects : [],
            can_teach: isTeacherRole ? true : (isManagerRole ? canTeach : false),
          })),
        }),
      });
      const data = (await res.json()) as BulkResult;
      setResult(data);
      if (data.created.length > 0) {
        toast({ title: "Muvaffaqiyatli", description: `${data.created.length} ta xodim qo'shildi` });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda xatolik" });
    }
    setLoading(false);
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = result.created
      .map((s) => `${s.full_name} | Login: ${s.login} | Mahfiy kod: ${s.password} | Lavozim: ${roleLabels[s.role] ?? s.role}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/staff")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ommaviy xodim qo'shish</h1>
          <p className="text-muted-foreground mt-1">Bir lavozim uchun bir nechta xodimni birdaniga qo'shish</p>
        </div>
      </div>

      {!result ? (
        <div className="border rounded-md bg-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>Lavozimi</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setCanTeach(false);
                setSelectedSubjects([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lavozimni tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isManagerRole && (
            <div className="flex items-center gap-3 rounded-md border p-3 bg-amber-50 border-amber-200">
              <input
                type="checkbox"
                id="can_teach"
                checked={canTeach}
                onChange={(e) => {
                  setCanTeach(e.target.checked);
                  if (!e.target.checked) setSelectedSubjects([]);
                }}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="can_teach" className="text-amber-800 cursor-pointer">
                Bu rahbarlar dars ham o'tadi (fanlarni belgilash imkoniyati ochiladi)
              </Label>
            </div>
          )}

          {showSubjects && (
            <div className="space-y-3">
              <Label>O'qitiladigan fanlar (ixtiyoriy)</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_SUBJECTS.map((subject) => {
                  const selected = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-secondary border-border text-foreground"
                      }`}
                    >
                      {selected && <span className="mr-1">✓</span>}
                      {subject}
                    </button>
                  );
                })}
              </div>
              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubjects.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <button type="button" onClick={() => toggleSubject(s)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="names">Xodimlar ismlari</Label>
            <p className="text-xs text-muted-foreground">Har bir qatorda bitta F.I.O kiriting</p>
            <Textarea
              id="names"
              placeholder={"Aliyeva Malika Aliyevna\nToshmatov Jasur Toshmatovich"}
              rows={8}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              className="font-mono text-sm"
            />
            {namesText.trim() && (
              <p className="text-xs text-muted-foreground">
                <Users className="inline w-3 h-3 mr-1" />
                {namesText.split("\n").filter((n) => n.trim()).length} ta xodim
              </p>
            )}
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            💡 Har bir xodimga avtomatik ravishda <strong>5 xonali mahfiy kod</strong> va <strong>login</strong> beriladi.
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setLocation("/staff")} disabled={loading}>
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
              <Button size="sm" onClick={() => setLocation("/staff")}>
                Xodimlar ro'yxatiga
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
                    <TableHead>Lavozim</TableHead>
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
                      <TableCell>{roleLabels[s.role] ?? s.role}</TableCell>
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
                Qo'shilmagan xodimlar
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
