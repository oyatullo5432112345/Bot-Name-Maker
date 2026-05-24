import { useAuth } from "@/lib/use-auth";
import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetMyClass,
  getGetMyClassQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, GraduationCap, CalendarDays, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdminOrDir = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const isTeacher = user.role === "teacher";
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

function StudentDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">F.I.O</p>
              <p className="font-medium mt-1">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sinf</p>
              <p className="font-medium mt-1">{user.class_name || "Biriktirilmagan"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Login</p>
              <p className="font-medium mt-1">{user.login}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rol</p>
              <p className="font-medium mt-1">O'quvchi</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
