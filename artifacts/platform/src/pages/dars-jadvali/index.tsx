import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, getListClassesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2, CalendarDays, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

const DAYS = [
  { id: 1, name: "Dushanba" },
  { id: 2, name: "Seshanba" },
  { id: 3, name: "Chorshanba" },
  { id: 4, name: "Payshanba" },
  { id: 5, name: "Juma" },
  { id: 6, name: "Shanba" },
];

const PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:55–11:40", 5: "11:50–12:35", 6: "12:45–13:30",
  7: "13:40–14:25", 8: "14:35–15:20",
};

const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

interface TimetableEntry {
  id: string;
  class_id: string;
  day_of_week: number;
  period: number;
  subject: string;
  teacher_id: string | null;
  teacher_name: string | null;
  class_name: string | null;
  day_name: string;
  period_time: string;
}

interface StaffItem {
  id: string;
  full_name: string;
  role: string;
}

interface TeacherSubjectItem {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  class_name: string | null;
}

// ─── TEACHER VIEW ─────────────────────────────────────────────────────────────
function TeacherView({ userId }: { userId: string }) {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [assignments, setAssignments] = useState<TeacherSubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/timetable?teacher_id=${userId}`, { headers: authHeaders() }),
      fetch(`${API_BASE}/teacher-subjects?teacher_id=${userId}`, { headers: authHeaders() }),
    ]).then(async ([ttRes, tsRes]) => {
      if (ttRes.ok) setTimetable(await ttRes.json() as TimetableEntry[]);
      if (tsRes.ok) setAssignments(await tsRes.json() as TeacherSubjectItem[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const dayEntries = timetable
    .filter(e => e.day_of_week === selectedDay)
    .sort((a, b) => a.period - b.period);

  // Which class+subject pairs have NO timetable entry yet
  const scheduledPairs = new Set(timetable.map(e => `${e.class_id}::${e.subject}`));
  const unscheduledAssignments = assignments.filter(
    a => !scheduledPairs.has(`${a.class_id}::${a.subject}`)
  );

  // Group assignments by subject for summary
  const assignmentsBySubject = assignments.reduce<Record<string, TeacherSubjectItem[]>>((acc, a) => {
    if (!acc[a.subject]) acc[a.subject] = [];
    acc[a.subject]!.push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mening dars jadvalim</h1>
        <p className="text-muted-foreground mt-1">Haftalik dars jadvali va biriktirilgan sinflar</p>
      </div>

      {/* Day selector */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map(day => (
          <Button
            key={day.id}
            variant={selectedDay === day.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay(day.id)}
          >
            {day.name}
          </Button>
        ))}
      </div>

      {/* Timetable for selected day */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {DAYS.find(d => d.id === selectedDay)?.name} — Darslar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : dayEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Bu kunda dars yo'q
            </div>
          ) : (
            <div className="space-y-2">
              {dayEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="text-center min-w-[2.5rem]">
                    <div className="text-lg font-bold text-primary">{entry.period}</div>
                    <div className="text-xs text-muted-foreground">dars</div>
                  </div>
                  <div className="border-l pl-4 flex-1">
                    <div className="font-medium">{entry.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {PERIOD_TIMES[entry.period]} · {entry.class_name ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned classes summary */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Biriktirilgan sinflar ({assignments.length} ta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(assignmentsBySubject).map(([subject, rows]) => (
                <div key={subject}>
                  <div className="text-sm font-semibold mb-1.5">📚 {subject}</div>
                  <div className="flex flex-wrap gap-2">
                    {rows.map(row => {
                      const hasSchedule = timetable.some(
                        t => t.class_id === row.class_id && t.subject === row.subject
                      );
                      return (
                        <Badge
                          key={row.id}
                          variant={hasSchedule ? "default" : "outline"}
                          className="text-xs"
                        >
                          {row.class_name ?? row.class_id}
                          {!hasSchedule && <span className="ml-1 text-muted-foreground">(jadval yo'q)</span>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {unscheduledAssignments.length > 0 && (
              <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                ⏳ {unscheduledAssignments.length} ta sinf-fan uchun hali dars jadvali tuzilmagan.
                Jadval tuzilgach bu yerda soatlar ko'rinadi.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            Sizga hali sinf-fan biriktirilmagan. Admin tomonidan biriktirilgach bu yerda ko'rinadi.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── ADMIN/EDITOR VIEW ────────────────────────────────────────────────────────
export default function DarsJadvaliPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isTeacher = ["teacher", "sinf_rahbari"].includes(user?.role ?? "");
  const isEditor = ["admin", "director", "zam_direktor", "zavuch"].includes(user?.role ?? "");

  // Teacher gets their own view
  if (isTeacher && user?.id) {
    return <TeacherView userId={user.id} />;
  }

  const { data: classes } = useListClasses({ query: { queryKey: getListClassesQueryKey() } });

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [formPeriod, setFormPeriod] = useState<string>("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`${API_BASE}/staff`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as StaffItem[];
        setStaff(data);
      }
    })();
  }, []);

  const loadTimetable = useCallback(async (classId: string) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/timetable?class_id=${classId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as TimetableEntry[];
        setTimetable(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedClassId) void loadTimetable(selectedClassId);
    else setTimetable([]);
  }, [selectedClassId, loadTimetable]);

  const dayEntries = timetable
    .filter(e => e.day_of_week === selectedDay)
    .sort((a, b) => a.period - b.period);

  const openAdd = () => {
    setEditEntry(null);
    setFormPeriod("");
    setFormSubject("");
    setFormTeacherId("");
    setDialogOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry);
    setFormPeriod(String(entry.period));
    setFormSubject(entry.subject);
    setFormTeacherId(entry.teacher_id ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formPeriod || !formSubject.trim() || !selectedClassId) return;
    setSaving(true);
    try {
      if (editEntry) {
        const res = await fetch(`${API_BASE}/timetable/${editEntry.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            subject: formSubject.trim(),
            teacher_id: (formTeacherId && formTeacherId !== "none") ? formTeacherId : null,
          }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          toast({ variant: "destructive", title: "Xatolik", description: d.error });
        } else {
          toast({ title: "Saqlandi" });
          void loadTimetable(selectedClassId);
          setDialogOpen(false);
        }
      } else {
        const res = await fetch(`${API_BASE}/timetable`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            class_id: selectedClassId,
            day_of_week: selectedDay,
            period: Number(formPeriod),
            subject: formSubject.trim(),
            teacher_id: (formTeacherId && formTeacherId !== "none") ? formTeacherId : null,
          }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          toast({ variant: "destructive", title: "Xatolik", description: d.error });
        } else {
          toast({ title: "Qo'shildi" });
          void loadTimetable(selectedClassId);
          setDialogOpen(false);
        }
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/timetable/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast({ title: "O'chirildi" });
        void loadTimetable(selectedClassId);
      }
    } catch { /* ignore */ }
  };

  const usedPeriods = new Set(
    timetable.filter(e => e.day_of_week === selectedDay && (!editEntry || e.id !== editEntry.id))
      .map(e => e.period)
  );

  const selectedClassName = classes?.find((c: { id: string; name: string }) => c.id === selectedClassId)?.name ?? "";

  // Only teachers are shown for fan assignment selection
  const teacherStaff = staff.filter(s => ["teacher", "sinf_rahbari"].includes(s.role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
        <p className="text-muted-foreground mt-1">Sinflar bo'yicha haftalik dars jadvali</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-full sm:w-64">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Sinf tanlang..." />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((c: { id: string; name: string }) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClassId && isEditor && (
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Dars qo'shish
          </Button>
        )}
      </div>

      {!selectedClassId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
            Dars jadvalini ko'rish uchun sinf tanlang
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <Button
                key={day.id}
                variant={selectedDay === day.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day.id)}
              >
                {day.name}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedClassName} — {DAYS.find(d => d.id === selectedDay)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : dayEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Bu kun uchun dars kiritilmagan
                  {isEditor && (
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="w-4 h-4 mr-1" /> Dars qo'shish
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[2.5rem]">
                          <div className="text-lg font-bold text-primary">{entry.period}</div>
                          <div className="text-xs text-muted-foreground">dars</div>
                        </div>
                        <div className="border-l pl-4">
                          <div className="font-medium">{entry.subject}</div>
                          <div className="text-xs text-muted-foreground">
                            {PERIOD_TIMES[entry.period]} · {entry.teacher_name ?? "O'qituvchi belgilanmagan"}
                          </div>
                        </div>
                      </div>
                      {isEditor && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(entry)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(entry.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntry ? "Darsni tahrirlash" : "Yangi dars qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editEntry && (
              <div className="space-y-1">
                <Label>Dars raqami</Label>
                <Select value={formPeriod} onValueChange={setFormPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(p => (
                      <SelectItem key={p} value={String(p)} disabled={usedPeriods.has(p)}>
                        {p}-dars — {PERIOD_TIMES[p]}
                        {usedPeriods.has(p) ? " (band)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Fan nomi</Label>
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
              <Input
                placeholder="Yoki boshqa fan nomi kiriting..."
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label>O'qituvchi (fan o'qituvchilari)</Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="O'qituvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Belgilanmagan —</SelectItem>
                  {teacherStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSave} disabled={saving || !formSubject.trim() || (!editEntry && !formPeriod)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
