import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const STAFF_MANAGE_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

function requireStaff(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || !STAFF_MANAGE_ROLES.includes(user["role"] as string)) return null;
  return user;
}

// ─────────────────────────────────────────────────────────────
// ADMIN/O'QITUVCHI: testlar ro'yxati va boshqaruvi
// ─────────────────────────────────────────────────────────────

router.get("/monitoring/tests", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const rows = await query(
    `SELECT t.*, COUNT(a.id)::int AS attempts_count
     FROM monitoring_tests t
     LEFT JOIN monitoring_attempts a ON a.test_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at DESC`
  );
  res.json(rows);
});

const CreateTestBody = z.object({
  title: z.string().min(3),
  subject: z.string().min(2),
  class_name: z.string().nullable().optional(),
  quarter: z.number().int().min(1).max(4),
  academic_year: z.string().min(4),
  duration_minutes: z.number().int().min(5).max(180).default(30),
  is_anonymous: z.boolean().default(false),
  show_result_immediately: z.boolean().default(true),
  questions: z.array(z.object({
    question: z.string().min(2),
    options: z.array(z.string().min(1)).min(2),
    correct_index: z.number().int().min(0),
  })).min(1),
});

// POST /api/monitoring/tests — yangi chorak monitoring testi yaratish (savollari bilan birga)
router.post("/monitoring/tests", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const parsed = CreateTestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;

  try {
    const test = await queryOne<{ id: string }>(
      `INSERT INTO monitoring_tests
         (title, subject, class_name, quarter, academic_year, duration_minutes, is_anonymous, show_result_immediately, created_by_login)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [d.title, d.subject, d.class_name ?? null, d.quarter, d.academic_year,
       d.duration_minutes, d.is_anonymous, d.show_result_immediately, user["login"] as string]
    );
    if (!test) { res.status(500).json({ error: "Test yaratilmadi" }); return; }

    for (let i = 0; i < d.questions.length; i++) {
      const q = d.questions[i]!;
      await query(
        `INSERT INTO monitoring_questions (test_id, question, options, correct_index, order_index)
         VALUES ($1,$2,$3,$4,$5)`,
        [test.id, q.question, JSON.stringify(q.options), q.correct_index, i]
      );
    }

    res.status(201).json({ id: test.id });
  } catch (err) {
    res.status(500).json({ error: "Test yaratishda xatolik", details: (err as Error).message });
  }
});

// PATCH /api/monitoring/tests/:id/status — testni ochish/yopish (draft -> open -> closed)
const StatusBody = z.object({ status: z.enum(["draft", "open", "closed"]) });

router.patch("/monitoring/tests/:id/status", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const parsed = StatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const opensAt = parsed.data.status === "open" ? new Date().toISOString() : null;
  const closesAt = parsed.data.status === "closed" ? new Date().toISOString() : null;

  await query(
    `UPDATE monitoring_tests SET status = $1,
       opens_at = COALESCE(opens_at, $2), closes_at = COALESCE($3, closes_at)
     WHERE id = $4`,
    [parsed.data.status, opensAt, closesAt, req.params["id"]]
  );
  res.json({ ok: true });
});

// GET /api/monitoring/tests/:id/results — to'liq natijalar (faqat admin/o'qituvchi uchun, ism bilan)
router.get("/monitoring/tests/:id/results", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const rows = await query(
    `SELECT student_login, student_name, class_name, score, total, submitted_at
     FROM monitoring_attempts WHERE test_id = $1 ORDER BY score DESC, submitted_at ASC`,
    [req.params["id"]]
  );
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
// O'QUVCHI: faol testni topish, ishlash, natijani ko'rish
// ─────────────────────────────────────────────────────────────

// GET /api/monitoring/active — o'quvchining sinfi uchun ochiq, hali ishlanmagan testlar
router.get("/monitoring/active", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const classNameVal = (user["class_name"] as string) ?? "";
  const loginVal = user["login"] as string;

  const rows = await query(
    `SELECT t.id, t.title, t.subject, t.quarter, t.duration_minutes, t.is_anonymous
     FROM monitoring_tests t
     WHERE t.status = 'open'
       AND (t.class_name IS NULL OR t.class_name = $1)
       AND NOT EXISTS (
         SELECT 1 FROM monitoring_attempts a WHERE a.test_id = t.id AND a.student_login = $2
       )
     ORDER BY t.created_at DESC`,
    [classNameVal, loginVal]
  );
  res.json(rows);
});

// GET /api/monitoring/tests/:id/take — testni ishlash uchun savollarni olish (to'g'ri javobsiz)
router.get("/monitoring/tests/:id/take", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const test = await queryOne<{ id: string; status: string; duration_minutes: number; title: string; subject: string }>(
    "SELECT id, status, duration_minutes, title, subject FROM monitoring_tests WHERE id = $1",
    [req.params["id"]]
  );
  if (!test || test.status !== "open") { res.status(404).json({ error: "Test topilmadi yoki yopilgan" }); return; }

  const already = await queryOne(
    "SELECT id FROM monitoring_attempts WHERE test_id = $1 AND student_login = $2",
    [test.id, user["login"] as string]
  );
  if (already) { res.status(409).json({ error: "Siz bu testni allaqachon ishlagansiz" }); return; }

  const questions = await query<{ id: string; question: string; options: string[] }>(
    "SELECT id, question, options FROM monitoring_questions WHERE test_id = $1 ORDER BY order_index",
    [test.id]
  );
  res.json({ test, questions });
});

const SubmitBody = z.object({
  answers: z.array(z.object({ question_id: z.string(), chosen_index: z.number().int().min(0) })),
});

// POST /api/monitoring/tests/:id/submit — javoblarni yuborish, ball serverda hisoblanadi
router.post("/monitoring/tests/:id/submit", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const test = await queryOne<{ id: string; status: string; show_result_immediately: boolean }>(
    "SELECT id, status, show_result_immediately FROM monitoring_tests WHERE id = $1",
    [req.params["id"]]
  );
  if (!test || test.status !== "open") { res.status(404).json({ error: "Test topilmadi yoki yopilgan" }); return; }

  const questions = await query<{ id: string; correct_index: number }>(
    "SELECT id, correct_index FROM monitoring_questions WHERE test_id = $1",
    [test.id]
  );
  const correctByQ = new Map(questions.map(q => [q.id, q.correct_index]));

  let score = 0;
  for (const a of parsed.data.answers) {
    if (correctByQ.get(a.question_id) === a.chosen_index) score++;
  }
  const total = questions.length;

  try {
    await query(
      `INSERT INTO monitoring_attempts (test_id, student_login, student_name, class_name, answers, score, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [test.id, user["login"] as string, user["full_name"] as string, (user["class_name"] as string) ?? "",
       JSON.stringify(parsed.data.answers), score, total]
    );
  } catch (err) {
    res.status(409).json({ error: "Siz bu testni allaqachon ishlagansiz", details: (err as Error).message });
    return;
  }

  res.json(test.show_result_immediately ? { score, total } : { submitted: true });
});

