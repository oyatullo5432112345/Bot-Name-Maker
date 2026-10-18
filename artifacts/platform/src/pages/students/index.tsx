import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/lib/use-auth";
import {
  useListStudents,
  getListStudentsQueryKey,
  useDeleteStudent
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/face";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Loader2, Plus, Search, Trash2, Users, CreditCard, Crown, ScanFace } from "lucide-react";
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
  const searchParams = new URLSearchParams(useSearch());
  const classFromUrl = searchParams.get("class");

  const isSinfRahbari = user?.role === "sinf_rahbari";
  const classFilter = classFromUrl
    ? { class_name: classFromUrl }
    : (isSinfRahbari && user?.class_name ? { class_name: user.class_name } : {});

  const { data: students, isLoading } = useListStudents(classFilter, {
    query: {
      queryKey: getListStudentsQueryKey(classFilter),
      staleTime: 15_000,
      refetchOnWindowFocus: true,
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
  // Direktor va rahbariyat ham o'z maktabiga o'quvchi qo'sha oladi
  const canManage = ["admin", "director", "zam_direktor", "zavuch"].includes(user?.role ?? "");

  // #3: sinf rahbari ham o'z sinfidagi o'quvchini butunlay o'chira oladi
  const canDelete = canManage || isSinfRahbari;

  // Sinf nomini tabiiy tartiblash: avval raqam (1..11), keyin harf (A, B...)
  const gradeNum = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };
  const classCmp = (a: string, b: string): number => { const ga = gradeNum(a), gb = gradeNum(b); return ga !== gb ? ga - gb : a.localeCompare(b, "uz"); };

  // #4/#5: rahbariyat va super-admin uchun qulay filtr (smena / bo'lim / sinf)
  const showFilters = !classFromUrl && !isSinfRahbari && canManage;
  const [isTwoShift, setIsTwoShift] = useState(false);
  const [smenaByClass, setSmenaByClass] = useState<Record<string, number | null>>({});
  const [classNames, setClassNames] = useState<string[]>([]);
  const [smenaSel, setSmenaSel] = useState("all");
  const [bolimSel, setBolimSel] = useState("all");
  const [classSel, setClassSel] = useState("all");
  useEffect(() => {
    if (!showFilters) return;
    void (async () => {
      try {
        const mine = await api<{ ikki_smena?: boolean }>("/maktablar/mine");
        setIsTwoShift(!!mine.ikki_smena);
        const rows = await api<{ name: string; smena: number | null }[]>("/classes/smenalar");
        const map: Record<string, number | null> = {};
        for (const r of rows) map[r.name] = r.smena;
        setSmenaByClass(map);
        setClassNames(rows.map((r) => r.name).sort(classCmp));
      } catch { /* jim */ }
    })();
  }, [showFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const classMatches = (cn: string): boolean => {
    if (classSel !== "all" && cn !== classSel) return false;
    if (bolimSel === "boshlangich" && !(gradeNum(cn) >= 1 && gradeNum(cn) <= 4)) return false;
    if (bolimSel === "yuqori" && gradeNum(cn) < 5) return false;
    if (smenaSel !== "all") { const sm = smenaByClass[cn]; if (sm != null && sm !== Number(smenaSel)) return false; }
    return true;
  };
  // tanlangan smena/bo'lim bo'yicha sinf ro'yxati (dropdown uchun)
  const classOptions = classNames.filter((cn) => {
    if (bolimSel === "boshlangich" && !(gradeNum(cn) >= 1 && gradeNum(cn) <= 4)) return false;
    if (bolimSel === "yuqori" && gradeNum(cn) < 5) return false;
    if (smenaSel !== "all") { const sm = smenaByClass[cn]; if (sm != null && sm !== Number(smenaSel)) return false; }
    return true;
  });

  const [grantingLogin, setGrantingLogin] = useState<string | null>(null);
  const getToken = () => localStorage.getItem("talim_auth_token");
  const handleGrantPro = async (login: string) => {
    setGrantingLogin(login);
    try {
      const t = getToken();
      const r = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/grant-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ login, is_student: true, months: 12 }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Xatolik", description: j.error ?? "Pro berishda xatolik" });
        return;
      }
      toast({ title: "Pro versiya berildi", description: "1 yillik Pro faollashtirildi" });
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey({}) });
    } finally {
      setGrantingLogin(null);
    }
  };

  // O'quvchi Face ID (yuz ma'lumoti) ni o'chirish — direktor/rahbariyat uchun
  const [fidBusy, setFidBusy] = useState<string | null>(null);
  const handleDeleteFaceId = async (login: string, name: string) => {
    if (!window.confirm(`${name} — Face ID (yuz ma'lumoti) o'chirilsinmi? O'quvchi qayta ro'yxatdan o'tishi mumkin.`)) return;
    setFidBusy(login);
    try {
      const t = getToken();
      const r = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/faceid/enroll/${encodeURIComponent(login)}`, {
        method: "DELETE",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (r.ok) toast({ title: "Face ID o'chirildi", description: name });
      else { const j = await r.json().catch(() => ({})); toast({ variant: "destructive", title: "Xatolik", description: (j as { error?: string }).error ?? "Face ID o'chirishda xatolik" }); }
    } finally { setFidBusy(null); }
  };

  const filteredStudents = (students ?? [])
    .filter((s) =>
      (s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.class_name.toLowerCase().includes(search.toLowerCase())) &&
      (!showFilters || classMatches(s.class_name))
    )
    .sort((a, b) => {
      const c = classCmp(a.class_name, b.class_name);
      return c !== 0 ? c : a.full_name.localeCompare(b.full_name, "uz");
    });

  const pageTitle = classFromUrl
    ? `${classFromUrl} sinfi o'quvchilari`
    : isSinfRahbari && user?.class_name
    ? `${user.class_name} sinfi o'quvchilari`
    : "O'quvchilar";

  return (
    <div className="space-y-6">
      {classFromUrl && (
        <Link href="/classes" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
          ← Sinflar ro'yxatiga qaytish
        </Link>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {classFromUrl ? `To'liq ro'yxatdan o'tgan o'quvchilarning ma'lumotlari` : isSinfRahbari ? "Sinfingiz o'quvchilari ro'yxati" : "Barcha o'quvchilar ro'yxati"}
          </p>
        </div>
        
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/students/bulk-new">
                <Users className="w-4 h-4 mr-2" />
                Ommaviy qo'shish
              </Link>
            </Button>
            <Button asChild>
              <Link href="/students/new">
                <Plus className="w-4 h-4 mr-2" />
                Yangi o'quvchi
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Izlash (ism, sinf)..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {showFilters && (
          <>
            {isTwoShift && (
              <Select value={smenaSel} onValueChange={(v) => { setSmenaSel(v); setClassSel("all"); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Smena" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha smena</SelectItem>
                  <SelectItem value="1">1-smena</SelectItem>
                  <SelectItem value="2">2-smena</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={bolimSel} onValueChange={(v) => { setBolimSel(v); setClassSel("all"); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bo'lim" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha bo'lim</SelectItem>
                <SelectItem value="boshlangich">Boshlang'ich (1–4)</SelectItem>
                <SelectItem value="yuqori">Yuqori (5–11)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classSel} onValueChange={setClassSel}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sinf" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sinf</SelectItem>
                {classOptions.map((cn) => <SelectItem key={cn} value={cn}>{cn}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
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
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredStudents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                  <TableCell className="font-mono text-sm text-muted-foreground">••••••</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="ID Karta" asChild>
                        <Link href={`/students/id-card?id=${student.telegram_id}`}>
                          <CreditCard className="w-4 h-4 text-primary" />
                        </Link>
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="icon" title="Face ID (yuz ma'lumoti) ni o'chirish"
                          onClick={() => void handleDeleteFaceId(student.login, student.full_name)}
                          disabled={fidBusy === student.login}
                        >
                          {fidBusy === student.login
                            ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            : <ScanFace className="w-4 h-4 text-rose-500" />}
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost" size="icon" title="Pro versiya berish (1 yil)"
                          onClick={() => void handleGrantPro(student.login)}
                          disabled={grantingLogin === student.login}
                        >
                          {grantingLogin === student.login
                            ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            : <Crown className="w-4 h-4 text-amber-500" />}
                        </Button>
                      )}
                      {canDelete && (
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
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
