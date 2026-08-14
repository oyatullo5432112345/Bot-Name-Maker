import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const STAFF_MANAGE_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];
// Tahlil (reyting/foiz) ko'rish huquqi — masul shaxslar
const ANALYTICS_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

function requireStaff(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || !STAFF_MANAGE_ROLES.includes(user["role"] as string)) return null;
  return user;
}

function requireAnalyticsStaff(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || !ANALYTICS_ROLES.includes(user["role"] as string)) return null;
  return user;
}

function pct(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 1000) / 10; // 1 xonali kasr aniqlik
}

// ─────────────────────────────────────────────────────────────
// AVTO-OCHILISH: rejalashtirilgan vaqti kelgan testlarni avtomatik ochadi
// ─────────────────────────────────────────────────────────────
let schedulerStarted = false;
export function startMonitoringScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      await query(
        `UPDATE monitoring_tests
         SET status = 'open', opens_at = NOW()
         WHERE status = 'draft' AND scheduled_open_at IS NOT NULL AND scheduled_open_at <= NOW()`
      );
    } catch (err) {
      console.error("Monitoring scheduler xatosi:", (err as Error).message);
    }
  };
  void tick();
  setInterval(() => void tick(), 20_000);
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

const QuestionBody = z.object({
  question: z.string().min(2),
  options: z.array(z.string().min(1)).optional(),
  correct_index: z.number().int().min(0).optional(),
  correct_text: z.string().min(1).optional(),
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
  has_options: z.boolean().default(true),
  scheduled_open_at: z.string().datetime().nullable().optional(),
  questions: z.array(QuestionBody).min(1),
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

  // Variantli bo'lsa har savolda kamida 2 variant va to'g'ri javob indeksi bo'lishi shart;
  // variantsiz bo'lsa to'g'ri javob matni bo'lishi shart.
  for (const q of d.questions) {
    if (d.has_options) {
      if (!q.options || q.options.length < 2 || q.correct_index === undefined) {
        res.status(400).json({ error: `"${q.question}" savolida kamida 2 variant va to'g'ri javob belgilanishi kerak` });
        return;
      }
    } else if (!q.correct_text || !q.correct_text.trim()) {
      res.status(400).json({ error: `"${q.question}" savolida to'g'ri javob matni kiritilmagan` });
      return;
    }
  }

  try {
    const test = await queryOne<{ id: string }>(
      `INSERT INTO monitoring_tests
         (title, subject, class_name, quarter, academic_year, duration_minutes, is_anonymous,
          show_result_immediately, has_options, scheduled_open_at, status, created_by_login)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [d.title, d.subject, d.class_name ?? null, d.quarter, d.academic_year,
       d.duration_minutes, d.is_anonymous, d.show_result_immediately, d.has_options,
       d.scheduled_open_at ?? null, "draft", user["login"] as string]
    );
    if (!test) { res.status(500).json({ error: "Test yaratilmadi" }); return; }

    for (let i = 0; i < d.questions.length; i++) {
      const q = d.questions[i]!;
      await query(
        `INSERT INTO monitoring_questions (test_id, question, options, correct_index, correct_text, order_index)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          test.id, q.question,
          d.has_options ? JSON.stringify(q.options) : "[]",
          d.has_options ? q.correct_index : null,
          d.has_options ? null : q.correct_text!.trim(),
          i,
        ]
      );
    }

    res.status(201).json({ id: test.id });
  } catch (err) {
    res.status(500).json({ error: "Test yaratishda xatolik", details: (err as Error).message });
  }
});

// PATCH /api/monitoring/tests/:id/status — testni ochish/yopish (draft <-> open <-> closed) — "qulf"ni boshqarish
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

