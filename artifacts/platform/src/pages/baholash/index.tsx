import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, Plus, Trash2, Search, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const TOKEN_KEY = "talim_auth_token";
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

type Grade = {
  id: string;
  student_login: string;
  student_name: string;
  class_name: string;
  subject: string;
  grade: number;
  comment: string;
  teacher_name: string;
  teacher_login: string;
  created_at: string;
};

type Student = {
  login: string;
  full_name: string;
  class_name: string;
};

const SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Tarix", "Geografiya", "Biologiya", "Fizika", "Kimyo",
  "Informatika", "Jismoniy tarbiya", "Musiqa", "Tasviriy san'at",
  "Texnologiya", "Boshqa",
];

const GRADE_COLORS: Record<number, string> = {
  5: "bg-green-100 text-green-700 border-green-200",
  4: "bg-blue-100 text-blue-700 border-blue-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  2: "bg-red-100 text-red-700 border-red-200",
  1: "bg-gray-100 text-gray-700 border-gray-200",
};

function GradeBadge({ grade }: { grade: number }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-bold border ${GRADE_COLORS[grade] ?? ""}`}>
      <Star className="w-3.5 h-3.5" />
      {grade}
    </span>
  );
}

function AddGradeDialog({ onAdded }: { onAdded: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [studentLogin, setStudentLogin] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState(user?.class_name ?? "");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [comment, setComment] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["students-for-grade"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.class_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          student_login: studentLogin,
          student_name: studentName,
          class_name: className,
          subject,
          grade: Number(grade),
          comment,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Xatolik");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Baho qo'yildi!" });
      setOpen(false);
      setStudentLogin("");
      setStudentName("");
      setGrade("");
      setSubject("");
      setComment("");
      onAdded();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Baho qo'yish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>O'quvchiga baho qo'yish</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>O'quvchini qidirish</Label>
            <Input
              placeholder="Ism bo'yicha qidirish..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            {studentSearch && filteredStudents.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredStudents.slice(0, 10).map((s) => (
                  <button
                    key={s.login}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center"
                    onClick={() => {
                      setStudentLogin(s.login);
                      setStudentName(s.full_name);
                      setClassName(s.class_name);
                      setStudentSearch(s.full_name);
                    }}
                  >
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-muted-foreground text-xs">{s.class_name} sinf</span>
                  </button>
                ))}
              </div>
            )}
            {studentLogin && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Tanlandi: {studentName} ({className} sinf)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fan <span className="text-destructive">*</span></Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Fan" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Baho <span className="text-destructive">*</span></Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Baho" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {g} {g === 5 ? "— A'lo" : g === 4 ? "— Yaxshi" : g === 3 ? "— Qoniqarli" : g === 2 ? "— Qoniqarsiz" : "— Juda yomon"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Izoh (ixtiyoriy)</Label>
            <Input
              placeholder="Baho haqida qo'shimcha izoh..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            disabled={mutation.isPending || !studentLogin || !subject || !grade}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BaholashPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const isTeacher = user && ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"].includes(user.role);
  const isStudent = user?.role === "student";

  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: ["grades"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grades`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/grades/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast({ title: "Baho o'chirildi" });
    },
    onError: () => {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    },
  });

  const filtered = grades.filter((g) =>
    g.student_name.toLowerCase().includes(search.toLowerCase()) ||
    g.subject.toLowerCase().includes(search.toLowerCase()) ||
    g.class_name.toLowerCase().includes(search.toLowerCase())
  );

  const avgGrade = grades.length > 0
    ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(1)
    : null;

  const subjectStats = grades.reduce<Record<string, { total: number; count: number }>>((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = { total: 0, count: 0 };
    acc[g.subject]!.total += g.grade;
    acc[g.subject]!.count += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Baholash tizimi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isStudent ? "Mening baholarim" : "O'quvchilar baholari"}
          </p>
        </div>
        {isTeacher && (
          <AddGradeDialog onAdded={() => queryClient.invalidateQueries({ queryKey: ["grades"] })} />
        )}
      </div>

      {grades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-primary">{grades.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Jami baho</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-green-600">{grades.filter((g) => g.grade >= 4).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">A'lo/Yaxshi</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-yellow-600">{grades.filter((g) => g.grade === 3).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Qoniqarli</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-blue-600">{avgGrade ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">O'rtacha baho</p>
          </Card>
        </div>
      )}

      {Object.keys(subjectStats).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fanlar bo'yicha o'rtacha</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(subjectStats).map(([subj, stat]) => (
              <Badge key={subj} variant="secondary" className="gap-1">
                {subj}: <span className="font-bold">{(stat.total / stat.count).toFixed(1)}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="O'quvchi nomi, fan yoki sinf bo'yicha qidirish..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <ClipboardList className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">
            {search ? "Qidiruv bo'yicha baho topilmadi" : "Hozircha baho yo'q"}
          </p>
          {isTeacher && !search && (
            <p className="text-sm">Baho qo'yish uchun yuqoridagi tugmani bosing</p>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>O'quvchi</TableHead>
                {!isStudent && <TableHead>Sinf</TableHead>}
                <TableHead>Fan</TableHead>
                <TableHead className="text-center">Baho</TableHead>
                <TableHead className="hidden sm:table-cell">Izoh</TableHead>
                <TableHead className="hidden md:table-cell">O'qituvchi</TableHead>
                <TableHead className="hidden lg:table-cell">Sana</TableHead>
                {isTeacher && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                const canDelete =
                  isTeacher &&
                  (user?.role === "admin" || user?.role === "director" || g.teacher_login === user?.login);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.student_name}</TableCell>
                    {!isStudent && <TableCell className="text-muted-foreground text-sm">{g.class_name}</TableCell>}
                    <TableCell>
                      <span className="text-sm">{g.subject}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <GradeBadge grade={g.grade} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[120px] truncate">
                      {g.comment || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {g.teacher_name}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(g.created_at).toLocaleDateString("uz-UZ")}
                    </TableCell>
                    {isTeacher && (
                      <TableCell>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(g.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
