import { useAuth } from "@/lib/use-auth";
import { useState, useEffect } from "react";
import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetMyClass,
  getGetMyClassQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, GraduationCap, CalendarDays, Loader2, Clock, BookOpen, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// 2026-2027 o'quv yili boshlanishi: 2 Sentabr 2026
const SCHOOL_YEAR_START = new Date("2026-09-02T08:00:00");

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = target.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      const diff = target.getTime() - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [target, timeLeft]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, ended: timeLeft <= 0 };
}

interface TeacherSubject {
  id: string;
  subject: string;
  teacher_name?: string | null;
}

interface SinfRahbari {
  id: string;
  full_name: string;
}

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdminOrDir = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const isTeacher = user.role === "teacher" || user.role === "sinf_rahbari";
  const isStudent = user.role === "student";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
        <p className="text-muted-foreground mt-1">Xush kelibsiz, {user.full_name}</p>
      </div>

      {isAdminOrDir && <AdminDashboard />}
      {isTeacher && <TeacherDashboard />}
      {isStudent && <StudentDashboard />}
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats({
    query: {
      queryKey: getGetDashboardStatsQueryKey(),
      retry: 2,
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
        <p>Statistikani yuklashda xatolik yuz berdi.</p>
        <button
          onClick={() => refetch()}
          className="text-primary underline text-sm"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami O'quvchilar</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_students}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami Sinflar</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_classes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xodimlar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_staff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">O'quv yili boshlanishiga</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.days_until_launch} kun</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sinflar bo'yicha statistika</CardTitle>
        </CardHeader>
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
                  <TableCell className="text-right">{stat.count}</TableCell>
                </TableRow>
              ))}
              {stats.students_by_class.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                    Ma'lumot topilmadi
                  </TableCell>
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
  const { data: myClass, isLoading } = useGetMyClass({
    query: {
      queryKey: getGetMyClassQueryKey()
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!myClass) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Sizga hozircha sinf biriktirilmagan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sinfingiz</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Sinf o'quvchilari ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.O</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myClass.students.map((student) => (
                <TableRow key={student.telegram_id}>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell>{student.phone_number}</TableCell>
                  <TableCell>{student.login}</TableCell>
                </TableRow>
              ))}
              {myClass.students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    O'quvchilar topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CountdownBanner() {
  const { days, hours, minutes, seconds, ended } = useCountdown(SCHOOL_YEAR_START);

  if (ended) {
    return (
      <Card className="border-primary bg-primary/5">
        <CardContent className="py-4 text-center">
          <p className="text-lg font-bold text-primary">🎓 2026-2027 o'quv yili boshlandi!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-primary">2026-2027 o'quv yili boshlanishiga qoldi</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: days, label: "Kun" },
            { value: hours, label: "Soat" },
            { value: minutes, label: "Daqiqa" },
            { value: seconds, label: "Soniya" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-background rounded-lg border border-primary/20 py-3">
              <div className="text-2xl font-bold text-primary tabular-nums">
                {String(value).padStart(2, "0")}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          2 Sentabr 2026 — yangi o'quv yili boshlanadi
        </p>
      </CardContent>
    </Card>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [sinfRahbari, setSinfRahbari] = useState<SinfRahbari | null>(null);
  const [darsJadvali, setDarsJadvali] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.class_id) {
      setLoading(false);
      return;
    }

    const classId = user.class_id;

    void (async () => {
      try {
        const [staffRes, subjectsRes] = await Promise.all([
          fetch(`${API_BASE}/staff`, { credentials: "include" }),
          fetch(`${API_BASE}/teacher-subjects?class_id=${classId}`, { credentials: "include" }),
        ]);

        if (staffRes.ok) {
          const staffData = await staffRes.json() as Array<{
            id: string;
            full_name: string;
            role: string;
            class_id?: string | null;
          }>;
          const rahbar = staffData.find(
            s => s.role === "sinf_rahbari" && s.class_id === classId
          );
          setSinfRahbari(rahbar ? { id: rahbar.id, full_name: rahbar.full_name } : null);
        }

        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json() as TeacherSubject[];
          setDarsJadvali(subjectsData);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, [user?.class_id]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Teskari sanoq */}
      <CountdownBanner />

      {/* Shaxsiy ma'lumotlar */}
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
                <p className="font-medium mt-1 text-primary">{sinfRahbari.full_name}</p>
              ) : (
                <p className="text-muted-foreground text-sm mt-1 italic">Biriktirilmagan</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dars jadvali */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Dars jadvali
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : darsJadvali.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Dars jadvali hali kiritilmagan
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fan</TableHead>
                  <TableHead>O'qituvchi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {darsJadvali.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell className="font-medium">{item.subject}</TableCell>
                    <TableCell>{item.teacher_name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
