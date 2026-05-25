import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2, Plus, Trash2, BookOpen } from "lucide-react";
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
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface TeacherSubject {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  class_name: string | null;
}

export default function StaffSubjectsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [teacher, setTeacher] = useState<StaffMember | null>(null);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [teacherRes, subjectsRes, classesRes] = await Promise.all([
      fetch(`${API_BASE}/staff/${id}`, { headers: authHeaders() }),
      fetch(`${API_BASE}/teacher-subjects?teacher_id=${id}`, { headers: authHeaders() }),
      fetch(`${API_BASE}/classes`, { headers: authHeaders() }),
    ]);
    if (teacherRes.ok) setTeacher(await teacherRes.json() as StaffMember);
    if (subjectsRes.ok) setSubjects(await subjectsRes.json() as TeacherSubject[]);
    if (classesRes.ok) setClasses(await classesRes.json() as ClassItem[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!formClassId || !formSubject || !id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-subjects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ teacher_id: id, class_id: formClassId, subject: formSubject }),
      });
      if (res.ok) {
        toast({ title: "Qo'shildi", description: "Sinf-fan biriktirildi" });
        setFormClassId("");
        setFormSubject("");
        void loadData();
      } else {
        const d = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: d.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setSaving(false);
  };

  const handleDelete = async (tsId: string) => {
    try {
      const res = await fetch(`${API_BASE}/teacher-subjects/${tsId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast({ title: "O'chirildi" });
        void loadData();
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const groupedBySubject = subjects.reduce<Record<string, TeacherSubject[]>>((acc, s) => {
    if (!acc[s.subject]) acc[s.subject] = [];
    acc[s.subject]!.push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/staff")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {teacher?.full_name ?? "O'qituvchi"} — Fanlar
          </h1>
          <p className="text-muted-foreground mt-1">
            Qaysi sinflarga qaysi fandan dars berishini boshqarish
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Sinf + Fan biriktirish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sinf</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sinfni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fan</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Fan tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SUBJECTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="mt-3"
            onClick={handleAdd}
            disabled={saving || !formClassId || !formSubject}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Qo'shish
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Biriktirishlar ({subjects.length} ta)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Hali hech qanday sinf-fan biriktirilmagan
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedBySubject).map(([subject, rows]) => (
                <div key={subject}>
                  <div className="text-sm font-semibold text-foreground mb-2 pb-1 border-b">
                    📚 {subject}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rows.map(row => (
                      <div
                        key={row.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-secondary/50 text-sm"
                      >
                        <span className="font-medium">{row.class_name ?? row.class_id}</span>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => void handleDelete(row.id)}
                          title="O'chirish"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
