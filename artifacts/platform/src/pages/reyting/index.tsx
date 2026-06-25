import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Star, Users, BookOpen, TrendingUp } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface StudentRank {
  rank: number; student_login: string; student_name: string;
  class_name: string; avg_grade: number; total_grades: number; fives: number;
}

interface ClassRank {
  rank: number; class_name: string; avg_grade: number;
  total_grades: number; fives: number; student_count: number;
}

interface SubjectStar {
  subject: string; student_login: string; student_name: string;
  class_name: string; avg_grade: number; total_grades: number;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const GRADE_COLOR = (g: number) => {
  if (g >= 4.5) return "text-green-600 dark:text-green-400";
  if (g >= 3.5) return "text-blue-600 dark:text-blue-400";
  if (g >= 2.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

type Tab = "students" | "classes" | "subjects";

export default function ReytingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("students");

  const { data: students = [], isLoading: loadingS } = useQuery<StudentRank[]>({
    queryKey: ["reyting-students"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/reyting/students`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<StudentRank[]>;
    },
    staleTime: 5 * 60_000,
    enabled: tab === "students",
  });

  const { data: classes = [], isLoading: loadingC } = useQuery<ClassRank[]>({
    queryKey: ["reyting-classes"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/reyting/classes`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ClassRank[]>;
    },
    staleTime: 5 * 60_000,
    enabled: tab === "classes",
  });

  const { data: subjects = [], isLoading: loadingSub } = useQuery<SubjectStar[]>({
    queryKey: ["reyting-subjects"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/reyting/subjects`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<SubjectStar[]>;
    },
    staleTime: 5 * 60_000,
    enabled: tab === "subjects",
  });

  const myLogin = user?.login;
  const isLoading = (tab === "students" && loadingS) || (tab === "classes" && loadingC) || (tab === "subjects" && loadingSub);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "students", label: "O'quvchilar", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "classes",  label: "Sinflar",     icon: <Users className="w-3.5 h-3.5" /> },
    { id: "subjects", label: "Fan yulduzlari", icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Haftalik Reyting</h1>
          <p className="text-sm text-muted-foreground">Oxirgi 7 kun natijalariga ko'ra</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tab === "students" ? (
        <div className="space-y-2">
          {students.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Bu hafta hali baho kiritilmagan
            </CardContent></Card>
          ) : students.map(s => (
            <Card
              key={s.student_login}
              className={`transition-all ${s.student_login === myLogin ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : ""}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {MEDAL[s.rank] ? (
                      <span className="text-xl">{MEDAL[s.rank]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground tabular-nums">{s.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm truncate ${s.student_login === myLogin ? "text-primary" : ""}`}>
                        {s.student_name}
                        {s.student_login === myLogin && <span className="text-[10px] text-primary ml-1">(Sen)</span>}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.class_name} · {s.total_grades} ta baho</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${GRADE_COLOR(s.avg_grade)}`}>
                      {s.avg_grade.toFixed(1)}
                    </p>
                    {s.fives > 0 && (
                      <p className="text-[10px] text-muted-foreground">⭐ {s.fives} ta besh</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "classes" ? (
        <div className="space-y-2">
          {classes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Bu hafta hali baho kiritilmagan
            </CardContent></Card>
          ) : classes.map(c => (
            <Card key={c.class_name}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {MEDAL[c.rank] ? (
                      <span className="text-xl">{MEDAL[c.rank]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{c.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{c.class_name} sinf</p>
                    <p className="text-xs text-muted-foreground">
                      {c.student_count} o'quvchi · {c.total_grades} ta baho · ⭐ {c.fives} ta besh
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${GRADE_COLOR(c.avg_grade)}`}>
                      {c.avg_grade.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">o'rtacha</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Subject stars */
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">Oxirgi 30 kun · Har fandan eng yuqori o'rtacha baho</p>
          {subjects.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Hali ma'lumot yo'q
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {subjects.map(s => (
                <Card key={s.subject} className={s.student_login === myLogin ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.subject}</Badge>
                          {s.student_login === myLogin && (
                            <span className="text-[10px] text-primary font-medium">Sen! 🎉</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold mt-0.5">{s.student_name}</p>
                        <p className="text-xs text-muted-foreground">{s.class_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">⭐ {s.avg_grade.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
