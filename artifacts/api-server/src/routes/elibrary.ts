// Elektron kutubxona (Maktab Olami o'yinidagi "Kutubxona" binosiga bog'langan).
//   • Kutubxonachi/rahbariyat kitob qo'shadi: muqova + PDF + audio (havola orqali) + parcha + 10 ta test savoli.
//   • O'quvchi kitobni 10 KUNGA oladi, o'qiydi/tinglaydi, topshiradi.
//   • O'qiganini tekshirish: 10 ta savol — 5 TADAN KO'P to'g'ri bo'lsa, keyingi kitobni olish ochiladi.
//   • "Eng yaxshi kitobxon" reytingi; o'quvchi xabar yuboradi (kutubxonachiga).
// Katta fayllar (PDF/audio) obyekt-saqlashsiz havola (URL) bilan ulanadi — eng ishonchli MVP.

import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const LIB_MANAGE = ["admin", "kutubxonachi", "director", "zam_direktor", "zavuch"];
const BORROW_DAYS = 10;
const QUIZ_PASS = 5;        // 5 tadan KO'P (ya'ni >= 6) to'g'ri bo'lsa o'tadi
const QUIZ_TOTAL = 10;
const READ_REWARD = 25;     // kitobni o'qib testdan o'tgani uchun tanga

const SCHEMA = `
CREATE TABLE IF NOT EXISTS elib_books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT '',
  cover_url   TEXT NOT NULL DEFAULT '',
  pdf_url     TEXT NOT NULL DEFAULT '',
  audio_url   TEXT NOT NULL DEFAULT '',
  excerpt     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  questions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  added_by    TEXT NOT NULL DEFAULT '',
  maktab_id   INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS elib_borrows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       UUID NOT NULL,
  student_login TEXT NOT NULL,
  student_name  TEXT NOT NULL DEFAULT '',
  class_name    TEXT NOT NULL DEFAULT '',
  borrowed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at        TIMESTAMPTZ NOT NULL,
  returned_at   TIMESTAMPTZ,
  quiz_passed   BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_score    INT NOT NULL DEFAULT -1,
  maktab_id     INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elib_borrow_student ON elib_borrows(student_login);
CREATE INDEX IF NOT EXISTS idx_elib_borrow_book ON elib_borrows(book_id);
CREATE TABLE IF NOT EXISTS elib_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_login TEXT NOT NULL,
  from_name  TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  seen       BOOLEAN NOT NULL DEFAULT FALSE,
  maktab_id  INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- To'g'ridan-to'g'ri yuklangan fayllar (havolasiz): PDF va audio base64 ko'rinishda saqlanadi.
-- Ro'yxatda YUBORILMAYDI — faqat /elib/file/:bookId/:kind orqali oqib olinadi.
CREATE TABLE IF NOT EXISTS elib_files (
  book_id UUID NOT NULL,
  kind    TEXT NOT NULL,
  mime    TEXT NOT NULL DEFAULT '',
  data    TEXT NOT NULL DEFAULT '',
  size    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, kind)
);
`;
void query(SCHEMA).catch(() => { /* migratsiya keyin yaratadi */ });

interface QItem { q: string; options: string[]; correct: number }
function cleanQuestions(raw: unknown): QItem[] {
  if (!Array.isArray(raw)) return [];
  const out: QItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const q = String((r as Record<string, unknown>)["q"] ?? "").trim();
    const opts = (r as Record<string, unknown>)["options"];
    const correct = Number((r as Record<string, unknown>)["correct"]);
    if (!q || !Array.isArray(opts) || opts.length < 2) continue;
    const options = opts.slice(0, 4).map((o) => String(o ?? "").trim());
    if (options.some((o) => !o)) continue;
    out.push({ q, options, correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0 });
    if (out.length >= QUIZ_TOTAL) break;
  }
  return out;
}

const FILE_MAX = 27_000_000;        // ~20 MB fayl (base64). Body limiti 30mb (app.ts).
const fileData = z.object({ mime: z.string().max(120), b64: z.string().min(1).max(FILE_MAX) }).optional();
const CreateBookBody = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(2000).optional().default(""),
  cover_url: z.string().max(3_000_000).optional().default(""), // havola YOKI yuklangan rasm (data-URL)
  pdf_url: z.string().max(2000).optional().default(""),
  audio_url: z.string().max(2000).optional().default(""),
  pdf_data: fileData,    // havolasiz yuklangan PDF: { mime, b64 }
  audio_data: fileData,  // havolasiz yuklangan audio: { mime, b64 }
  excerpt: z.string().max(8000).optional().default(""),
  description: z.string().max(4000).optional().default(""),
  questions: z.array(z.any()).optional().default([]),
});

