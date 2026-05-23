import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { 
  useListStaff, 
  getListStaffQueryKey,
  useDeleteStaff
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

const roleDisplay: Record<string, string> = {
  admin: "Admin",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  teacher: "O'qituvchi"
};

export default function StaffList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  const { data: staff, isLoading } = useListStaff({
    query: {
      queryKey: getListStaffQueryKey()
    }
  });

  const deleteMutation = useDeleteStaff();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Muvaffaqiyatli",
            description: "Xodim o'chirildi",
          });
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
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

  const filteredStaff = staff?.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (roleDisplay[s.role] || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xodimlar</h1>
          <p className="text-muted-foreground mt-1">Maktab xodimlari ro'yxati</p>
        </div>
        
        {isAdmin && (
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="w-4 h-4 mr-2" />
              Yangi xodim
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Izlash (ism, lavozim)..."
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
              <TableHead>Lavozim</TableHead>
              <TableHead>Biriktirilgan sinf</TableHead>
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
            ) : filteredStaff?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  Ma'lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border">
                      {roleDisplay[member.role] || member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {member.class_name ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {member.class_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.login}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{member.password}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {(member.role as string) !== "admin" && (
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
                                Bu amalni ortga qaytarib bo'lmaydi. {member.full_name} tizimdan o'chiriladi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(member.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
