import { useState, useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Clock, FileCheck, CalendarDays, Users, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type Status = "present" | "absent" | "late" | "excused";

interface Student {
  full_name: string;
  login: string;
  phone_number?: string;
}

interface AttendanceRecord {
  student_login: string;
  student_name: string;
  status: Status;
  note: string;
}

interface ClassInfo {
  id: string;
  name: string;
  teacher_id?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  present:  { label: "Keldi",    color: "bg-green-500/20 text-green-400 border-green-500/30",  icon: CheckCircle2 },
  absent:   { label: "Kelmadi",  color: "bg-red-500/20 text-red-400 border-red-500/30",        icon: XCircle },
  late:     { label: "Kech",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  excused:  { label: "Sababli",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: FileCheck },
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uzDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  return `${d} ${months[parseInt(m!) - 1]} ${y}`;
}

export default function DavomatPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isTeacher = ["teacher", "sinf_rahbari"].includes(user?.role ?? "");
  const isAdmin = ["admin", "director", "zam_direktor", "zavuch"].includes(user?.role ?? "");

  const { data: classes = [] } = useQuery<ClassInfo[]>({
    queryKey: ["classes-attendance"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/classes`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ClassInfo[]>;
    },
    enabled: isAdmin,
  });

  const { data: myClass } = useQuery<{ class_name: string; class_id?: string; students: Student[] }>({
    queryKey: ["my-class-attendance", user?.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/dashboard/my-class`, { headers: authH() });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: isTeacher && !!user?.class_id,
  });

  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ["students-for-class", selectedClass?.id],
    queryFn: async () => {
      if (!selectedClass) return [];
      const r = await fetch(`${API_BASE}/students?class_name=${encodeURIComponent(selectedClass.name)}`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<Student[]>;
    },
    enabled: isAdmin && !!selectedClass,
  });

  const { data: existingAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", selectedClass?.id ?? myClass?.class_id, selectedDate],
    queryFn: async () => {
      const cid = selectedClass?.id ?? (myClass as any)?.class_id;
      if (!cid) return [];
      const r = await fetch(`${API_BASE}/attendance?class_id=${cid}&date=${selectedDate}`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !!(selectedClass?.id || (myClass as any)?.class_id),
  });

  const students: Student[] = isTeacher
    ? (myClass?.students ?? [])
    : allStudents;

  useEffect(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const s of students) {
      const existing = existingAttendance.find(a => a.student_login === s.login);
      map.set(s.login, {
        student_login: s.login,
        student_name: s.full_name,
        status: existing?.status ?? "present",
        note: existing?.note ?? "",
      });
    }
    setRecords(map);
    setSaved(existingAttendance.length > 0);
  }, [students, existingAttendance]);

  useEffect(() => {
    if (isTeacher && myClass) {
      setSelectedClass({ id: (myClass as any).class_id ?? "", name: myClass.class_name });
    }
  }, [isTeacher, myClass]);

  const setStatus = (login: string, status: Status) => {
    setSaved(false);
    setRecords(prev => {
      const next = new Map(prev);
      const rec = next.get(login);
      if (rec) next.set(login, { ...rec, status });
      return next;
    });
  };

  const setAllStatus = (status: Status) => {
    setSaved(false);
    setRecords(prev => {
      const next = new Map(prev);
      for (const [k, v] of next) next.set(k, { ...v, status });
      return next;
    });
  };

  const handleSave = async () => {
    const cid = selectedClass?.id ?? (myClass as any)?.class_id;
    const cname = selectedClass?.name ?? myClass?.class_name ?? "";
    if (!cid || records.size === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          class_id: cid,
          class_name: cname,
          date: selectedDate,
          records: Array.from(records.values()),
        }),
      });
      if (!res.ok) throw new Error("Saqlashda xatolik");
      setSaved(true);
      toast({ title: "Davomat saqlandi ✅", description: `${records.size} o'quvchi uchun ${uzDate(selectedDate)}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    present: 0, absent: 0, late: 0, excused: 0,
  };
  for (const r of records.values()) counts[r.status]++;

  const attendancePct = students.length > 0
    ? Math.round(((counts.present + counts.late) / students.length) * 100)
    : 0;

  const currentClass = selectedClass ?? (myClass ? { id: (myClass as any).class_id ?? "", name: myClass.class_name } : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          Davomat
        </h1>
        <p className="text-muted-foreground mt-1">O'quvchilar davomatini kiring va kuzating</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <Select value={selectedClass?.id ?? ""} onValueChange={id => {
            const cls = classes.find(c => c.id === id);
            setSelectedClass(cls ?? null);
            setSaved(false);
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sinf tanlang..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}-sinf</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          type="date"
          value={selectedDate}
          max={todayStr()}
          onChange={e => { setSelectedDate(e.target.value); setSaved(false); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {!currentClass && isAdmin && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="w-12 h-12 opacity-30" />
            <p>Davomat kiritish uchun sinf tanlang</p>
          </CardContent>
        </Card>
      )}

      {isTeacher && !myClass && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="w-12 h-12 opacity-30" />
            <p>Sizga sinf biriktirilmagan. Admin bilan bog'laning.</p>
          </CardContent>
        </Card>
      )}

      {currentClass && students.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, cfg]) => {
              const Icon = cfg.icon;
              return (
                <Card key={status} className={`border ${cfg.color.split(" ")[2]}`}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <Icon className={`w-5 h-5 ${cfg.color.split(" ")[1]}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                      <p className="text-xl font-bold">{counts[status]}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  {currentClass.name}-sinf — {uzDate(selectedDate)}
                  {saved && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs ml-1">Saqlangan</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    Davomat: <span className={`font-bold ${attendancePct >= 90 ? "text-green-400" : attendancePct >= 75 ? "text-yellow-400" : "text-red-400"}`}>{attendancePct}%</span>
                  </span>
                  <div className="flex gap-1">
                    {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                      <Button key={s} size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => setAllStatus(s)}>
                        Hammasi {STATUS_CONFIG[s].label.toLowerCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(records.values()).map((rec, i) => {
                  const cfg = STATUS_CONFIG[rec.status];
                  return (
                    <div key={rec.student_login}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/6 transition-colors">
                      <span className="text-sm text-muted-foreground w-6 text-center">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {rec.student_name[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium min-w-0 truncate">{rec.student_name}</span>
                      <div className="flex gap-1 shrink-0">
                        {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
                          const c = STATUS_CONFIG[s];
                          const Icon = c.icon;
                          return (
                            <button key={s}
                              onClick={() => setStatus(rec.student_login, s)}
                              title={c.label}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                                rec.status === s
                                  ? `${c.color} scale-110 shadow`
                                  : "border-white/10 text-white/30 hover:border-white/25 hover:text-white/60"
                              }`}>
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving || records.size === 0}
                  className="gap-2 min-w-32">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
