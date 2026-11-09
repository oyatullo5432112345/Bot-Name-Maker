import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, getListClassesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2, CalendarDays, BookOpen, Upload, AlertTriangle, CheckCircle2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

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

// ── TUZATILDI #1: matchDay endi aniq moslikni tekshiradi.
// Avval "shanba" → "Seshanba" ni ham topardi (includes tufayli).
// Endi: avval to'liq moslik, keyin boshidan moslik — lekin faqat bitta nomzod bo'lsa.
function matchDay(raw: string): number | null {
  const norm = raw.trim().toLowerCase().replace(/[''`]/g, "").replace(/\s+/g, " ");
  if (!norm) return null;
  const normDays = DAYS.map(d => ({ id: d.id, key: d.name.toLowerCase().replace(/[''`]/g, "") }));
  // 1. To'liq moslik
  const exact = normDays.find(d => d.key === norm);
  if (exact) return exact.id;
  // 2. Boshidan moslik (masalan "dush" → "dushanba") — faqat bitta nomzod bo'lsa
  const starts = normDays.filter(d => d.key.startsWith(norm) || norm.startsWith(d.key));
  if (starts.length === 1) return starts[0]!.id;
  // 3. Bir nechta nomzod bo'lsa — eng uzun moslikni tanlaymiz
  if (starts.length > 1) {
    starts.sort((a, b) => b.key.length - a.key.length);
    return starts[0]!.id;
  }
  return null;
}

const PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:45–11:30", 5: "11:50–12:35", 6: "12:45–13:20",
  7: "13:30–14:15", 8: "14:25–15:10",
};

// ── TUZATILDI #6: darslar soni endi dinamik (7 ta bo'lsa ham ishlaydi)
const PERIOD_COUNT = Object.keys(PERIOD_TIMES).length;

const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

// Fan bo'yicha rang — dars kartalarida chap chiziq uchun
const SUBJECT_COLORS: Record<string, string> = {
  "Matematika": "from-blue-500 to-indigo-500",
  "Ona tili": "from-rose-500 to-pink-500",
  "Adabiyot": "from-fuchsia-500 to-purple-500",
  "Ingliz tili": "from-cyan-500 to-teal-500",
  "Rus tili": "from-sky-500 to-blue-500",
  "Fizika": "from-violet-500 to-indigo-500",
  "Kimyo": "from-emerald-500 to-green-500",
  "Biologiya": "from-lime-500 to-emerald-500",
  "Geografiya": "from-amber-500 to-orange-500",
  "Tarix": "from-yellow-500 to-amber-500",
  "Informatika": "from-slate-500 to-gray-500",
  "Chizmachilik": "from-stone-500 to-neutral-500",
  "Jismoniy tarbiya": "from-red-500 to-rose-500",
  "Musiqa": "from-pink-500 to-rose-500",
  "Texnologiya": "from-teal-500 to-cyan-500",
};
function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? "from-primary to-primary/70";
}

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
  can_teach?: boolean;
}

interface TeacherSubjectItem {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  class_name: string | null;
}

// ── TUZATILDI #2: o'qituvchi ismini solishtirish — faqat includes emas, so'z chegarasi bilan
function matchTeacher(raw: string, staff: StaffItem[]): string | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;
  // 1. To'liq moslik
  const exact = staff.find(s => s.full_name.toLowerCase() === q);
  if (exact) return exact.id;
  // 2. Har bir so'z bo'yicha moslik (ism yoki familiya)
  const qWords = q.split(" ").filter(w => w.length >= 2);
  if (qWords.length === 0) return null;
  let best: { id: string; score: number } | null = null;
  for (const s of staff) {
    const words = s.full_name.toLowerCase().split(" ").filter(w => w.length >= 2);
    let score = 0;
    for (const qw of qWords) {
      if (words.some(w => w === qw || w.startsWith(qw) || qw.startsWith(w))) score++;
    }
    if (score > 0 && (!best || score > best.score)) best = { id: s.id, score };
  }
  // Kamida bitta so'z mos kelsa va faqat bitta nomzod bo'lsa
  if (best && best.score >= 1) {
    const candidates = staff.filter(s => {
      const words = s.full_name.toLowerCase().split(" ").filter(w => w.length >= 2);
      return qWords.some(qw => words.some(w => w === qw || w.startsWith(qw) || qw.startsWith(w)));
    });
    if (candidates.length === 1) return candidates[0]!.id;
  }
  return null;
}

