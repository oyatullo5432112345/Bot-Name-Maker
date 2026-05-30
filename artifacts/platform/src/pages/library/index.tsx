import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Library, Plus, Search, Trash2, BookOpen, BookCheck, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type Book = {
  id: string;
  title: string;
  author: string;
  category: "darslik" | "badiiy" | "ilmiy" | "boshqa";
  class_name?: string;
  subject?: string;
  quantity: number;
  available: number;
  isbn?: string;
  published_year?: number;
  description?: string;
  added_by: string;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  darslik: "Darslik",
  badiiy: "Badiiy adabiyot",
  ilmiy: "Ilmiy",
  boshqa: "Boshqa",
};

const CATEGORY_COLORS: Record<string, string> = {
  darslik: "bg-blue-100 text-blue-700 border-blue-200",
  badiiy: "bg-green-100 text-green-700 border-green-200",
  ilmiy: "bg-purple-100 text-purple-700 border-purple-200",
  boshqa: "bg-gray-100 text-gray-700 border-gray-200",
};

function LoanDialog({ book, open, onClose, onDone }: {
  book: Book;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!studentName.trim()) {
      toast({ variant: "destructive", title: "Xatolik", description: "O'quvchi ismini kiriting" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/library/loans`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          book_id: book.id,
          student_name: studentName.trim(),
          student_class: studentClass.trim(),
          due_date: dueDate,
        }),
      });
      if (res.ok) {
        toast({ title: "Kitob berildi", description: `"${book.title}" — ${studentName}` });
        setStudentName("");
        setStudentClass("");
        onDone();
        onClose();
      } else {
        const d = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Xatolik", description: d.error ?? "Xatolik yuz berdi" });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanib bo'lmadi" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-primary" />
            Kitob berish
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-1">
          <p className="text-sm font-medium text-foreground">📚 {book.title}</p>
          {book.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
          <p className="text-xs text-muted-foreground">Mavjud: {book.available} nusxa</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>O'quvchi F.I.O *</Label>
            <Input
              placeholder="Valiyev Valijon"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sinf (ixtiyoriy)</Label>
            <Input
              placeholder="7-A"
              value={studentClass}
              onChange={e => setStudentClass(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Qaytarish muddati</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit} disabled={loading || !studentName.trim()}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Berish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loanBook, setLoanBook] = useState<Book | null>(null);

  const canManage = user && ["admin", "kutubxonachi"].includes(user.role);

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["library-books", category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const res = await fetch(`${API_BASE}/library/books?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json() as Promise<Book[]>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/library/books/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      toast({ title: "Kitob o'chirildi" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik yuz berdi" });
    },
  });

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (b.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: books.reduce((s, b) => s + b.quantity, 0),
    available: books.reduce((s, b) => s + b.available, 0),
    borrowed: books.reduce((s, b) => s + (b.quantity - b.available), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="w-6 h-6 text-primary" />
            Kutubxona
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Maktab kutubxonasi — darsliklar va badiiy adabiyotlar
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/library/loans">
                <BookCheck className="w-4 h-4 mr-2" />
                Ijara jurnali
              </Link>
            </Button>
            <Button asChild>
              <Link href="/library/new">
                <Plus className="w-4 h-4 mr-2" />
                Kitob qo'shish
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-3">
        {[
          { label: "Jami nusxalar", value: stats.total, color: "text-foreground" },
          { label: "Mavjud", value: stats.available, color: "text-green-700" },
          { label: "Berilgan", value: stats.borrowed, color: "text-orange-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <CardContent className="py-3 px-2">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kitob nomi, muallif yoki fan..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kategoriya..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kategoriyalar</SelectItem>
            <SelectItem value="darslik">Darslik</SelectItem>
            <SelectItem value="badiiy">Badiiy adabiyot</SelectItem>
            <SelectItem value="ilmiy">Ilmiy</SelectItem>
            <SelectItem value="boshqa">Boshqa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
          <Library className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">
            {search || category !== "all" ? "Qidiruv bo'yicha kitob topilmadi" : "Kutubxonada hozircha kitob yo'q"}
          </p>
          {canManage && !search && category === "all" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/library/new">
                <Plus className="w-4 h-4 mr-1" />
                Birinchi kitobni qo'shing
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <Card key={book.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-snug">{book.title}</CardTitle>
                    {book.author && (
                      <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(book.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[book.category] ?? CATEGORY_COLORS["boshqa"]}`}>
                    {CATEGORY_LABELS[book.category] ?? book.category}
                  </span>
                  {book.subject && (
                    <Badge variant="secondary" className="text-xs">{book.subject}</Badge>
                  )}
                  {book.class_name && (
                    <Badge variant="outline" className="text-xs">{book.class_name} sinf</Badge>
                  )}
                </div>

                {book.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{book.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{book.quantity} nusxa</span>
                    </span>
                    <span className={`flex items-center gap-1 font-medium ${book.available === 0 ? "text-destructive" : "text-green-700"}`}>
                      {book.available === 0
                        ? <><AlertCircle className="w-3.5 h-3.5" /> Mavjud yo'q</>
                        : <><BookCheck className="w-3.5 h-3.5" /> {book.available} mavjud</>
                      }
                    </span>
                  </div>
                  {canManage && book.available > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setLoanBook(book)}
                    >
                      Berish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loanBook && (
        <LoanDialog
          book={loanBook}
          open={!!loanBook}
          onClose={() => setLoanBook(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["library-books"] });
            queryClient.invalidateQueries({ queryKey: ["library-loans"] });
          }}
        />
      )}
    </div>
  );
}
