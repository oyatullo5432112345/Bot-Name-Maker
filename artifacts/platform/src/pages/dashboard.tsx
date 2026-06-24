import { useAuth } from "@/lib/use-auth";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WorldCupBanner } from "@/components/world-cup-banner";
import {
  useGetDashboardStats,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, GraduationCap, CalendarDays, Loader2, Clock, BookOpen, User, Megaphone, Pin, ChevronRight, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const BAR_COLORS = ["#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#f97316","#eab308","#22c55e","#14b8a6","#0ea5e9"];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const SCHOOL_YEAR_START = new Date("2026-09-02T08:00:00");

const DAY_NAMES: Record<number, string> = {
  1: "Dushanba", 2: "Seshanba", 3: "Chorshanba",
  4: "Payshanba", 5: "Juma", 6: "Shanba",
};
const PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:55–11:40", 5: "11:50–12:35", 6: "12:45–13:30",
  7: "13:40–14:25", 8: "14:35–15:20",
};

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target, timeLeft]);
  return {
    days: Math.floor(timeLeft / 86400000),
    hours: Math.floor((timeLeft % 86400000) / 3600000),
    minutes: Math.floor((timeLeft % 3600000) / 60000),
    seconds: Math.floor((timeLeft % 60000) / 1000),
    ended: timeLeft <= 0,
  };
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  subject: string;
  teacher_name: string | null;
  class_name?: string | null;
}

interface TeacherSubjectEntry {
  id: string;
  subject: string;
  class_id: string;
  class_name?: string | null;
}

const UZ_MOTIVATIONAL = [
  "Bilim — eng katta boylik. 📚",
  "Har bir yangi kun — yangi imkoniyat! 🌟",
  "Qiyinchilik — muvaffaqiyatning boshlanishi. 💪",
  "Mehnat va sabr — maqsadga yetkazadi. 🎯",
  "Kelajagingiz bugungi saydingizda. 🚀",
  "Har bir dars — yangi ufq. 🌅",
  "O'rgan, o'sa, yaxshilan — har kuni! ✨",
];

function getMorningGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 6) return `Hurmatli ${name}, erta tongda ham mehnat — buni qadrlaymiz! 🌙`;
  if (h < 12) return `Xayrli tong, ${name}! 🌤️`;
  if (h < 18) return `Xayrli kun, ${name}! ☀️`;
  return `Xayrli kech, ${name}! 🌆`;
}

type Announcement = {
  id: string; title: string; content: string;
  author_name: string; pinned: boolean; created_at: string;
};