// ─── Kitoblar ro'yxati (o'quvchining holati bilan) ────────────────────────────
router.get("/elib/books", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = String(user["login"]);
  const mid = schoolOf(user);
  try {
    const books = mid !== null
      ? await query<Record<string, unknown>>("SELECT * FROM elib_books WHERE maktab_id = $1 ORDER BY created_at DESC", [mid])
      : await query<Record<string, unknown>>("SELECT * FROM elib_books ORDER BY created_at DESC");
    const borrows = await query<Record<string, unknown>>(
      "SELECT id, book_id, borrowed_at::text AS borrowed_at, due_at::text AS due_at, returned_at::text AS returned_at, quiz_passed, quiz_score FROM elib_borrows WHERE student_login = $1",
      [login]
    );
    const byBook = new Map<string, Record<string, unknown>>();
    for (const b of borrows) {
      const prev = byBook.get(String(b["book_id"]));
      // eng so'nggi olishni olamiz
      if (!prev || String(b["borrowed_at"]) > String(prev["borrowed_at"])) byBook.set(String(b["book_id"]), b);
    }
    // "Qulf": o'quvchida testdan o'tilmagan ochiq kitob bo'lsa — yangisini ololmaydi
    const locked = borrows.some((b) => b["quiz_passed"] === false);
    // Havolasiz yuklangan fayllar (data YUBORILMAYDI — faqat bor-yo'qligi)
    const fileRows = await query<{ book_id: string; kind: string }>("SELECT book_id, kind FROM elib_files");
    const hasFile = new Set(fileRows.map((r) => `${r.book_id}:${r.kind}`));
    const list = books.map((bk) => {
      const qs = cleanQuestions(bk["questions"]);
      const mine = byBook.get(String(bk["id"])) ?? null;
      return {
        id: bk["id"], title: bk["title"], author: bk["author"],
        cover_url: bk["cover_url"], pdf_url: bk["pdf_url"], audio_url: bk["audio_url"],
        pdf_uploaded: hasFile.has(`${bk["id"]}:pdf`), audio_uploaded: hasFile.has(`${bk["id"]}:audio`),
        excerpt: bk["excerpt"], description: bk["description"],
        question_count: qs.length,
        my_borrow: mine && {
          id: mine["id"], borrowed_at: mine["borrowed_at"], due_at: mine["due_at"],
          returned_at: mine["returned_at"], quiz_passed: mine["quiz_passed"], quiz_score: mine["quiz_score"],
        },
      };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ books: list, locked, borrow_days: BORROW_DAYS, quiz_total: QUIZ_TOTAL, quiz_pass: QUIZ_PASS, can_manage: LIB_MANAGE.includes(String(user["role"])) });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Kitob qo'shish (kutubxonachi/rahbariyat) ─────────────────────────────────
router.post("/elib/books", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !LIB_MANAGE.includes(String(user["role"]))) { res.status(403).json({ error: "Faqat kutubxonachi yoki rahbariyat kitob qo'sha oladi" }); return; }
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }
  const d = parsed.data;
  const questions = cleanQuestions(d.questions);
  const mid = schoolOf(user);
  try {
    const book = await queryOne<{ id: string }>(
      `INSERT INTO elib_books (title, author, cover_url, pdf_url, audio_url, excerpt, description, questions, added_by, maktab_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING id`,
      [d.title, d.author, d.cover_url, d.pdf_url, d.audio_url, d.excerpt, d.description, JSON.stringify(questions), String(user["login"]), mid ?? 3]
    );
    const bookId = book?.id;
    // Havolasiz yuklangan fayllar (PDF/audio) alohida jadvalga
    if (bookId) {
      if (d.pdf_data?.b64) await query(
        `INSERT INTO elib_files (book_id, kind, mime, data, size) VALUES ($1,'pdf',$2,$3,$4)
         ON CONFLICT (book_id, kind) DO UPDATE SET mime=$2, data=$3, size=$4`,
        [bookId, d.pdf_data.mime || "application/pdf", d.pdf_data.b64, d.pdf_data.b64.length]).catch(() => {});
      if (d.audio_data?.b64) await query(
        `INSERT INTO elib_files (book_id, kind, mime, data, size) VALUES ($1,'audio',$2,$3,$4)
         ON CONFLICT (book_id, kind) DO UPDATE SET mime=$2, data=$3, size=$4`,
        [bookId, d.audio_data.mime || "audio/mpeg", d.audio_data.b64, d.audio_data.b64.length]).catch(() => {});
    }
    res.status(201).json({ id: bookId });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Kitobni o'chirish ────────────────────────────────────────────────────────
router.delete("/elib/books/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !LIB_MANAGE.includes(String(user["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { id } = req.params as { id: string };
  try {
    await query("DELETE FROM elib_borrows WHERE book_id = $1", [id]);
    await query("DELETE FROM elib_files WHERE book_id = $1", [id]);
    await query("DELETE FROM elib_books WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Yuklangan faylni (PDF/audio) o'qib berish — havolasiz yuklangan fayllar uchun ──
//   Brauzer yangi tabda ochganda Authorization header bo'lmaydi — token ?t= orqali ham qabul qilinadi.
router.get("/elib/file/:bookId/:kind", async (req, res): Promise<void> => {
  const hdr = req.headers.authorization;
  const q = typeof req.query["t"] === "string" ? String(req.query["t"]) : "";
  const user = hdr ? getAuthUser(hdr) : (q ? getAuthUser(`Bearer ${q}`) : null);
  if (!user) { res.status(401).send("Avtorizatsiya talab etiladi"); return; }
  const { bookId, kind } = req.params as { bookId: string; kind: string };
  if (kind !== "pdf" && kind !== "audio") { res.status(400).send("Noto'g'ri tur"); return; }
  try {
    const row = await queryOne<{ mime: string; data: string }>("SELECT mime, data FROM elib_files WHERE book_id = $1 AND kind = $2", [bookId, kind]);
    if (!row) { res.status(404).send("Fayl topilmadi"); return; }
    const buf = Buffer.from(row.data, "base64");
    res.setHeader("Content-Type", row.mime || (kind === "pdf" ? "application/pdf" : "audio/mpeg"));
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buf);
  } catch (err) { res.status(500).send((err as Error).message); }
});

// ─── Kitob olish (10 kunga) — oldingi kitob testidan o'tilган bo'lishi shart ──
router.post("/elib/borrow", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = String(user["login"]);
  const mid = schoolOf(user);
  const book_id = String((req.body as Record<string, unknown>)?.["book_id"] ?? "");
  if (!book_id) { res.status(400).json({ error: "book_id kerak" }); return; }
  try {
    const book = await queryOne<{ id: string; title: string }>("SELECT id, title FROM elib_books WHERE id = $1", [book_id]);
    if (!book) { res.status(404).json({ error: "Kitob topilmadi" }); return; }
    // Qulf: testdan o'tilmagan ochiq kitob bo'lsa — yangisini bera olmaymiz
    const open = await queryOne<{ cnt: string }>("SELECT COUNT(*) AS cnt FROM elib_borrows WHERE student_login = $1 AND quiz_passed = FALSE", [login]);
    if (parseInt(open?.cnt ?? "0") > 0) {
      res.status(400).json({ error: "Avval olingan kitobni o'qib, testdan o'ting — keyin yangisini olasiz" }); return;
    }
    const due = new Date(Date.now() + BORROW_DAYS * 24 * 3600 * 1000).toISOString();
    const borrow = await queryOne<Record<string, unknown>>(
      `INSERT INTO elib_borrows (book_id, student_login, student_name, class_name, due_at, maktab_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, book_id, borrowed_at::text AS borrowed_at, due_at::text AS due_at`,
      [book_id, login, String(user["full_name"] ?? ""), String(user["class_name"] ?? ""), due, mid ?? 3]
    );
    res.json({ ok: true, borrow });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Kitobni topshirish ───────────────────────────────────────────────────────
router.post("/elib/return", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = String(user["login"]);
  const borrow_id = String((req.body as Record<string, unknown>)?.["borrow_id"] ?? "");
  try {
    const r = await queryOne<{ id: string }>("SELECT id FROM elib_borrows WHERE id = $1 AND student_login = $2", [borrow_id, login]);
    if (!r) { res.status(404).json({ error: "Topilmadi" }); return; }
    await query("UPDATE elib_borrows SET returned_at = NOW() WHERE id = $1 AND returned_at IS NULL", [borrow_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Test savollari (javoblarsiz) ─────────────────────────────────────────────
router.get("/elib/quiz/:book_id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const { book_id } = req.params as { book_id: string };
  try {
    const book = await queryOne<{ questions: unknown; title: string }>("SELECT questions, title FROM elib_books WHERE id = $1", [book_id]);
    if (!book) { res.status(404).json({ error: "Kitob topilmadi" }); return; }
    const qs = cleanQuestions(book.questions).map((q, i) => ({ i, q: q.q, options: q.options })); // correct YUBORILMAYDI
    res.json({ title: book.title, questions: qs, pass: QUIZ_PASS });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Testni topshirish — 5 tadan ko'p to'g'ri bo'lsa o'tadi, keyingi kitob ochiladi ──
router.post("/elib/quiz", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = String(user["login"]);
  const mid = schoolOf(user);
  const body = req.body as Record<string, unknown>;
  const book_id = String(body?.["book_id"] ?? "");
  const answers = Array.isArray(body?.["answers"]) ? (body["answers"] as unknown[]).map((a) => Number(a)) : [];
  try {
    const book = await queryOne<{ questions: unknown; title: string }>("SELECT questions, title FROM elib_books WHERE id = $1", [book_id]);
    if (!book) { res.status(404).json({ error: "Kitob topilmadi" }); return; }
    const qs = cleanQuestions(book.questions);
    if (qs.length === 0) { res.status(400).json({ error: "Bu kitobda test yo'q" }); return; }
    let score = 0;
    for (let i = 0; i < qs.length; i++) if (answers[i] === qs[i]!.correct) score++;
    const passed = score > QUIZ_PASS;

    // O'quvchining shu kitobdagi so'nggi olishini topamiz (bo'lmasa — yozib qo'yamiz)
    const borrow = await queryOne<{ id: string; quiz_passed: boolean }>(
      "SELECT id, quiz_passed FROM elib_borrows WHERE student_login = $1 AND book_id = $2 ORDER BY borrowed_at DESC LIMIT 1",
      [login, book_id]
    );
    const alreadyPassed = borrow?.quiz_passed === true;
    if (borrow) {
      await query("UPDATE elib_borrows SET quiz_score = $1, quiz_passed = (quiz_passed OR $2) WHERE id = $3", [score, passed, borrow.id]);
    }
    // O'tgan bo'lsa va ILGARI o'tmagan bo'lsa — mukofot (bir martalik)
    if (passed && !alreadyPassed) {
      await query("INSERT INTO tanga_logs (user_login, amount, reason, source, maktab_id) VALUES ($1,$2,$3,'elib',$4)",
        [login, READ_REWARD, `Kutubxona: "${book.title}" kitobini o'qib testdan o'tdi`, mid ?? 3]);
    }
    res.json({ ok: true, score, total: qs.length, passed, reward: (passed && !alreadyPassed) ? READ_REWARD : 0 });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Eng yaxshi kitobxon reytingi (o'qib testdan o'tgan kitoblar soni) ────────
router.get("/elib/leaderboard", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const mid = schoolOf(user);
  try {
    const rows = mid !== null
      ? await query<{ student_login: string; student_name: string; class_name: string; books: string }>(
          `SELECT student_login, MAX(student_name) AS student_name, MAX(class_name) AS class_name, COUNT(*) AS books
           FROM elib_borrows WHERE quiz_passed = TRUE AND maktab_id = $1
           GROUP BY student_login ORDER BY books DESC LIMIT 50`, [mid])
      : await query<{ student_login: string; student_name: string; class_name: string; books: string }>(
          `SELECT student_login, MAX(student_name) AS student_name, MAX(class_name) AS class_name, COUNT(*) AS books
           FROM elib_borrows WHERE quiz_passed = TRUE
           GROUP BY student_login ORDER BY books DESC LIMIT 50`);
    const me = String(user["login"]);
    res.json(rows.map((r, i) => ({ rank: i + 1, login: r.student_login, name: r.student_name, class_name: r.class_name, books: parseInt(r.books), me: r.student_login === me })));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── O'quvchining o'zi o'qigan kitoblari (tarix) ──────────────────────────────
router.get("/elib/my-history", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT br.id, br.borrowed_at::text AS borrowed_at, br.due_at::text AS due_at, br.returned_at::text AS returned_at,
              br.quiz_passed, br.quiz_score, b.title, b.author, b.cover_url
       FROM elib_borrows br JOIN elib_books b ON b.id = br.book_id
       WHERE br.student_login = $1 ORDER BY br.borrowed_at DESC`,
      [String(user["login"])]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Rahbariyat/kutubxonachi: barcha o'quvchilar o'qigan kitoblari ─────────────
router.get("/elib/history", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !LIB_MANAGE.includes(String(user["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(user);
  try {
    const rows = mid !== null
      ? await query<Record<string, unknown>>(
          `SELECT br.student_login, br.student_name, br.class_name, br.borrowed_at::text AS borrowed_at,
                  br.returned_at::text AS returned_at, br.quiz_passed, br.quiz_score, b.title, b.author
           FROM elib_borrows br JOIN elib_books b ON b.id = br.book_id
           WHERE br.maktab_id = $1 ORDER BY br.borrowed_at DESC LIMIT 300`, [mid])
      : await query<Record<string, unknown>>(
          `SELECT br.student_login, br.student_name, br.class_name, br.borrowed_at::text AS borrowed_at,
                  br.returned_at::text AS returned_at, br.quiz_passed, br.quiz_score, b.title, b.author
           FROM elib_borrows br JOIN elib_books b ON b.id = br.book_id
           ORDER BY br.borrowed_at DESC LIMIT 300`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Umumiy ko'rinish: har maktabdan nechta kitob, qaysi sinf qancha o'qigan ───
//   Super-admin (tuman) → barcha maktablar; maktab rahbariyati → faqat o'z maktabi.
router.get("/elib/overview", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !LIB_MANAGE.includes(String(user["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(user);
  try {
    const bookRows = mid !== null
      ? await query<{ maktab_id: number; cnt: number }>("SELECT maktab_id, COUNT(*)::int AS cnt FROM elib_books WHERE maktab_id = $1 GROUP BY maktab_id", [mid])
      : await query<{ maktab_id: number; cnt: number }>("SELECT maktab_id, COUNT(*)::int AS cnt FROM elib_books GROUP BY maktab_id");
    const classRows = mid !== null
      ? await query<{ maktab_id: number; class_name: string; total: number; passed: number }>(
          `SELECT maktab_id, COALESCE(NULLIF(class_name,''),'—') AS class_name, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE quiz_passed)::int AS passed
           FROM elib_borrows WHERE maktab_id = $1 GROUP BY maktab_id, class_name`, [mid])
      : await query<{ maktab_id: number; class_name: string; total: number; passed: number }>(
          `SELECT maktab_id, COALESCE(NULLIF(class_name,''),'—') AS class_name, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE quiz_passed)::int AS passed
           FROM elib_borrows GROUP BY maktab_id, class_name`);
    const schoolRows = await query<{ id: number; nom: string }>("SELECT id, nom FROM maktablar");
    const nomById = new Map(schoolRows.map((s) => [s.id, s.nom]));
    type School = { maktab_id: number; maktab_nom: string; book_count: number; borrow_count: number; passed_count: number; classes: { class_name: string; total: number; passed: number }[] };
    const map = new Map<number, School>();
    const ensure = (id: number): School => {
      let s = map.get(id);
      if (!s) { s = { maktab_id: id, maktab_nom: nomById.get(id) ?? `${id}-maktab`, book_count: 0, borrow_count: 0, passed_count: 0, classes: [] }; map.set(id, s); }
      return s;
    };
    for (const b of bookRows) ensure(b.maktab_id).book_count = b.cnt;
    for (const c of classRows) {
      const s = ensure(c.maktab_id);
      s.borrow_count += c.total; s.passed_count += c.passed;
      s.classes.push({ class_name: c.class_name, total: c.total, passed: c.passed });
    }
    const out = Array.from(map.values()).sort((a, b) => a.maktab_nom.localeCompare(b.maktab_nom, "uz"));
    for (const s of out) s.classes.sort((a, b) => b.passed - a.passed || a.class_name.localeCompare(b.class_name, "uz"));
    res.json({ schools: out, is_admin: mid === null });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── O'quvchi xabar yuboradi (kutubxonachiga) ─────────────────────────────────
router.post("/elib/message", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const body = String((req.body as Record<string, unknown>)?.["body"] ?? "").trim().slice(0, 1000);
  if (body.length < 2) { res.status(400).json({ error: "Xabar juda qisqa" }); return; }
  const mid = schoolOf(user);
  try {
    await query("INSERT INTO elib_messages (from_login, from_name, class_name, body, maktab_id) VALUES ($1,$2,$3,$4,$5)",
      [String(user["login"]), String(user["full_name"] ?? ""), String(user["class_name"] ?? ""), body, mid ?? 3]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Kutubxonachi xabarlarni ko'radi ──────────────────────────────────────────
router.get("/elib/messages", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !LIB_MANAGE.includes(String(user["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(user);
  try {
    const rows = mid !== null
      ? await query<Record<string, unknown>>("SELECT id, from_name, class_name, body, created_at::text AS created_at FROM elib_messages WHERE maktab_id = $1 ORDER BY created_at DESC LIMIT 100", [mid])
      : await query<Record<string, unknown>>("SELECT id, from_name, class_name, body, created_at::text AS created_at FROM elib_messages ORDER BY created_at DESC LIMIT 100");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
