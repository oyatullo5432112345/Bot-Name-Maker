import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
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

  try {
    let rows;
    if (category && category !== "all") {
      rows = await query("SELECT * FROM library_books WHERE category = $1 ORDER BY created_at DESC", [category]);
    } else {
      rows = await query("SELECT * FROM library_books ORDER BY created_at DESC");
    }

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((b: Record<string, unknown>) =>
        String(b["title"] ?? "").toLowerCase().includes(s) ||
        String(b["author"] ?? "").toLowerCase().includes(s) ||
        String(b["subject"] ?? "").toLowerCase().includes(s)
      );
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Kitoblarni yuklashda xatolik", details: (err as Error).message });
  }
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

  const { quantity, title, author, category, class_name, subject, isbn, published_year, description } = parsed.data;

  try {
    const data = await queryOne(
      `INSERT INTO library_books (title, author, category, class_name, subject, quantity, available, isbn, published_year, description, added_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, author, category, class_name, subject, quantity, quantity, isbn, published_year ?? null,
       description, user["login"] as string, new Date().toISOString()]
    );
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Kitob qo'shishda xatolik", details: (err as Error).message });
  }
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

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }

  values.push(id);
  const data = await queryOne(
    `UPDATE library_books SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (!data) {
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
  try {
    await query("DELETE FROM library_loans WHERE book_id = $1", [id]);
    await query("DELETE FROM library_books WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Kitobni o'chirishda xatolik", details: (err as Error).message });
  }
});

// GET /api/library/loans
router.get("/library/loans", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const { status, book_id } = req.query as Record<string, string>;

  try {
    let rows;
    if (book_id) {
      rows = await query(
        `SELECT l.*, b.title as book_title, b.author as book_author, b.category as book_category
         FROM library_loans l LEFT JOIN library_books b ON l.book_id = b.id
         WHERE l.book_id = $1 ORDER BY l.created_at DESC`,
        [book_id]
      );
    } else {
      rows = await query(
        `SELECT l.*, b.title as book_title, b.author as book_author, b.category as book_category
         FROM library_loans l LEFT JOIN library_books b ON l.book_id = b.id
         ORDER BY l.created_at DESC`
      );
    }

    // Transform to match expected shape with library_books nested
    rows = rows.map((r: Record<string, unknown>) => ({
      ...r,
      library_books: { title: r["book_title"], author: r["book_author"], category: r["book_category"] },
    }));

    if (status === "active") {
      rows = rows.filter((l: Record<string, unknown>) => !l["returned_date"]);
    } else if (status === "returned") {
      rows = rows.filter((l: Record<string, unknown>) => l["returned_date"]);
    } else if (status === "overdue") {
      const today = new Date().toISOString().slice(0, 10);
      rows = rows.filter((l: Record<string, unknown>) =>
        !l["returned_date"] && l["due_date"] && String(l["due_date"]) < today
      );
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Ijaralarni yuklashda xatolik", details: (err as Error).message });
  }
});

// POST /api/library/loans
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

  const book = await queryOne<{ id: string; available: number; title: string }>(
    "SELECT id, available, title FROM library_books WHERE id = $1", [parsed.data.book_id]
  );

  if (!book) {
    res.status(404).json({ error: "Kitob topilmadi" });
    return;
  }

  if (book.available < 1) {
    res.status(400).json({ error: `"${book.title}" kitobining mavjud nusxasi yo'q` });
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const loan = await queryOne(
      `INSERT INTO library_loans (book_id, student_name, student_class, student_login, due_date, notes, issued_date, issued_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [parsed.data.book_id, parsed.data.student_name, parsed.data.student_class,
       parsed.data.student_login, parsed.data.due_date, parsed.data.notes,
       today, user["login"] as string, new Date().toISOString()]
    );

    await query("UPDATE library_books SET available = $1 WHERE id = $2", [book.available - 1, parsed.data.book_id]);
    res.status(201).json(loan);
  } catch (err) {
    res.status(500).json({ error: "Ijara yozuvini yaratishda xatolik", details: (err as Error).message });
  }
});

// PATCH /api/library/loans/:id/return
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
  const loan = await queryOne<{ id: string; book_id: string; returned_date: string | null }>(
    "SELECT id, book_id, returned_date FROM library_loans WHERE id = $1", [id]
  );

  if (!loan) {
    res.status(404).json({ error: "Ijara topilmadi" });
    return;
  }

  if (loan.returned_date) {
    res.status(400).json({ error: "Bu kitob allaqachon qaytarilgan" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const updatedLoan = await queryOne(
    "UPDATE library_loans SET returned_date = $1 WHERE id = $2 RETURNING *",
    [today, id]
  );

  const bookData = await queryOne<{ available: number; quantity: number }>(
    "SELECT available, quantity FROM library_books WHERE id = $1", [loan.book_id]
  );

  if (bookData) {
    const newAvailable = Math.min(bookData.available + 1, bookData.quantity);
    await query("UPDATE library_books SET available = $1 WHERE id = $2", [newAvailable, loan.book_id]);
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
  const loan = await queryOne<{ book_id: string; returned_date: string | null }>(
    "SELECT book_id, returned_date FROM library_loans WHERE id = $1", [id]
  );

  await query("DELETE FROM library_loans WHERE id = $1", [id]);

  if (loan && !loan.returned_date) {
    const bookData = await queryOne<{ available: number; quantity: number }>(
      "SELECT available, quantity FROM library_books WHERE id = $1", [loan.book_id]
    );
    if (bookData) {
      await query("UPDATE library_books SET available = $1 WHERE id = $2",
        [Math.min(bookData.available + 1, bookData.quantity), loan.book_id]
      );
    }
  }

  res.sendStatus(204);
});

export default router;
