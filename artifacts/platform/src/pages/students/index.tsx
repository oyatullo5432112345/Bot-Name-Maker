import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { 
  useListStudents, 
  getListStudentsQueryKey,
  useDeleteStudent
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
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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

export default function StudentsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  const isSinfRahbari = user?.role === "sinf_rahbari";
  const classFilter = isSinfRahbari && user?.class_name ? { class_name: user.class_name } : {};

  const { data: students, isLoading } = useListStudents(classFilter, {
    query: {
      queryKey: getListStudentsQueryKey(classFilter)
    }
  });

  const deleteMutation = useDeleteStudent();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Muvaffaqiyatli",
            description: "O'quvchi o'chirildi",
          });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey({}) });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Xatolik",
            description: "O'chirishda xatolik yuz berdi",
          });
        }
      }
    );
  };

  const isAdmin = user?.role === "admin";

  const filteredStudents = students?.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.class_name.toLowerCase().includes(search.toLowerCase())
  );

  const pageTitle = isSinfRahbari && user?.class_name
    ? `${user.class_name} sinfi o'quvchilari`
    : "O'quvchilar";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {isSinfRahbari ? "Sinfingiz o'quvchilari ro'yxati" : "Barcha o'quvchilar ro'yxati"}
          </p>
        </div>
        
        {isAdmin && (
          <Button asChild>
            <Link href="/students/new">
              <Plus className="w-4 h-4 mr-2" />
              Yangi o'quvchi
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Izlash (ism, sinf)..."
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
              <TableHead>F.I.O</TableHead>
              <TableHead>Sinf</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Parol</TableHead>
              {isAdmin && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredStudents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  Ma'lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents?.map((student) => (
                <TableRow key={student.telegram_id}>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {student.class_name}
                    </span>
                  </TableCell>
                  <TableCell>{student.phone_number}</TableCell>
                  <TableCell className="font-mono text-sm">{student.login}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{student.password}</TableCell>
                  {isAdmin && (
                    <TableCell>
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
                              Bu amalni ortga qaytarib bo'lmaydi. {student.full_name} tizimdan o'chiriladi.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(student.telegram_id.toString())}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              O'chirish
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