// GET /api/monitoring/tests/:id/leaderboard — o'quvchilarga ko'rinadigan ro'yxat.
// Test anonim bo'lsa, ismlar "O'quvchi #N" bilan almashtiriladi (o'zining qatoridan tashqari).
router.get("/monitoring/tests/:id/leaderboard", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const test = await queryOne<{ is_anonymous: boolean }>(
    "SELECT is_anonymous FROM monitoring_tests WHERE id = $1",
    [req.params["id"]]
  );
  if (!test) { res.status(404).json({ error: "Test topilmadi" }); return; }

  const rows = await query<{ student_login: string; student_name: string; class_name: string; score: number; total: number }>(
    `SELECT student_login, student_name, class_name, score, total
     FROM monitoring_attempts WHERE test_id = $1 ORDER BY score DESC, submitted_at ASC`,
    [req.params["id"]]
  );

  const isStaff = STAFF_MANAGE_ROLES.includes(user["role"] as string);
  const myLogin = user["login"] as string;

  const result = rows.map((r, idx) => ({
    place: idx + 1,
    student_name: (isStaff || !test.is_anonymous || r.student_login === myLogin)
      ? r.student_name
      : `O'quvchi #${idx + 1}`,
    class_name: r.class_name,
    score: r.score,
    total: r.total,
    is_me: r.student_login === myLogin,
  }));

  res.json(result);
});

export default router;
