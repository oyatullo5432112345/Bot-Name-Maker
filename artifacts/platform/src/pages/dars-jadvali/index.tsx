import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, getListClassesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  day_name: string;
  period_time: string;
}

interface StaffItem {
  id: string;
  full_name: string;
  role: string;
}

export default function DarsJadvaliPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = ["admin"].includes(user?.role ?? "");
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
            teacher_id: formTeacherId || null,
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
            teacher_id: formTeacherId || null,
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

  const selectedClassName = classes?.find(c => c.id === selectedClassId)?.name ?? "";

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
              {classes?.map(c => (
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
              <Label>O'qituvchi</Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="O'qituvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Belgilanmagan —</SelectItem>
                  {staff.map(s => (
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