function AnnouncementsBanner() {
  const { data } = useQuery<Announcement[]>({
    queryKey: ["announcements-dashboard"],
    queryFn: async () => {
      const t = localStorage.getItem("talim_auth_token");
      const r = await fetch(`${API_BASE}/announcements`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) return [];
      return r.json() as Promise<Announcement[]>;
    },
    staleTime: 60_000,
  });

  const items = (data ?? []).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
          <Megaphone className="w-4 h-4" />
          So'nggi e'lonlar
          <Link href="/announcements" className="ml-auto text-xs text-primary/70 hover:text-primary flex items-center gap-0.5">
            Barchasi <ChevronRight className="w-3 h-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.map(a => (
          <div key={a.id} className="flex items-start gap-2 text-sm">
            {a.pinned && <Pin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <span className="font-medium">{a.title}</span>
              <span className="text-muted-foreground ml-2 text-xs line-clamp-1">{a.content}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const isAdminOrDir = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const isTeacher = ["teacher", "sinf_rahbari"].includes(user.role);
  const isStudent = user.role === "student";

  const motivation = UZ_MOTIVATIONAL[new Date().getDate() % UZ_MOTIVATIONAL.length]!;

  return (
    <div className="space-y-6">
      <WorldCupBanner />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
        <p className="text-muted-foreground mt-1">{getMorningGreeting(user.full_name ?? "")}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{motivation}</p>
      </div>
      <AnnouncementsBanner />
      {isAdminOrDir && <AdminDashboard />}
      {isTeacher && <TeacherDashboard />}
      {isStudent && <StudentDashboard />}
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), retry: 2 }
  });

  const chartData = useMemo(
    () => (stats?.students_by_class ?? []).map((s, i) => ({
      name: s.class_name,
      count: Number(s.count),
      fill: BAR_COLORS[i % BAR_COLORS.length],
    })),
    [stats?.students_by_class]
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError || !stats) return (
    <div className="flex flex-col items-center py-12 gap-4 text-muted-foreground">
      <p>Statistikani yuklashda xatolik yuz berdi.</p>
      <button onClick={() => refetch()} className="text-primary underline text-sm">Qayta urinish</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Jami O'quvchilar", value: stats.total_students, icon: GraduationCap, color: "text-blue-400" },
          { title: "Jami Sinflar", value: stats.total_classes, icon: School, color: "text-indigo-400" },
          { title: "Xodimlar", value: stats.total_staff, icon: Users, color: "text-purple-400" },
          { title: "O'quv yiliga qoldi", value: `${stats.days_until_launch} kun`, icon: CalendarDays, color: "text-emerald-400" },
        ].map(({ title, value, icon: Icon, color }) => (
          <Card key={title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Sinflar bo'yicha o'quvchilar soni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                  formatter={(value: number) => [`${value} o'quvchi`, ""]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Sinflar jadvali</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sinf</TableHead>
                <TableHead className="text-right">O'quvchilar soni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.students_by_class.map((stat, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{stat.class_name}</TableCell>
                  <TableCell className="text-right font-bold">{stat.count}</TableCell>
                </TableRow>
              ))}
              {stats.students_by_class.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-6">Ma'lumot topilmadi</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  const [myClass, setMyClass] = useState<{ class_name: string; students: Array<{ full_name: string; phone_number?: string; login: string }> } | null>(null);
  const [subjects, setSubjects] = useState<TeacherSubjectEntry[]>([]);
  const [registeredSubjects, setRegisteredSubjects] = useState<string[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);

  useEffect(() => {
    if (!user) return;
    const teacherId = user.id;

    void (async () => {
      try {
        const [subjectsRes, timetableRes, classesRes, myClassRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/teacher-subjects?teacher_id=${teacherId}`, { headers: authHeaders() }),
          fetch(`${API_BASE}/timetable?teacher_id=${teacherId}`, { headers: authHeaders() }),
          fetch(`${API_BASE}/classes`, { headers: authHeaders() }),
          user.class_id
            ? fetch(`${API_BASE}/dashboard/my-class`, { headers: authHeaders() })
            : Promise.resolve(null),
          fetch(`${API_BASE}/staff/${teacherId}`, { headers: authHeaders() }),
        ]);

        const allClasses: Array<{ id: string; name: string }> = classesRes.ok
          ? await classesRes.json() as Array<{ id: string; name: string }>
          : [];

        if (subjectsRes.ok) {
          const data = await subjectsRes.json() as (TeacherSubjectEntry & { class_id: string })[];
          const enriched: TeacherSubjectEntry[] = data.map(row => ({
            ...row,
            class_name: allClasses.find(c => c.id === row.class_id)?.name ?? null,
          }));
          setSubjects(enriched);
        }

        if (timetableRes.ok) {
          const data = await timetableRes.json() as TimetableEntry[];
          setTimetable(data);
        }

        if (myClassRes?.ok) {
          const data = await myClassRes.json() as { class_name: string; students: Array<{ full_name: string; phone_number?: string; login: string }> };
          if (data.class_name) setMyClass(data);
        }

        if (profileRes.ok) {
          const profile = await profileRes.json() as { subjects?: string[] | null };
          if (Array.isArray(profile.subjects) && profile.subjects.length > 0) {
            setRegisteredSubjects(profile.subjects);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const todayEntries = timetable.filter(e => e.day_of_week === selectedDay).sort((a, b) => a.period - b.period);

  return (
    <div className="space-y-6">
      {myClass && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rahbarlik sinfim</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myClass.class_name}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">O'quvchilar soni</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myClass.students.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {registeredSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Mening fanlarim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {registeredSubjects.map(s => (
                <span key={s} className="inline-flex items-center px-3 py-1.5 rounded-md border bg-blue-50 border-blue-200 text-blue-800 text-sm font-medium">
                  📚 {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Sinflarga biriktirilgan fanlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <div key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-card text-sm">
                  <span className="font-medium">{s.subject}</span>
                  {s.class_name && <Badge variant="secondary" className="text-xs">{s.class_name}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Mening dars jadvalim
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(DAY_NAMES).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setSelectedDay(Number(id))}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selectedDay === Number(id) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">Bu kun dars yo'q</p>
          ) : (
            <div className="space-y-2">
              {todayEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 rounded-lg border px-4 py-3 bg-card">
                  <div className="text-center min-w-[2rem]">
                    <div className="text-lg font-bold text-primary">{entry.period}</div>
                    <div className="text-xs text-muted-foreground">dars</div>
                  </div>
                  <div className="border-l pl-4">
                    <div className="font-medium">{entry.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {PERIOD_TIMES[entry.period]} {entry.class_name ? `· ${entry.class_name} sinf` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {myClass && myClass.students.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sinf o'quvchilari</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>F.I.O</TableHead>
                  <TableHead>Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myClass.students.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{s.login}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CountdownBanner() {
  const { days, hours, minutes, seconds, ended } = useCountdown(SCHOOL_YEAR_START);
  if (ended) return (
    <Card className="border-primary bg-primary/5">
      <CardContent className="py-4 text-center">
        <p className="text-lg font-bold text-primary">🎓 2026-2027 o'quv yili boshlandi!</p>
      </CardContent>
    </Card>
  );
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-primary">2026-2027 o'quv yili boshlanishiga qoldi</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[{ value: days, label: "Kun" }, { value: hours, label: "Soat" }, { value: minutes, label: "Daqiqa" }, { value: seconds, label: "Soniya" }].map(({ value, label }) => (
            <div key={label} className="bg-background rounded-lg border border-primary/20 py-3">
              <div className="text-2xl font-bold text-primary tabular-nums">{String(value).padStart(2, "0")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type Grade = { id: string; subject: string; grade: number; comment: string; teacher_name: string; created_at: string };

const GRADE_COLORS: Record<number, string> = {
  5: "bg-green-100 text-green-700 border-green-200",
  4: "bg-blue-100 text-blue-700 border-blue-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  2: "bg-red-100 text-red-700 border-red-200",
  1: "bg-gray-100 text-gray-700 border-gray-200",
};

function StudentGradesWidget({ login }: { login: string }) {
  const { data: grades, isLoading } = useQuery<Grade[]>({
    queryKey: ["student-grades-widget", login],
    queryFn: async () => {
      const t = localStorage.getItem("talim_auth_token");
      const r = await fetch(`${API_BASE}/grades`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
      if (!r.ok) return [];
      return r.json() as Promise<Grade[]>;
    },
    staleTime: 60_000,
  });

  const recent = (grades ?? []).slice(0, 5);
  const avg = recent.length > 0 ? (recent.reduce((s, g) => s + g.grade, 0) / recent.length).toFixed(1) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="w-4 h-4" />
          Oxirgi baholar
          {avg && (
            <span className="ml-auto text-xs font-medium text-muted-foreground">
              O'rtacha: <span className="font-bold text-primary">{avg}</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : recent.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">Hali baho yo'q</p>
        ) : (
          <div className="space-y-2">
            {recent.map(g => (
              <div key={g.id} className="flex items-center gap-3">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border shrink-0 ${GRADE_COLORS[g.grade] ?? ""}`}>
                  {g.grade}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{g.subject}</div>
                  <div className="text-xs text-muted-foreground">{g.teacher_name} · {new Date(g.created_at).toLocaleDateString("uz-UZ")}</div>
                </div>
              </div>
            ))}
            <Link href="/baholash" className="block text-center text-xs text-primary hover:underline mt-2 pt-2 border-t">
              Barcha baholar →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [sinfRahbari, setSinfRahbari] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);

  const loadData = useCallback(async () => {
    if (!user?.class_id) { setLoading(false); return; }
    const classId = user.class_id;
    try {
      const [classesRes, timetableRes] = await Promise.all([
        fetch(`${API_BASE}/classes`, { headers: authHeaders() }),
        fetch(`${API_BASE}/timetable?class_id=${classId}`, { headers: authHeaders() }),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json() as Array<{ id: string; teacher_name: string | null }>;
        const myClass = classesData.find(c => c.id === classId);
        setSinfRahbari(myClass?.teacher_name ?? null);
      }
      if (timetableRes.ok) {
        const data = await timetableRes.json() as TimetableEntry[];
        setTimetable(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user?.class_id]);

  useEffect(() => { void loadData(); }, [loadData]);
  if (!user) return null;

  const dayEntries = timetable.filter(e => e.day_of_week === selectedDay).sort((a, b) => a.period - b.period);

  return (
    <div className="space-y-4">
      <CountdownBanner />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Shaxsiy ma'lumotlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">F.I.O</p>
              <p className="font-medium mt-1">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sinf</p>
              <p className="font-medium mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  {user.class_name || "Biriktirilmagan"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Login</p>
              <p className="font-mono font-medium mt-1">{user.login}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sinf rahbari</p>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary mt-1" />
              ) : sinfRahbari ? (
                <p className="font-medium mt-1 text-primary">{sinfRahbari}</p>
              ) : (
                <p className="text-muted-foreground text-sm mt-1 italic">Biriktirilmagan</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Dars jadvali
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(DAY_NAMES).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setSelectedDay(Number(id))}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selectedDay === Number(id) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : timetable.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Dars jadvali hali kiritilmagan</p>
          ) : dayEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Bu kun dars yo'q</p>
          ) : (
            <div className="space-y-2">
              {dayEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 rounded-lg border px-4 py-3 bg-card">
                  <div className="text-center min-w-[2rem]">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {user.login && <StudentGradesWidget login={user.login} />}
    </div>
  );
}
