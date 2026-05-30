import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const CreateBookBody = z.object({
  title: z.string().min(1),
  author: z.string().optional().default(""),
  category: z.enum(["darslik", "badiiy", "ilmiy", "boshqa"]).default("boshqa"),
  class_name: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  quantity: z.number().int().min(1).default(1),
  isbn: z.string().optional().default(""),
  published_year: z.number().int().optional().nullable(),
  description: z.string().optional().default(""),
});

const CreateLoanBody = z.object({
  book_id: z.string().uuid(),
  student_name: z.string().min(1),
  student_class: z.string().optional().default(""),
  student_login: z.string().optional().default(""),
  due_date: z.string().min(1),
  notes: z.string().optional().default(""),
});

// GET /api/library/books
router.get("/library/books", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const { category, search } = req.query as Record<string, string>;

  let query = supabase
    .from("library_books")
    .select("*")
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = supabase
      .from("library_books")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Kitoblarni yuklashda xatolik", details: error.message });
    return;
  }

  let result = data ?? [];
  if (search) {
    const s = search.toLowerCase();
    result = result.filter((b: Record<string, unknown>) =>
      String(b["title"] ?? "").toLowerCase().includes(s) ||
      String(b["author"] ?? "").toLowerCase().includes(s) ||
      String(b["subject"] ?? "").toLowerCase().includes(s)
    );
  }

  res.json(result);
});

// POST /api/library/books
router.post("/library/books", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Faqat kutubxonachi yoki admin kitob qo'sha oladi" });
    return;
  }

  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { quantity, ...rest } = parsed.data;

  const { data, error } = await supabase
    .from("library_books")
    .insert([{
      ...rest,
      quantity,
      available: quantity,
      added_by: user["login"] as string,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Kitob qo'shishda xatolik", details: error?.message });
    return;
  }

  res.status(201).json(data);
});

// PATCH /api/library/books/:id
router.patch("/library/books/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params as { id: string };
  const updates = req.body as Record<string, unknown>;

  const { data, error } = await supabase
    .from("library_books")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Kitob topilmadi" });
    return;
  }

  res.json(data);
});

// DELETE /api/library/books/:id
router.delete("/library/books/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params as { id: string };

  await supabase.from("library_loans").delete().eq("book_id", id);
  const { error } = await supabase.from("library_books").delete().eq("id", id);

  if (error) {
    res.status(500).json({ error: "Kitobni o'chirishda xatolik" });
    return;
  }

  res.sendStatus(204);
});

// GET /api/library/loans
router.get("/library/loans", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const { status, book_id } = req.query as Record<string, string>;

  let query = supabase
    .from("library_loans")
    .select(`
      *,
      library_books (
        title,
        author,
        category
      )
    `)
    .order("created_at", { ascending: false });

  if (book_id) {
    query = supabase
      .from("library_loans")
      .select(`*, library_books (title, author, category)`)
      .eq("book_id", book_id)
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Ijaralarni yuklashda xatolik", details: error.message });
    return;
  }

  let result = data ?? [];

  if (status === "active") {
    result = result.filter((l: Record<string, unknown>) => !l["returned_date"]);
  } else if (status === "returned") {
    result = result.filter((l: Record<string, unknown>) => l["returned_date"]);
  } else if (status === "overdue") {
    const today = new Date().toISOString().slice(0, 10);
    result = result.filter((l: Record<string, unknown>) =>
      !l["returned_date"] && l["due_date"] && String(l["due_date"]) < today
    );
  }

  res.json(result);
});

// POST /api/library/loans  — kitob berish
router.post("/library/loans", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Faqat kutubxonachi yoki admin kitob bera oladi" });
    return;
  }

  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Kitob mavjudligini tekshirish
  const { data: book, error: bookErr } = await supabase
    .from("library_books")
    .select("id, available, title")
    .eq("id", parsed.data.book_id)
    .single();

  if (bookErr || !book) {
    res.status(404).json({ error: "Kitob topilmadi" });
    return;
  }

  const typedBook = book as { id: string; available: number; title: string };
  if (typedBook.available < 1) {
    res.status(400).json({ error: `"${typedBook.title}" kitobining mavjud nusxasi yo'q` });
    return;
  }

  // Ijara yozuvini yaratish
  const { data: loan, error: loanErr } = await supabase
    .from("library_loans")
    .insert([{
      ...parsed.data,
      issued_date: new Date().toISOString().slice(0, 10),
      issued_by: user["login"] as string,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (loanErr || !loan) {
    res.status(500).json({ error: "Ijara yozuvini yaratishda xatolik" });
    return;
  }

  // Mavjud nusxalar sonini kamaytirish
  await supabase
    .from("library_books")
    .update({ available: typedBook.available - 1 })
    .eq("id", parsed.data.book_id);

  res.status(201).json(loan);
});

// PATCH /api/library/loans/:id/return  — kitob qaytarish
router.patch("/library/loans/:id/return", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params as { id: string };

  const { data: loan, error: loanErr } = await supabase
    .from("library_loans")
    .select("id, book_id, returned_date")
    .eq("id", id)
    .single();

  if (loanErr || !loan) {
    res.status(404).json({ error: "Ijara topilmadi" });
    return;
  }

  const typedLoan = loan as { id: string; book_id: string; returned_date: string | null };

  if (typedLoan.returned_date) {
    res.status(400).json({ error: "Bu kitob allaqachon qaytarilgan" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: updatedLoan, error: updateErr } = await supabase
    .from("library_loans")
    .update({ returned_date: today })
    .eq("id", id)
    .select()
    .single();

  if (updateErr || !updatedLoan) {
    res.status(500).json({ error: "Qaytarishda xatolik" });
    return;
  }

  // Mavjud nusxalar sonini oshirish
  const { data: bookData } = await supabase
    .from("library_books")
    .select("available, quantity")
    .eq("id", typedLoan.book_id)
    .single();

  if (bookData) {
    const typed = bookData as { available: number; quantity: number };
    const newAvailable = Math.min(typed.available + 1, typed.quantity);
    await supabase
      .from("library_books")
      .update({ available: newAvailable })
      .eq("id", typedLoan.book_id);
  }

  res.json(updatedLoan);
});

// DELETE /api/library/loans/:id
router.delete("/library/loans/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  if (!["admin", "kutubxonachi"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params as { id: string };

  const { data: loan } = await supabase
    .from("library_loans")
    .select("book_id, returned_date")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("library_loans").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: "O'chirishda xatolik" });
    return;
  }

  // Agar qaytarilmagan bo'lsa — available ni tiklash
  if (loan && !(loan as { returned_date: string | null }).returned_date) {
    const typedLoan = loan as { book_id: string; returned_date: string | null };
    const { data: bookData } = await supabase
      .from("library_books")
      .select("available, quantity")
      .eq("id", typedLoan.book_id)
      .single();
    if (bookData) {
      const typed = bookData as { available: number; quantity: number };
      await supabase
        .from("library_books")
        .update({ available: Math.min(typed.available + 1, typed.quantity) })
        .eq("id", typedLoan.book_id);
    }
  }

  res.sendStatus(204);
});

export default router;
