import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, CheckCircle2, XCircle, Clock, FileCheck, CalendarDays,
  Users, TrendingUp, Search, AlertTriangle, CheckCheck, X,
} from "lucide-react";
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
  attendance_pct?: number;
}

// ── TUZATILDI #11: ranglar light/dark ikkalasida ham ko'rinadi
const STATUS_CONFIG: Record<Status, {
  label: string;
  short: string;
  // tugma faol holat
  active: string;
  // tugma nofaol holat
  idle: string;
  // statistika kartasi
  card: string;
  iconColor: string;
  icon: typeof CheckCircle2;
}> = {
  present: {
    label: "Keldi",
    short: "K",
    active: "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30",
    idle: "border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10",
    card: "border-green-500/40 bg-green-500/5",
    iconColor: "text-green-600 dark:text-green-400",
    icon: CheckCircle2,
  },
  absent: {
    label: "Kelmadi",
    short: "X",
    active: "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30",
    idle: "border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10",
    card: "border-red-500/40 bg-red-500/5",
    iconColor: "text-red-600 dark:text-red-400",
    icon: XCircle,
  },
  late: {
    label: "Kech",
    short: "Kech",
    active: "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30",
    idle: "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
    card: "border-amber-500/40 bg-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  excused: {
    label: "Sababli",
    short: "S",
    active: "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30",
    idle: "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
    card: "border-blue-500/40 bg-blue-500/5",
    iconColor: "text-blue-600 dark:text-blue-400",
    icon: FileCheck,
  },
};

