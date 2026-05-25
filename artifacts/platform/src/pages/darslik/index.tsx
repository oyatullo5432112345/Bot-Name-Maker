import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const TOKEN_KEY = "talim_auth_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

type Lesson = {
  id: string;
  title: string;
  subject: string;
  description: string;
  content: string;
  class_name: string;
  teacher_name: string;
  teacher_login: string;
  created_at: string;
};

const GRADE_COLORS: Record<string, string> = {
  "Matematika": "bg-blue-100 text-blue-700",
  "Ona tili": "bg-green-100 text-green-700",
  "Ingliz tili": "bg-yellow-100 text-yellow-700",
  "Tarix": "bg-purple-100 text-purple-700",
  "Biologiya": "bg-emerald-100 text-emerald-700",
  "Fizika": "bg-orange-100 text-orange-700",
  "Kimyo": "bg-red-100 text-red-700",
  "Geografiya": "bg-teal-100 text-teal-700",
};

function subjectColor(subject: string) {
  return GRADE_COLORS[subject] ?? "bg-gray-100 text-gray-700";
}

export default function DarslikPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isTeacherOrAdmin = user && ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"].includes(user.role);
  const isStudent = user?.role === "student";

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/lessons`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/lessons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast({ title: "Darslik o'chirildi" });
    },
    onError: () => {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    },
  });

  const filtered = lessons.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.subject.toLowerCase().includes(search.toLowerCase()) ||
    l.class_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Darslik
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isStudent ? "O'z sinfingiz darsliklari" : "Barcha darsliklar ro'yxati"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button asChild>
            <Link href="/darslik/new">
              <Plus className="w-4 h-4 mr-2" />
              Darslik qo'shish
            </Link>
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Darslik nomi, fan yoki sinf bo'yicha qidirish..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <BookOpen className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">
            {search ? "Qidiruv bo'yicha darslik topilmadi" : "Hozircha darslik yo'q"}
          </p>
          {isTeacherOrAdmin && !search && (
            <Button asChild variant="outline" size="sm">
              <Link href="/darslik/new">
                <Plus className="w-4 h-4 mr-1" />
                Birinchi darslikni qo'shing
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((lesson) => {
            const isExpanded = expandedId === lesson.id;
            const canDelete =
              isTeacherOrAdmin &&
              (user?.role === "admin" || user?.role === "director" || lesson.teacher_login === user?.login);
            return (
              <Card key={lesson.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{lesson.title}</CardTitle>
                      <CardDescription className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className={subjectColor(lesson.subject)}>
                          {lesson.subject}
                        </Badge>
                        <Badge variant="outline">{lesson.class_name} sinf</Badge>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {lesson.description && (
                  <CardContent className="pt-0 pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                  </CardContent>
                )}
                {isExpanded && lesson.content && (
                  <CardContent className="pt-0 border-t mt-2">
                    <p className="text-sm whitespace-pre-wrap">{lesson.content}</p>
                  </CardContent>
                )}
                <CardContent className="pt-1 pb-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {lesson.teacher_name} • {new Date(lesson.created_at).toLocaleDateString("uz-UZ")}
                  </span>
                  {lesson.content && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isExpanded ? "Yopish" : "Ko'rish"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
