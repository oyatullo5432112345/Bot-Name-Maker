import { useState, useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { 
  useListClasses, 
  getListClassesQueryKey,
  useCreateClass,
  useDeleteClass,
  useAssignTeacher,
  useListStaff,
  getListStaffQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, Trash2, UserPlus, BookOpen, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const TOKEN_KEY = "talim_auth_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface TeacherSubject {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  teacher_name?: string | null;
  teacher_role?: string | null;
}

export default function ClassesList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");

  // Fan biriktirish
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [subjectsClassId, setSubjectsClassId] = useState("");
  const [subjectsClassName, setSubjectsClassName] = useState("");
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  const { data: classes, isLoading } = useListClasses({
    query: { queryKey: getListClassesQueryKey() }
  });

  const { data: staff } = useListStaff({
    query: { queryKey: getListStaffQueryKey() }
  });

  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();
  const assignMutation = useAssignTeacher();

  const isAdmin = user?.role === "admin";

  // Sinf rahbarlari: barcha xodimlar sinf rahbari bo'la oladi
  const sinfRahbarlari = staff;
  // O'qituvchilar: barcha xodimlar dars bera oladi (masul shaxslar ham)
  const oqituvchilar = staff;

  const handleCreate = () => {
    if (!newClassName.trim()) return;
    createMutation.mutate(
      { data: { name: newClassName } },
      {
        onSuccess: () => {
          toast({ title: "Muvaffaqiyatli", description: "Yangi sinf qo'shildi" });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
          setCreateOpen(false);
          setNewClassName("");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ variant: "destructive", title: "Xatolik", description: msg || "Xatolik yuz berdi" });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Muvaffaqiyatli", description: "Sinf o'chirildi" });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik yuz berdi" });
        }
      }
    );
  };

  const handleAssign = () => {
    if (!assignClassId || !assignTeacherId) return;
    assignMutation.mutate(
      { id: assignClassId, data: { staff_id: assignTeacherId } },
      {
        onSuccess: () => {
          toast({ title: "Muvaffaqiyatli", description: "Sinf rahbari biriktirildi" });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
          setAssignOpen(false);
          setAssignClassId("");
          setAssignTeacherId("");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Xatolik", description: "Xatolik yuz berdi" });
        }
      }
    );
  };

  // Fan biriktirish - load
  const loadTeacherSubjects = async (classId: string) => {
    setSubjectsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-subjects?class_id=${classId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as TeacherSubject[];
        setTeacherSubjects(data);
      }
    } catch {
      // ignore
    }
    setSubjectsLoading(false);
  };

  useEffect(() => {
    if (subjectsOpen && subjectsClassId) {
      void loadTeacherSubjects(subjectsClassId);
    }
  }, [subjectsOpen, subjectsClassId]);

  const handleAddSubject = async () => {
    if (!newSubjectTeacherId || !newSubjectName.trim()) return;
    setAddingSubject(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-subjects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          teacher_id: newSubjectTeacherId,
          class_id: subjectsClassId,
          subject: newSubjectName.trim(),
        }),
      });
      if (res.ok) {
        toast({ title: "Muvaffaqiyatli", description: "Fan biriktirildi" });
        setNewSubjectTeacherId("");
        setNewSubjectName("");
        await loadTeacherSubjects(subjectsClassId);
      } else {
        const d = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: d.error || "Xatolik yuz berdi" });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setAddingSubject(false);
  };

  const handleRemoveSubject = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/teacher-subjects/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast({ title: "O'chirildi", description: "Fan o'chirildi" });
        await loadTeacherSubjects(subjectsClassId);
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik" });
    }
  };

  const filteredClasses = classes?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const COMMON_SUBJECTS = [
    "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
    "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
    "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
    "Texnologiya", "Astronomiya"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sinflar</h1>
          <p className="text-muted-foreground mt-1">Barcha sinflar va rahbarlar ro'yxati</p>
        </div>
        
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yangi sinf
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi sinf qo'shish</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sinf nomi</Label>
                  <Input 
                    placeholder="Masalan: 10-A" 
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newClassName.trim()}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Saqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Izlash..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sinf nomi</TableHead>
              <TableHead>Sinf rahbari</TableHead>
              <TableHead>O'quvchilar soni</TableHead>
              {isAdmin && <TableHead className="w-[140px] text-right pr-4">Amallar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredClasses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center text-muted-foreground">
                  Ma'lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              filteredClasses?.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                      {cls.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {cls.teacher_name ? (
                      <span className="font-medium">{cls.teacher_name}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Biriktirilmagan</span>
                    )}
                  </TableCell>
                  <TableCell>{cls.student_count || 0}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title="Fanlar va o'qituvchilar"
                          onClick={() => {
                            setSubjectsClassId(cls.id);
                            setSubjectsClassName(cls.name);
                            setSubjectsOpen(true);
                          }}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title="Sinf rahbari biriktirish"
                          onClick={() => {
                            setAssignClassId(cls.id);
                            setAssignOpen(true);
                          }}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Haqiqatan ham o'chirmoqchimisiz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu amalni ortga qaytarib bo'lmaydi. {cls.name} sinfi tizimdan o'chiriladi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(cls.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sinf rahbari biriktirish */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sinf rahbari biriktirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sinf rahbarini tanlang</Label>
              <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {sinfRahbarlari?.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                      {t.role === "sinf_rahbari" ? " (Sinf rahbari)" : " (O'qituvchi)"}
                    </SelectItem>
                  ))}
                  {(!sinfRahbarlari || sinfRahbarlari.length === 0) && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      Xodimlar topilmadi
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending || !assignTeacherId}>
              {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fanlar va o'qituvchilar dialogi */}
      <Dialog open={subjectsOpen} onOpenChange={(open) => {
        setSubjectsOpen(open);
        if (!open) {
          setNewSubjectTeacherId("");
          setNewSubjectName("");
          setTeacherSubjects([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{subjectsClassName} — Fanlar va o'qituvchilar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Yangi fan qo'shish */}
            {isAdmin && (
              <div className="border rounded-md p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-medium">Yangi fan biriktirish</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">O'qituvchi</Label>
                    <Select value={newSubjectTeacherId} onValueChange={setNewSubjectTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="O'qituvchi tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {oqituvchilar?.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name}
                            {t.role === "sinf_rahbari" && " (Sinf rahbari)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fan nomi</Label>
                    <Select value={newSubjectName} onValueChange={setNewSubjectName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fanni tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_SUBJECTS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yoki boshqa fan nomi kiriting..."
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddSubject}
                    disabled={addingSubject || !newSubjectTeacherId || !newSubjectName.trim()}
                  >
                    {addingSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Fan ro'yxati */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {subjectsLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                </div>
              ) : teacherSubjects.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Hali fanlar biriktirilmagan
                </div>
              ) : (
                teacherSubjects.map(ts => (
                  <div key={ts.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                    <div>
                      <span className="font-medium text-sm">{ts.subject}</span>
                      <span className="text-muted-foreground text-xs ml-2">— {ts.teacher_name}</span>
                      {ts.teacher_role === "sinf_rahbari" && (
                        <span className="ml-1 text-xs text-primary">(Sinf rahbari)</span>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => void handleRemoveSubject(ts.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectsOpen(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