const STATUS_ORDER: Status[] = ["present", "absent", "late", "excused"];

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
  const [dirty, setDirty] = useState(false); // saqlanmagan o'zgarish bormi
  const [search, setSearch] = useState("");

  const role = user?.role ?? "";
  const isAdmin = ["admin", "director", "zam_direktor", "zavuch"].includes(role);
  const isClassTeacher = ["sinf_rahbari", "boshlangich_oqituvchi"].includes(role);
  const isSubjectTeacher = role === "teacher";
  const isTeacher = isClassTeacher || isSubjectTeacher;
  const canPick = isAdmin || isSubjectTeacher;

  const { data: classes = [] } = useQuery<ClassInfo[]>({
    queryKey: ["classes-attendance"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/classes`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ClassInfo[]>;
    },
    enabled: canPick,
  });

  const { data: myClass } = useQuery<{ class_name: string; class_id?: string; students: Student[] }>({
    queryKey: ["my-class-attendance", user?.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/dashboard/my-class`, { headers: authH() });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: isClassTeacher && !!user?.class_id,
  });

  // Oxirgi tanlangan sinfni xotiradan tiklash
  useEffect(() => {
    if (canPick && classes.length > 0 && !selectedClass) {
      const savedClassId = localStorage.getItem("last_selected_class_id");
      if (savedClassId) {
        const found = classes.find(c => c.id === savedClassId);
        if (found) setSelectedClass(found);
      }
    }
  }, [classes, canPick, selectedClass]);

  // ── TUZATILDI #5: sinf almashishdan oldin tasdiqlash
  const handleClassSelect = useCallback((cls: ClassInfo | null) => {
    if (dirty && !confirm("Saqlanmagan o'zgarishlar bor. Sinfni almashtirsangiz, ular yo'qoladi. Davom etasizmi?")) return;
    setSelectedClass(cls);
    setSaved(false);
    setDirty(false);
    setSearch("");
    if (cls) localStorage.setItem("last_selected_class_id", cls.id);
    else localStorage.removeItem("last_selected_class_id");
  }, [dirty]);

  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ["students-for-class", selectedClass?.id],
    queryFn: async () => {
      if (!selectedClass) return [];
      const r = await fetch(`${API_BASE}/students?class_name=${encodeURIComponent(selectedClass.name)}`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<Student[]>;
    },
    enabled: canPick && !!selectedClass,
  });

  const currentClassId = selectedClass?.id ?? myClass?.class_id ?? null;
  const currentClassName = selectedClass?.name ?? myClass?.class_name ?? "";

  const { data: existingAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", currentClassId, selectedDate],
    queryFn: async () => {
      if (!currentClassId) return [];
      const r = await fetch(`${API_BASE}/attendance?class_id=${currentClassId}&date=${selectedDate}`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !!currentClassId,
  });

  // ── TUZATILDI #1 va #8: students barqaror + alifbo tartibida
  const students: Student[] = useMemo(() => {
    const raw = isClassTeacher ? (myClass?.students ?? []) : allStudents;
    return [...raw].sort((a, b) => a.full_name.localeCompare(b.full_name, "uz"));
  }, [isClassTeacher, myClass?.students, allStudents]);

  // ── TUZATILDI #1: students o'zgarganda records'ni barqaror tiklash
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
    setDirty(false);
  }, [students, existingAttendance]);

  useEffect(() => {
    if (isClassTeacher && myClass && !selectedClass) {
      setSelectedClass({ id: myClass.class_id ?? "", name: myClass.class_name });
    }
  }, [isClassTeacher, myClass, selectedClass]);

  // ── TUZATILDI #2: dirty holati to'g'ri boshqariladi
  const setStatus = (login: string, status: Status) => {
    setDirty(true);
    setSaved(false);
    setRecords(prev => {
      const next = new Map(prev);
      const rec = next.get(login);
      if (rec && rec.status !== status) next.set(login, { ...rec, status });
      return next;
    });
  };

  const setAllStatus = (status: Status) => {
    setDirty(true);
    setSaved(false);
    setRecords(prev => {
      const next = new Map(prev);
      for (const [k, v] of next) next.set(k, { ...v, status });
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentClassId || records.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          class_id: currentClassId,
          class_name: currentClassName,
          date: selectedDate,
          records: Array.from(records.values()),
        }),
      });
      if (!res.ok) throw new Error("Saqlashda xatolik");
      setSaved(true);
      setDirty(false);
      toast({ title: "Davomat saqlandi ✅", description: `${records.size} o'quvchi uchun ${uzDate(selectedDate)}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // ── TUZATILDI #5: sana o'zgarsa tasdiqlash
  const handleDateChange = (newDate: string) => {
    if (dirty && !confirm("Saqlanmagan o'zgarishlar bor. Sanani almashtirsangiz, ular yo'qoladi. Davom etasizmi?")) return;
    setSelectedDate(newDate);
    setSaved(false);
    setDirty(false);
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records.values()) c[r.status]++;
    return c;
  }, [records]);

  const attendancePct = students.length > 0
    ? Math.round(((counts.present + counts.late) / students.length) * 100)
    : 0;

  const pctColor = attendancePct >= 90 ? "text-green-600 dark:text-green-400"
    : attendancePct >= 75 ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";

  // ── TUZATILDI #7: qidiruv
  const filteredRecords = useMemo(() => {
    const arr = Array.from(records.values());
    if (!search.trim()) return arr;
    const q = search.toLowerCase().trim();
    return arr.filter(r => r.student_name.toLowerCase().includes(q));
  }, [records, search]);

  const currentClass = selectedClass ?? (myClass ? { id: myClass.class_id ?? "", name: myClass.class_name } : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          Davomat
        </h1>
        <p className="text-muted-foreground mt-1">O'quvchilar davomatini kiring va kuzating</p>
      </div>

      {/* Sinf va sana tanlash */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {canPick && (
            <Select value={selectedClass?.id ?? ""} onValueChange={id => {
              const cls = classes.find(c => c.id === id);
              handleClassSelect(cls ?? null);
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
            onChange={e => handleDateChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {dirty && (
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Saqlanmagan o'zgarishlar
            </Badge>
          )}
        </div>

        {/* Tezkor sinf tugmalari */}
        {canPick && classes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-1">
            <span className="text-xs text-muted-foreground mr-1">Tezkor sinflar:</span>
            {classes.map(c => {
              const pct = c.attendance_pct ?? (selectedClass?.id === c.id ? attendancePct : null);
              let colorClass = "border-border text-foreground hover:bg-muted";
              if (pct !== null) {
                if (pct >= 90) colorClass = "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20";
                else if (pct >= 75) colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20";
                else colorClass = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/20";
              }
              if (selectedClass?.id === c.id) colorClass += " ring-2 ring-primary font-bold";
              return (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleClassSelect(c)}
                  className={`text-xs h-7 px-2.5 rounded-full transition-all ${colorClass}`}
                >
                  {c.name} {pct !== null ? `(${pct}%)` : ""}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {!currentClass && canPick && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="w-12 h-12 opacity-30" />
            <p>Davomat kiritish uchun sinf tanlang</p>
          </CardContent>
        </Card>
      )}

      {isClassTeacher && !myClass && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="w-12 h-12 opacity-30" />
            <p>Sizga sinf biriktirilmagan. Admin bilan bog'laning.</p>
          </CardContent>
        </Card>
      )}

      {currentClass && students.length > 0 && (
        <>
          {/* ── TUZATILDI #10: foiz ko'rsatkichi vizual bar bilan */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Bugungi davomat</p>
                  <p className={`text-3xl font-black ${pctColor}`}>{attendancePct}%</p>
                </div>
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        attendancePct >= 90 ? "bg-green-500" :
                        attendancePct >= 75 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${attendancePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {counts.present + counts.late} / {students.length} o'quvchi qatnashdi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistika kartalari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUS_ORDER.map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <Card key={status} className={`border ${cfg.card}`}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
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
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {currentClass.name}-sinf — {uzDate(selectedDate)}
                    {saved && (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs ml-1 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Saqlangan
                      </Badge>
                    )}
                  </CardTitle>
                </div>

                {/* ── TUZATILDI #7: qidiruv */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="O'quvchi ismini qidirish..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* ── TUZATILDI #6: "Hammasi ..." tugmalari kattaroq va wrap */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground self-center mr-1">Hammasiga:</span>
                  {STATUS_ORDER.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className={`text-xs h-7 px-2.5 ${cfg.idle}`}
                        onClick={() => setAllStatus(s)}
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {search ? `"${search}" bo'yicha o'quvchi topilmadi` : "O'quvchilar yo'q"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecords.map((rec, i) => (
                    <div
                      key={rec.student_login}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground w-6 text-center tabular-nums">{i + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {rec.student_name[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium min-w-0 truncate">{rec.student_name}</span>

                      {/* ── TUZATILDI #9: kattaroq va aniqroq holat tugmalari */}
                      <div className="flex gap-1 shrink-0">
                        {STATUS_ORDER.map(s => {
                          const c = STATUS_CONFIG[s];
                          const Icon = c.icon;
                          const isActive = rec.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatus(rec.student_login, s)}
                              title={c.label}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all active:scale-95 ${
                                isActive ? `${c.active} scale-105` : `bg-transparent ${c.idle}`
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {filteredRecords.length} / {records.size} o'quvchi ko'rsatilmoqda
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving || records.size === 0}
                  className="gap-2 min-w-32"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Saqlanmoqda..." : dirty ? "Saqlash" : saved ? "Qayta saqlash" : "Saqlash"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
    }