// DELETE /api/monitoring/tests/:id — testni o'chirish (faqat qoralama yoki hali javob bo'lmagan bo'lsa)
router.delete("/monitoring/tests/:id", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  await query("DELETE FROM monitoring_tests WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

// GET /api/monitoring/tests/:id/results — to'liq natijalar (faqat admin/o'qituvchi uchun, ism bilan)
router.get("/monitoring/tests/:id/results", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const rows = await query<{ student_login: string; student_name: string; class_name: string; score: number; total: number; submitted_at: string }>(
    `SELECT student_login, student_name, class_name, score, total, submitted_at
     FROM monitoring_attempts WHERE test_id = $1 ORDER BY score DESC, submitted_at ASC`,
    [req.params["id"]]
  );
  res.json(rows.map(r => ({ ...r, percentage: pct(r.score, r.total) })));
});

// ─────────────────────────────────────────────────────────────
// TAHLIL / REYTING — admin, direktor, zavuch, zam.direktor uchun
// ─────────────────────────────────────────────────────────────

// GET /api/monitoring/analytics/overview — maktab umumiy foizi + sinflar reytingi + eng zo'r o'quvchilar reytingi
router.get("/monitoring/analytics/overview", async (req, res): Promise<void> => {
  const user = requireAnalyticsStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const overall = await queryOne<{ total_score: string; total_max: string; attempts: string }>(
    `SELECT COALESCE(SUM(score),0) AS total_score, COALESCE(SUM(total),0) AS total_max, COUNT(*) AS attempts
     FROM monitoring_attempts`
  );

  const classRanking = await query<{ class_name: string; total_score: string; total_max: string; attempts: string }>(
    `SELECT class_name, SUM(score) AS total_score, SUM(total) AS total_max, COUNT(*) AS attempts
     FROM monitoring_attempts GROUP BY class_name ORDER BY class_name`
  );

  const studentRanking = await query<{ student_login: string; student_name: string; class_name: string; total_score: string; total_max: string; attempts: string }>(
    `SELECT student_login, student_name, class_name, SUM(score) AS total_score, SUM(total) AS total_max, COUNT(*) AS attempts
     FROM monitoring_attempts GROUP BY student_login, student_name, class_name`
  );

  const classRows = classRanking
    .map(c => ({
      class_name: c.class_name,
      percentage: pct(Number(c.total_score), Number(c.total_max)),
      attempts: Number(c.attempts),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .map((c, i) => ({ ...c, place: i + 1 }));

  const studentRows = studentRanking
    .map(s => ({
      student_login: s.student_login,
      student_name: s.student_name,
      class_name: s.class_name,
      percentage: pct(Number(s.total_score), Number(s.total_max)),
      attempts: Number(s.attempts),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .map((s, i) => ({ ...s, place: i + 1 }));

  res.json({
    school_percentage: pct(Number(overall?.total_score ?? 0), Number(overall?.total_max ?? 0)),
    total_attempts: Number(overall?.attempts ?? 0),
    class_ranking: classRows,
    student_ranking: studentRows,
  });
});

// GET /api/monitoring/analytics/class/:className — sinf ichida fanlar va o'quvchilar bo'yicha foiz
router.get("/monitoring/analytics/class/:className", async (req, res): Promise<void> => {
  const user = requireAnalyticsStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const className = req.params["className"] as string;

  const subjectRows = await query<{ subject: string; total_score: string; total_max: string; attempts: string }>(
    `SELECT t.subject, SUM(a.score) AS total_score, SUM(a.total) AS total_max, COUNT(*) AS attempts
     FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
     WHERE a.class_name = $1
     GROUP BY t.subject ORDER BY t.subject`,
    [className]
  );

  const studentRows = await query<{ student_login: string; student_name: string; total_score: string; total_max: string; attempts: string }>(
    `SELECT student_login, student_name, SUM(score) AS total_score, SUM(total) AS total_max, COUNT(*) AS attempts
     FROM monitoring_attempts WHERE class_name = $1
     GROUP BY student_login, student_name`,
    [className]
  );

  const subjects = subjectRows.map(s => ({
    subject: s.subject,
    percentage: pct(Number(s.total_score), Number(s.total_max)),
    attempts: Number(s.attempts),
  }));

  const students = studentRows
    .map(s => ({
      student_login: s.student_login,
      student_name: s.student_name,
      percentage: pct(Number(s.total_score), Number(s.total_max)),
      attempts: Number(s.attempts),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .map((s, i) => ({ ...s, place: i + 1 }));

  res.json({ class_name: className, subjects, students });
});

// ─────────────────────────────────────────────────────────────
// O'QUVCHI: bosh sahifa (eng yaqin test, kutilayotganlar, arxiv)
// ─────────────────────────────────────────────────────────────

// GET /api/monitoring/student-home — o'quvchining Monitoring bosh sahifasi uchun barcha ma'lumot
router.get("/monitoring/student-home", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const classNameVal = (user["class_name"] as string) ?? "";
  const loginVal = user["login"] as string;

  // Ochiq va hali yechilmagan testlar (eng yaqin — birinchisi)
  const openTests = await query<{
    id: string; title: string; subject: string; quarter: number;
    duration_minutes: number; is_anonymous: boolean; opens_at: string | null;
  }>(
    `SELECT t.id, t.title, t.subject, t.quarter, t.duration_minutes, t.is_anonymous, t.opens_at
     FROM monitoring_tests t
     WHERE t.status = 'open'
       AND (t.class_name IS NULL OR t.class_name = $1)
       AND NOT EXISTS (SELECT 1 FROM monitoring_attempts a WHERE a.test_id = t.id AND a.student_login = $2)
     ORDER BY t.opens_at ASC NULLS LAST, t.created_at DESC`,
    [classNameVal, loginVal]
  );

  const questionCounts = await query<{ test_id: string; cnt: string }>(
    `SELECT test_id, COUNT(*) AS cnt FROM monitoring_questions
     WHERE test_id = ANY($1::uuid[]) GROUP BY test_id`,
    [openTests.map(t => t.id)]
  );
  const qCountMap = new Map(questionCounts.map(q => [q.test_id, Number(q.cnt)]));

  // Yaqinlashib kelayotgan (rejalashtirilgan, hali ochilmagan) testlar
  const scheduledTests = await query<{
    id: string; title: string; subject: string; quarter: number;
    duration_minutes: number; scheduled_open_at: string;
  }>(
    `SELECT t.id, t.title, t.subject, t.quarter, t.duration_minutes, t.scheduled_open_at
     FROM monitoring_tests t
     WHERE t.status = 'draft' AND t.scheduled_open_at IS NOT NULL
       AND (t.class_name IS NULL OR t.class_name = $1)
     ORDER BY t.scheduled_open_at ASC`,
    [classNameVal]
  );

  // Yechilgan testlar — arxiv
  const archive = await query<{
    test_id: string; title: string; subject: string; quarter: number;
    score: number; total: number; submitted_at: string;
  }>(
    `SELECT a.test_id, t.title, t.subject, t.quarter, a.score, a.total, a.submitted_at
     FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
     WHERE a.student_login = $1
     ORDER BY a.submitted_at DESC`,
    [loginVal]
  );

  const pending = openTests.map(t => ({
    id: t.id, title: t.title, subject: t.subject, quarter: t.quarter,
    duration_minutes: t.duration_minutes, is_anonymous: t.is_anonymous,
    question_count: qCountMap.get(t.id) ?? 0,
    status: "open" as const,
  }));

  const upcoming = scheduledTests.map(t => ({
    id: t.id, title: t.title, subject: t.subject, quarter: t.quarter,
    duration_minutes: t.duration_minutes,
    scheduled_open_at: t.scheduled_open_at,
    status: "scheduled" as const,
  }));

  res.json({
    student_name: user["full_name"] as string,
    class_name: classNameVal,
    next: pending[0] ?? upcoming[0] ?? null,
    pending: pending.slice(pending[0] ? 1 : 0),
    upcoming: upcoming.slice(upcoming.length && !pending.length ? 1 : 0),
    archive: archive.map(a => ({ ...a, percentage: pct(a.score, a.total) })),
  });
});

// GET /api/monitoring/active — (eski, orqaga moslik uchun qoldirilgan)
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

  const test = await queryOne<{ id: string; status: string; duration_minutes: number; title: string; subject: string; has_options: boolean; opens_at: string | null }>(
    "SELECT id, status, duration_minutes, title, subject, has_options, opens_at FROM monitoring_tests WHERE id = $1",
    [req.params["id"]]
  );
  if (!test || test.status !== "open") { res.status(404).json({ error: "Test topilmadi yoki hali qulfda (yopiq)" }); return; }

  const already = await queryOne(
    "SELECT id FROM monitoring_attempts WHERE test_id = $1 AND student_login = $2",
    [test.id, user["login"] as string]
  );
  if (already) { res.status(409).json({ error: "Siz bu testni allaqachon ishlagansiz" }); return; }

  const questions = await query<{ id: string; question: string; options: string[] }>(
    "SELECT id, question, options FROM monitoring_questions WHERE test_id = $1 ORDER BY order_index",
    [test.id]
  );
  res.json({ test, questions, server_now: new Date().toISOString() });
});

const SubmitBody = z.object({
  answers: z.array(z.object({
    question_id: z.string(),
    chosen_index: z.number().int().min(0).optional(),
    text_answer: z.string().optional(),
  })),
});

// POST /api/monitoring/tests/:id/submit — javoblarni yuborish, ball serverda hisoblanadi
router.post("/monitoring/tests/:id/submit", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const test = await queryOne<{ id: string; status: string; show_result_immediately: boolean; has_options: boolean }>(
    "SELECT id, status, show_result_immediately, has_options FROM monitoring_tests WHERE id = $1",
    [req.params["id"]]
  );
  if (!test || test.status !== "open") { res.status(404).json({ error: "Test topilmadi yoki yopilgan" }); return; }

  const questions = await query<{ id: string; correct_index: number | null; correct_text: string | null }>(
    "SELECT id, correct_index, correct_text FROM monitoring_questions WHERE test_id = $1",
    [test.id]
  );
  const correctByQ = new Map(questions.map(q => [q.id, q]));

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  let score = 0;
  const breakdown: { question_id: string; correct: boolean }[] = [];
  for (const a of parsed.data.answers) {
    const correct = correctByQ.get(a.question_id);
    if (!correct) continue;
    let isCorrect = false;
    if (test.has_options) {
      isCorrect = correct.correct_index === a.chosen_index;
    } else if (a.text_answer && correct.correct_text) {
      isCorrect = norm(a.text_answer) === norm(correct.correct_text);
    }
    if (isCorrect) score++;
    breakdown.push({ question_id: a.question_id, correct: isCorrect });
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

  if (!test.show_result_immediately) {
    res.json({ submitted: true });
    return;
  }
  res.json({
    score, total,
    percentage: pct(score, total),
    correct_count: score,
    incorrect_count: total - score,
    breakdown,
  });
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
