import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const TOKEN_KEY = "talim_auth_token";
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Tarix", "Geografiya", "Biologiya", "Fizika", "Kimyo",
  "Informatika", "Jismoniy tarbiya", "Musiqa", "Tasviriy san'at",
  "Texnologiya", "Boshqa",
];

type ClassItem = { id: string; name: string };

export default function NewDarslikPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const isTeacherRole = user?.role === "teacher" || user?.role === "sinf_rahbari";
  // O'qituvchi/sinf rahbari o'z fanlarini ko'radi, boshqalar umumiy ro'yxatni
  const mySubjects: string[] = (user as { subjects?: string[] } | null)?.subjects ?? [];
  const subjectList = isTeacherRole && mySubjects.length > 0 ? mySubjects : SUBJECTS;

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [className, setClassName] = useState(user?.class_name ?? "");

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, subject, description, content, class_name: className }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Xatolik yuz berdi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast({ title: "Darslik muvaffaqiyatli qo'shildi!" });
      setLocation("/darslik");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject || !className) {
      toast({ title: "Barcha majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/darslik">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Yangi darslik qo'shish
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">O'quvchilar uchun darslik materialni kiriting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Darslik ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Darslik nomi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Masalan: Kasrlar qo'shish va ayirish"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Fan <span className="text-destructive">*</span>
                </Label>
                <Select value={subjectList.includes(subject) ? subject : ""} onValueChange={(val) => setSubject(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={isTeacherRole && mySubjects.length > 0 ? "Fanlaringizdan tanlang..." : "Tez tanlash..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectList.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!isTeacherRole || mySubjects.length === 0) && (
                  <Input
                    placeholder="Yoki fan nomini o'zingiz yozing..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Sinf <span className="text-destructive">*</span>
                </Label>
                {user?.role === "teacher" || user?.role === "sinf_rahbari" ? (
                  <Input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Masalan: 5A"
                  />
                ) : (
                  <Select value={className} onValueChange={setClassName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sinf tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Qisqa tavsif</Label>
              <Input
                id="description"
                placeholder="Darslik haqida qisqa ma'lumot..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Darslik matni</Label>
              <Textarea
                id="content"
                placeholder="Darslik mazmuni, tushuntirish, misollar..."
                className="min-h-[160px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/darslik">Bekor qilish</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
