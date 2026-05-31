import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Copy, CheckCheck, Users, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

const TEACHER_ROLES = [
  { value: "teacher", label: "Fan o'qituvchisi" },
  { value: "sinf_rahbari", label: "Sinf rahbari" },
];
const MANAGER_ROLES = [
  { value: "director", label: "Direktor" },
  { value: "zam_direktor", label: "Direktor o'rinbosari" },
  { value: "zavuch", label: "Zavuch" },
  { value: "kutubxonachi", label: "Kutubxonachi" },
];

const roleLabels: Record<string, string> = {
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  sinf_rahbari: "Sinf rahbari",
  teacher: "Fan o'qituvchisi",
  kutubxonachi: "Kutubxonachi",
};

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

function SubjectSelector({
  subjects,
  onChange,
}: {
  subjects: string[];
  onChange: (subjects: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState("");

  const toggle = (s: string) => {
    onChange(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s]);
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !subjects.includes(val)) {
      onChange([...subjects, val]);
    }
    setCustomInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {COMMON_SUBJECTS.map((s) => {
          const sel = subjects.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                sel
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-secondary border-border text-foreground"
              }`}
            >
              {sel && <span className="mr-1">✓</span>}
              {s}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Qo'lda fan nomi yozing..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          className="max-w-xs text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!customInput.trim()}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Qo'shish
        </Button>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-sm py-1 px-2">
              {s}
              <button type="button" onClick={() => toggle(s)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

type TabType = "teacher" | "manager";

export default function BulkNewStaff() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabType>("teacher");
  const [role, setRole] = useState("teacher");
  const [canTeach, setCanTeach] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [namesText, setNamesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isTeacherTab = tab === "teacher";
  const showSubjects = isTeacherTab || canTeach;

  const switchTab = (t: TabType) => {
    setTab(t);
    setRole(t === "teacher" ? "teacher" : "director");
    setCanTeach(false);
    setSubjects([]);
    setNamesText("");
  };

  const handleSubmit = async () => {
    const names = namesText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      toast({ variant: "destructive", title: "Xatolik", description: "Kamida bitta xodim ismi kiriting" });
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
            subjects: showSubjects ? subjects : [],
            can_teach: isTeacherTab ? true : canTeach,
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

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="default">{result.created.length} ta qo'shildi</Badge>
            {result.errors.length > 0 && <Badge variant="destructive">{result.errors.length} ta xatolik</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? <CheckCheck className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Nusxalandi!" : "Hammasini nusxalash"}
            </Button>
            <Button size="sm" onClick={() => setLocation("/staff")}>Xodimlar ro'yxatiga</Button>
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
                  <TableHead>Mahfiy kod</TableHead>
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
                      <span className="font-mono font-bold text-primary text-lg tracking-widest">{s.password}</span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => {
                        void navigator.clipboard.writeText(`${s.full_name} | Login: ${s.login} | Mahfiy kod: ${s.password}`);
                        toast({ title: "Nusxalandi", description: s.full_name });
                      }}>
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
            <div className="bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">Qo'shilmagan xodimlar</div>
            {result.errors.map((e, i) => (
              <div key={i} className="px-4 py-2 text-sm border-t border-destructive/20">
                <span className="font-medium">{e.full_name}</span>
                <span className="text-muted-foreground ml-2">— {e.error}</span>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={() => { setResult(null); setNamesText(""); }}>← Yana qo'shish</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/staff")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ommaviy xodim qo'shish</h1>
          <p className="text-muted-foreground mt-1">Bir nechta xodimni birdaniga qo'shish</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => switchTab("teacher")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "teacher" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          O'qituvchilar
        </button>
        <button
          type="button"
          onClick={() => switchTab("manager")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "manager" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Rahbarlar
        </button>
      </div>

      <div className="border rounded-md bg-card p-6 space-y-5">

        {isTeacherTab ? (
          <div className="space-y-2">
            <Label>Lavozimi</Label>
            <div className="flex flex-wrap gap-2">
              {TEACHER_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                    role === r.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-secondary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Lavozimi</Label>
              <div className="flex flex-wrap gap-2">
                {MANAGER_ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                      role === r.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-secondary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {role !== "kutubxonachi" && (
              <div className="flex items-center gap-3 rounded-md border p-3 bg-amber-50 border-amber-200">
                <input
                  type="checkbox"
                  id="can_teach"
                  checked={canTeach}
                  onChange={(e) => {
                    setCanTeach(e.target.checked);
                    if (!e.target.checked) setSubjects([]);
                  }}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="can_teach" className="text-sm text-amber-800 cursor-pointer">
                  Bu rahbarlar dars ham o'tadi — fanlarni belgilash imkoniyati ochiladi
                </label>
              </div>
            )}
          </div>
        )}

        {showSubjects && (
          <div className="space-y-2">
            <Label>
              O'qitiladigan fanlar
              <span className="text-muted-foreground font-normal ml-1">(ixtiyoriy)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Ro'yxatdan tanlang yoki qo'lda yozing
            </p>
            <SubjectSelector subjects={subjects} onChange={setSubjects} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="names">
            {isTeacherTab ? "O'qituvchilar ismlari" : "Rahbarlar ismlari"}
          </Label>
          <p className="text-xs text-muted-foreground">Har bir qatorda bitta F.I.O</p>
          <Textarea
            id="names"
            placeholder={isTeacherTab
              ? "Aliyeva Malika Aliyevna\nToshmatov Jasur Toshmatovich"
              : "Karimov Bobur Karimovich\nXasanov Sherzod Xasanovich"
            }
            rows={7}
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
    </div>
  );
}
