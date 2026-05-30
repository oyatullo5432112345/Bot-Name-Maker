import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Search, BookCheck, BookOpen, AlertCircle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type Loan = {
  id: string;
  book_id: string;
  student_name: string;
  student_class?: string;
  student_login?: string;
  issued_date: string;
  due_date: string;
  returned_date?: string | null;
  issued_by: string;
  notes?: string;
  library_books?: {
    title: string;
    author?: string;
    category: string;
  } | null;
};

function getStatusInfo(loan: Loan) {
  if (loan.returned_date) {
    return { label: "Qaytarildi", color: "bg-green-100 text-green-700 border-green-200" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (loan.due_date < today) {
    return { label: "Muddati o'tdi", color: "bg-red-100 text-red-700 border-red-200" };
  }
  return { label: "Berilgan", color: "bg-orange-100 text-orange-700 border-orange-200" };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function LibraryLoansPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ["library-loans", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`${API_BASE}/library/loans?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json() as Promise<Loan[]>;
    },
    refetchInterval: 30000,
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/library/loans/${id}/return`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Xatolik");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-loans"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      toast({ title: "Kitob qaytarildi ✅" });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Xatolik", description: e.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/library/loans/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-loans"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      toast({ title: "O'chirildi" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik" });
    },
  });

  const filtered = loans.filter(l =>
    l.student_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.library_books?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.student_class ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: loans.length,
    active: loans.filter(l => !l.returned_date).length,
    overdue: loans.filter(l => {
      if (l.returned_date) return false;
      const today = new Date().toISOString().slice(0, 10);
      return l.due_date < today;
    }).length,
    returned: loans.filter(l => l.returned_date).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/library")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookCheck className="w-6 h-6 text-primary" />
            Ijara jurnali
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kitob berish va qaytarish tarixi</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Jami", value: stats.total, color: "" },
          { label: "Berilgan", value: stats.active, color: "text-orange-600" },
          { label: "Muddati o'tdi", value: stats.overdue, color: "text-destructive" },
          { label: "Qaytarildi", value: stats.returned, color: "text-green-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border rounded-lg bg-card px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="O'quvchi ismi, kitob nomi, sinf..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha ijaralar</SelectItem>
            <SelectItem value="active">Berilganlar</SelectItem>
            <SelectItem value="overdue">Muddati o'tganlar</SelectItem>
            <SelectItem value="returned">Qaytarilganlar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kitob</TableHead>
              <TableHead>O'quvchi</TableHead>
              <TableHead>Sinf</TableHead>
              <TableHead>Berilgan</TableHead>
              <TableHead>Muddati</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <span>Ma'lumot topilmadi</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((loan) => {
                const statusInfo = getStatusInfo(loan);
                const isOverdue = !loan.returned_date && loan.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <TableRow key={loan.id} className={isOverdue ? "bg-red-50/50" : undefined}>
                    <TableCell>
                      <div className="font-medium text-sm">{loan.library_books?.title ?? "—"}</div>
                      {loan.library_books?.author && (
                        <div className="text-xs text-muted-foreground">{loan.library_books.author}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{loan.student_name}</TableCell>
                    <TableCell>
                      {loan.student_class ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {loan.student_class}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(loan.issued_date)}</TableCell>
                    <TableCell className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
                      {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {formatDate(loan.due_date)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        {statusInfo.label}
                        {loan.returned_date && (
                          <span className="ml-1 opacity-70 font-normal">({formatDate(loan.returned_date)})</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!loan.returned_date && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => returnMutation.mutate(loan.id)}
                            disabled={returnMutation.isPending}
                          >
                            {returnMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Qaytardi
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(loan.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