// ── TEACHER VIEW ─────────────────────────────────────────────────────────────
function TeacherView({ userId }: { userId: string }) {
  // ── TUZATILDI #4: yakshanba (0) → dushanba (1), shanba (6) saqlanadi
  const todayDow = new Date().getDay();
  const initDay = todayDow === 0 ? 1 : todayDow;
  const [selectedDay, setSelectedDay] = useState<number>(initDay);
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

  const scheduledPairs = new Set(timetable.map(e => `${e.class_id}::${e.subject}`));
  const unscheduledAssignments = assignments.filter(
    a => !scheduledPairs.has(`${a.class_id}::${a.subject}`)
  );

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

      {/* ── TUZATILDI #9: bugungi kun alohida belgilanadi */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map(day => {
          const isToday = day.id === initDay;
          return (
            <Button
              key={day.id}
              variant={selectedDay === day.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDay(day.id)}
              className={isToday && selectedDay !== day.id ? "border-primary/60" : ""}
            >
              {day.name}
              {isToday && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </Button>
          );
        })}
      </div>

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
                // ── TUZATILDI #8: rangli chap chiziq + yaxshi dizayn
                <div
                  key={entry.id}
                  className="relative flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${subjectColor(entry.subject)}`} />
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
                      // ── TUZATILDI #12: "jadval yo'q" alohida rangli belgi
                      return (
                        <Badge
                          key={row.id}
                          variant={hasSchedule ? "default" : "outline"}
                          className={`text-xs ${!hasSchedule ? "border-amber-400 text-amber-700 dark:text-amber-300" : ""}`}
                        >
                          {row.class_name ?? row.class_id}
                          {!hasSchedule && (
                            <span className="ml-1.5 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              jadval yo'q
                            </span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {unscheduledAssignments.length > 0 && (
              <div className="mt-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {unscheduledAssignments.length} ta sinf-fan uchun hali dars jadvali tuzilmagan.
                  Jadval tuzilgach bu yerda soatlar ko'rinadi.
                </span>
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
  const isTeacher = ["teacher", "sinf_rahbari"].includes(user?.role ?? "");
  if (isTeacher && user?.id) {
    return <TeacherView userId={user.id} />;
  }
  return <AdminScheduleView />;
}

// ─── ADMIN/MUHARRIR KO'RINISHI ─────────────────────────────────────────────────
function AdminScheduleView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditor = ["admin", "director", "zam_direktor", "zavuch"].includes(user?.role ?? "");

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total_parsed: number;
    saved: number;
    unmatched: { row: { class_name: string; subject: string }; reason: string }[];
  } | null>(null);

  const [textImportOpen, setTextImportOpen] = useState(false);
  const [scheduleText, setScheduleText] = useState("");
  const [textImporting, setTextImporting] = useState(false);

  const [isTwoShift, setIsTwoShift] = useState(false);
  const [smenaMap, setSmenaMap] = useState<Record<string, number | null>>({});
  const [bolimSel, setBolimSel] = useState<"all" | "boshlangich" | "yuqori">("all");
  const [smenaSel, setSmenaSel] = useState<"all" | "1" | "2">("all");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/maktablar/mine`, { headers: authHeaders() });
        if (!res.ok) return;
        const mine = await res.json() as { ikki_smena?: boolean };
        setIsTwoShift(!!mine.ikki_smena);
        if (mine.ikki_smena) {
          const sRes = await fetch(`${API_BASE}/classes/smenalar`, { headers: authHeaders() });
          if (sRes.ok) {
            const rows = await sRes.json() as { id: string; smena: number | null }[];
            const map: Record<string, number | null> = {};
            for (const r of rows) map[r.id] = r.smena;
            setSmenaMap(map);
          }
        }
      } catch { /* ixtiyoriy */ }
    })();
  }, []);

  const gradeNum = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };
  const classLetter = (c: string): string => c.replace(/^\s*\d{1,2}\s*-?\s*/, "");

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
        return data; // ── TUZATILDI #5: yangi ma'lumotni qaytaramiz
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
    return null;
  }, []);

  useEffect(() => {
    if (selectedClassId) void loadTimetable(selectedClassId);
    else setTimetable([]);
  }, [selectedClassId, loadTimetable]);

  const dayEntries = timetable
    .filter(e => e.day_of_week === selectedDay)
    .sort((a, b) => a.period - b.period);

  const openAdd = (presetPeriod?: number) => {
    setEditEntry(null);
    setFormPeriod(presetPeriod ? String(presetPeriod) : "");
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

  const handleSave = async (keepOpen = false) => {
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
          await loadTimetable(selectedClassId);
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
          const justAdded = Number(formPeriod);
          // ── TUZATILDI #5: yangi ma'lumotni await bilan olamiz
          const fresh = await loadTimetable(selectedClassId);
          if (keepOpen) {
            const used = new Set((fresh ?? []).filter(e => e.day_of_week === selectedDay).map(e => e.period));
            used.add(justAdded);
            let next = justAdded + 1;
            while (next <= PERIOD_COUNT && used.has(next)) next++;
            setFormPeriod(next <= PERIOD_COUNT ? String(next) : "");
            setFormSubject("");
            setFormTeacherId("");
          } else {
            setDialogOpen(false);
          }
        }
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setSaving(false);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${API_BASE}/timetable/import`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ file_base64: base64, media_type: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Xatolik", description: data.error ?? "Yuklashda xatolik" });
      } else {
        setImportResult(data);
        toast({ title: "Jadval yuklandi", description: `${data.saved} ta dars saqlandi` });
        if (selectedClassId) await loadTimetable(selectedClassId);
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── TUZATILDI #7: o'chirishdan oldin tasdiqlash
  const handleDelete = async (id: string) => {
    if (!confirm("Bu darsni o'chirishni tasdiqlaysizmi?")) return;
    try {
      const res = await fetch(`${API_BASE}/timetable/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast({ title: "O'chirildi" });
        await loadTimetable(selectedClassId);
      }
    } catch { /* ignore */ }
  };

  // ── TUZATILDI #3: matndan yuklash — parallel so'rovlar (sekinlik tuzatildi)
  const handleTextImport = async () => {
    if (!selectedClassId || !scheduleText.trim()) return;
    setTextImporting(true);
    const lines = scheduleText.split("\n").map(l => l.trim()).filter(Boolean);
    const payloads: { line: string; body: Record<string, unknown> | null }[] = [];
    for (const line of lines) {
      const parts = line.split("|").map(p => p.trim());
      const dayRaw = parts[0] ?? "";
      const periodRaw = parts[1] ?? "";
      const subject = parts[2] ?? "";
      const teacherRaw = parts[3] ?? "";

      const day_of_week = matchDay(dayRaw);
      const period = Number(periodRaw);

      if (!day_of_week || !period || period < 1 || period > PERIOD_COUNT || !subject) {
        payloads.push({ line, body: null });
        continue;
      }
      const teacher_id = matchTeacher(teacherRaw, staff);
      payloads.push({
        line,
        body: { class_id: selectedClassId, day_of_week, period, subject, teacher_id },
      });
    }

    // Parallel yuboramiz (maksimal 5 ta bir vaqtda) — sekinlikni kamaytirish uchun
    let saved = 0;
    const failed: string[] = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < payloads.length; i += CONCURRENCY) {
      const chunk = payloads.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(async (p) => {
        if (!p.body) return { ok: false, line: p.line };
        try {
          const res = await fetch(`${API_BASE}/timetable`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(p.body),
          });
          return { ok: res.ok, line: p.line };
        } catch {
          return { ok: false, line: p.line };
        }
      }));
      for (const r of results) {
        if (r.ok) saved++;
        else failed.push(r.line);
      }
    }

    setTextImporting(false);
    setTextImportOpen(false);
    setScheduleText("");
    await loadTimetable(selectedClassId);

    if (failed.length === 0) {
      toast({ title: "Muvaffaqiyatli", description: `${saved} ta dars jadvalga qo'shildi` });
    } else {
      toast({ variant: "destructive", title: `${saved} ta qo'shildi, ${failed.length} ta o'tmadi`, description: failed.slice(0, 3).join(" | ") });
    }
  };

  const usedPeriods = new Set(
    timetable.filter(e => e.day_of_week === selectedDay && (!editEntry || e.id !== editEntry.id))
      .map(e => e.period)
  );

  const selectedClassName = classes?.find((c: { id: string; name: string }) => c.id === selectedClassId)?.name ?? "";

  const sortedClasses = ([...((classes ?? []) as { id: string; name: string }[])]).sort((a, b) => {
    const ga = gradeNum(a.name), gb = gradeNum(b.name);
    if (ga !== gb) return ga - gb;
    return classLetter(a.name).localeCompare(classLetter(b.name), "uz");
  });
  const visibleClasses = sortedClasses.filter((c) => {
    const g = gradeNum(c.name);
    if (bolimSel === "boshlangich" && !(g >= 1 && g <= 4)) return false;
    if (bolimSel === "yuqori" && g < 5) return false;
    if (smenaSel !== "all") { const sm = smenaMap[c.id]; if (sm != null && sm !== Number(smenaSel)) return false; }
    return true;
  });

  const teacherStaff = staff.filter(s =>
    ["teacher", "sinf_rahbari"].includes(s.role) ||
    (["director", "zam_direktor", "zavuch"].includes(s.role) && s.can_teach === true)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
        <p className="text-muted-foreground mt-1">Sinflar bo'yicha haftalik dars jadvali</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Bo'lim:</span>
            {([["all", "Hammasi"], ["boshlangich", "Boshlang'ich (1–4)"], ["yuqori", "Yuqori (5+)"]] as const).map(([val, lbl]) => (
              <Button key={val} size="sm" variant={bolimSel === val ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setBolimSel(val)}>{lbl}</Button>
            ))}
          </div>
          {isTwoShift && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Smena:</span>
              {([["all", "Hammasi"], ["1", "1-smena"], ["2", "2-smena"]] as const).map(([val, lbl]) => (
                <Button key={val} size="sm" variant={smenaSel === val ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setSmenaSel(val)}>{lbl}</Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleClasses.length === 0 ? (
            <span className="text-sm text-muted-foreground">Bu filtrda sinf topilmadi</span>
          ) : (
            visibleClasses.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedClassId === c.id ? "default" : "outline"}
                className="h-8"
                onClick={() => setSelectedClassId(c.id)}
              >
                {c.name}
              </Button>
            ))
          )}
        </div>

        {selectedClassId && isEditor && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => openAdd()}>
              <Plus className="w-4 h-4 mr-2" />
              Dars qo'shish
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTextImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Matndan yuklash
            </Button>
          </div>
        )}
      </div>

      {isEditor && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="font-medium text-sm">Dars jadvalini yuklab, avtomatik to'ldirish</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rasmiy dars jadvali rasmi yoki PDF faylini yuklang — barcha sinflar, o'qituvchilar va soatlar avtomatik kiritiladi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importing ? "O'qilmoqda..." : "Jadval faylini yuklash"}
                </Button>
              </div>
            </div>
            {/* ── TUZATILDI #11: yuklash natijasi yaxshiroq ko'rsatiladi */}
            {importResult && (
              <div className="mt-3 text-sm rounded-lg bg-secondary/50 p-3
