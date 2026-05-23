import { useState } from "react";
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
import { Loader2, Plus, Search, Trash2, UserPlus } from "lucide-react";
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
  DialogTrigger,
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

  const { data: classes, isLoading } = useListClasses({
    query: {
      queryKey: getListClassesQueryKey()
    }
  });

  const { data: staff } = useListStaff({
    query: {
      queryKey: getListStaffQueryKey()
    }
  });

  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();
  const assignMutation = useAssignTeacher();

  const isAdmin = user?.role === "admin";

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
        onError: () => {
          toast({ variant: "destructive", title: "Xatolik", description: "Xatolik yuz berdi" });
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
          toast({ title: "Muvaffaqiyatli", description: "O'qituvchi biriktirildi" });
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

  const filteredClasses = classes?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const availableTeachers = staff?.filter(s => s.role === "teacher");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sinflar</h1>
          <p className="text-muted-foreground mt-1">Barcha sinflar va rahbarlar ro'yxati</p>
        </div>
        
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yangi sinf
              </Button>
            </DialogTrigger>
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
              {isAdmin && <TableHead className="w-[120px]"></TableHead>}
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
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
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

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sinf rahbari biriktirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>O'qituvchini tanlang</Label>
              <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
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
    </div>
  );
}
