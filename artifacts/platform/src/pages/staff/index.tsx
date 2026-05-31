import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import {
  useListStaff,
  getListStaffQueryKey,
  useDeleteStaff,
  useUpdateStaff,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Trash2, Pencil, BookOpen, Filter, Users } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

const roleDisplay: Record<string, string> = {
  admin: "Admin",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  sinf_rahbari: "Sinf rahbari",
  teacher: "O'qituvchi",
  kutubxonachi: "Kutubxonachi",
};

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  class_name?: string | null;
  login: string;
  password: string;
  subjects?: string[] | null;
  can_teach?: boolean;
};

function EditStaffDialog({
  member,
  open,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const updateMutation = useUpdateStaff();
  const [fullName, setFullName] = useState(member.full_name);
  const [login, setLogin] = useState(member.login);
  const [password, setPassword] = useState(member.password);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    if (!fullName.trim() || !login.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha maydonlarni to'ldiring" });
      return;
    }
    setIsLoading(true);
    updateMutation.mutate(
      {
        id: member.id,
        data: {
          full_name: fullName.trim(),
          login: login.trim(),
          password: password.trim(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Saqlandi", description: `${fullName} ma'lumotlari yangilandi` });
          onSaved();
          onClose();
        },
        onError: () => {
          toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda xatolik yuz berdi" });
        },
        onSettled: () => setIsLoading(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xodim ma'lumotlarini tahrirlash</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Ism Familiya</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ism Familiya" />
          </div>
          <div className="space-y-1.5">
            <Label>Login</Label>
            <Input value={login} onChange={e => setLogin(e.target.value)} placeholder="login123" />
          </div>
          <div className="space-y-1.5">
            <Label>Parol</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Parol" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { data: staff, isLoading } = useListStaff({
    query: { queryKey: getListStaffQueryKey() }
  });

  const deleteMutation = useDeleteStaff();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Muvaffaqiyatli", description: "Xodim o'chirildi" });
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik yuz berdi" });
        },
      }
    );
  };

  const handleToggleCanTeach = async (member: StaffMember) => {
    setTogglingId(member.id);
    try {
      const res = await fetch(`${API_BASE}/staff/${member.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ can_teach: !member.can_teach }),
      });
      if (res.ok) {
        toast({
          title: !member.can_teach ? "Dars o'tish faollashtirildi" : "Dars o'tish o'chirildi",
          description: `${member.full_name} uchun dars jadvali ${!member.can_teach ? "yoqildi" : "o'chirildi"}`,
        });
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      } else {
        const d = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: d.error ?? "Yangilashda xatolik" });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setTogglingId(null);
  };

  const isAdmin = user?.role === "admin";

  // Barcha fanlar ro'yxatini yig'ish (o'qituvchilarning subjects dan)
  const allSubjects = Array.from(new Set(
    (staff ?? [])
      .flatMap((s) => (s as StaffMember).subjects ?? [])
      .filter(Boolean)
  )).sort();

  const filteredStaff = (staff ?? []).filter(s => {
    const nameMatch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (roleDisplay[s.role] || "").toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    if (filterSubject === "all") return true;
    return ((s as StaffMember).subjects ?? []).includes(filterSubject);
  });

  const managementRoles = ["director", "zam_direktor", "zavuch"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xodimlar</h1>
          <p className="text-muted-foreground mt-1">Maktab xodimlari ro'yxati</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/staff/bulk-new">
                <Users className="w-4 h-4 mr-2" />
                Ommaviy qo'shish
              </Link>
            </Button>
            <Button asChild>
              <Link href="/staff/new">
                <Plus className="w-4 h-4 mr-2" />
                Yangi xodim
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Izlash (ism, lavozim)..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {allSubjects.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Fan bo'yicha filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha fanlar</SelectItem>
                {allSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>F.I.O</TableHead>
              <TableHead>Lavozim</TableHead>
              <TableHead>Fanlar</TableHead>
              <TableHead>Biriktirilgan sinf</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Parol</TableHead>
              {isAdmin && <TableHead className="w-[130px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredStaff?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  Ma'lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              (filteredStaff as StaffMember[])?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div>{member.full_name}</div>
                    {managementRoles.includes(member.role) && member.can_teach && (
                      <Badge variant="outline" className="mt-0.5 text-xs border-green-400 text-green-700 bg-green-50">
                        Dars o'tadi
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border">
                      {roleDisplay[member.role] || member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(member.role === "teacher" || member.role === "sinf_rahbari") && (member.subjects ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(member.subjects ?? []).map(s => (
                          <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">-</span>
                    )}
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
                        <div className="flex items-center gap-1 flex-wrap">
                          {managementRoles.includes(member.role) && (
                            <Button
                              variant={member.can_teach ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-7 px-2 ${member.can_teach ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-400 text-green-700 hover:bg-green-50"}`}
                              disabled={togglingId === member.id}
                              onClick={() => void handleToggleCanTeach(member)}
                              title="Dars o'tish ruxsatini boshqarish"
                            >
                              {togglingId === member.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : member.can_teach ? "✓ Dars o'tadi" : "Dars o'tish"
                              }
                            </Button>
                          )}
                          {(member.role === "teacher" || member.role === "sinf_rahbari") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                              onClick={() => setLocation(`/staff/${member.id}/subjects`)}
                              title="Fanlarni boshqarish"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                            onClick={() => setEditMember(member)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
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
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editMember && (
        <EditStaffDialog
          member={editMember}
          open={!!editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() })}
        />
      )}
    </div>
  );
}
