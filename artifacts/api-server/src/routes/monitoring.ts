// ─────────────────────────────────────────────────────────────────────────────
// MONITORING — chorak testlari va so'rovnomalar
//
//   kind = "test"    → to'g'ri javobli, ball hisoblanadigan test (reyting/tahlilga kiradi)
//   kind = "survey"  → to'g'ri javobsiz so'rovnoma (faqat fikrlar statistikasi,
//                      reyting va tahlilga KIRMAYDI, Telegram o'yinlarining savol bankiga ham kirmaydi)
//
// Maktab izolyatsiyasi: admin (tuman) hammasini, qolganlar faqat o'z maktabini ko'radi.
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool, query, queryOne } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";

const router: IRouter = Router();

type User = Record<string, unknown>;
type Kind = "test" | "survey";

// Boshqaruv: barcha maktab testlari; o'qituvchilar — faqat o'zi yaratganlari
const MANAGE_ROLES = ["admin", "director", "zam_direktor", "zavuch"];
const STAFF_ROLES = [...MANAGE_ROLES, "teacher", "sinf_rahbari", "boshlangich_oqituvchi"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = process.env["TOKEN_SECRET"] ?? process.env["JWT_SECRET"] ?? "talim-dev-secret";

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const roleOf = (u: User): string => str(u["role"]);
const loginOf = (u: User): string => str(u["login"]);

function pct(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 1000) / 10;
}

/** O'quv yili va chorak — hozirgi sanaga qarab */
function currentAcademicYear(d = new Date()): string {
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
function currentQuarter(d = new Date()): number {
  const m = d.getMonth() + 1;
  if (m >= 9 && m <= 10) return 1;
  if (m >= 11 || m === 12) return 2;
  if (m >= 1 && m <= 3) return 3;
  return 4;
}

/** Anonim so'rovnomada o'quvchi shaxsini yashiruvchi, lekin "bir marta" qoidasini saqlovchi kalit */
function anonKey(login: string, testId: string): string {
  return "anon_" + createHmac("sha256", SECRET).update(`${testId}:${login}`).digest("hex").slice(0, 32);
}

interface TestRow {
  id: string; title: string; subject: string; class_name: string | null;
  quarter: number; academic_year: string; duration_minutes: number;
  is_anonymous: boolean; show_result_immediately: boolean; has_options: boolean;
  status: "draft" | "open" | "closed"; opens_at: string | null; closes_at: string | null;
  scheduled_open_at: string | null; timed: boolean; pause_seconds: number;
  maktab_id: number; kind: Kind; created_by_login: string | null; created_at: string;
}
interface QuestionRow {
  id: string; test_id: string; question: string; options: string[] | null;
  correct_index: number | null; correct_text: string | null; order_index: number;
  difficulty: "oson" | "orta" | "qiyin"; time_seconds: number | null;
}
interface StoredAnswer { question_id: string; chosen_index?: number; text_answer?: string }

/** O'quvchi shu test uchun qanday kalit bilan yozilgan */
function attemptKey(t: Pick<TestRow, "id" | "kind" | "is_anonymous">, login: string): string {
  return t.kind === "survey" && t.is_anonymous ? anonKey(login, t.id) : login;
}

function parseAnswers(raw: unknown): StoredAnswer[] {
  let v = raw;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return []; } }
  return Array.isArray(v) ? (v as StoredAnswer[]) : [];
}

// ─── Ruxsat yordamchilari ────────────────────────────────────────────────────
function staffUser(req: Request, res: Response): User | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !STAFF_ROLES.includes(roleOf(u))) { res.status(403).json({ error: "Ruxsat yo'q" }); return null; }
  return u;
}
function analyticsUser(req: Request, res: Response): User | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !MANAGE_ROLES.includes(roleOf(u))) { res.status(403).json({ error: "Ruxsat yo'q" }); return null; }
  return u;
}
function studentUser(req: Request, res: Response): User | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || roleOf(u) !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return null; }
  return u;
}

async function loadTest(id: string | undefined): Promise<TestRow | null> {
  if (!id || !UUID_RE.test(id)) return null;
  return queryOne<TestRow>("SELECT * FROM monitoring_tests WHERE id = $1", [id]);
}
function sameSchool(user: User, t: TestRow): boolean {
  const mid = schoolOf(user);
  return mid === null || t.maktab_id === mid;
}
/** Tahrirlash / o'chirish / natijalarni ko'rish huquqi */
function canManage(user: User, t: TestRow): boolean {
  if (!sameSchool(user, t)) return false;
  return MANAGE_ROLES.includes(roleOf(user)) || t.created_by_login === loginOf(user);
}
/** Staff + test + huquqni bir joyda tekshiradi */
async function managedTest(req: Request, res: Response): Promise<{ user: User; test: TestRow } | null> {
  const user = staffUser(req, res);
  if (!user) return null;
  const test = await loadTest(req.params["id"] as string | undefined);
  if (!test || !sameSchool(user, test)) { res.status(404).json({ error: "Topilmadi" }); return null; }
  if (!canManage(user, test)) { res.status(403).json({ error: "Bu test sizga tegishli emas" }); return null; }
  return { user, test };
}
function fail(res: Response, err: unknown, msg: string): void {
  console.error(`[monitoring] ${msg}:`, (err as Error).message);
  res.status(500).json({ error: msg });
}

// ─── Avto-ochilish ───────────────────────────────────────────────────────────
let schedulerStarted = false;
export function startMonitoringScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      await query(
        `UPDATE monitoring_tests SET status = 'open', opens_at = NOW()
          WHERE status = 'draft' AND scheduled_open_at IS NOT NULL AND scheduled_open_at <= NOW()`
      );
    } catch (err) {
      console.error("Monitoring scheduler xatosi:", (err as Error).message);
    }
  };
  void tick();
  setInterval(() => void tick(), 20_000);
}

// ═════════════════════════════════════════════════════════════════════════════
//  XODIMLAR: ro'yxat, yaratish, tahrirlash, holat, o'chirish
// ═════════════════════════════════════════════════════════════════════════════

router.get("/monitoring/tests", async (req, res): Promise<void> => {
  const user = staffUser(req, res);
  if (!user) return;
  const kind = req.query["kind"] === "survey" ? "survey" : req.query["kind"] === "test" ? "test" : null;
  try {
    const rows = await query<TestRow & { attempts_count: number; question_count: number }>(
      `SELECT t.*,
              (SELECT COUNT(*) FROM monitoring_attempts a WHERE a.test_id = t.id)::int AS attempts_count,
              (SELECT COUNT(*) FROM monitoring_questions q WHERE q.test_id = t.id)::int AS question_count
         FROM monitoring_tests t
        WHERE ($1::int IS NULL OR t.maktab_id = $1)
          AND ($2::text IS NULL OR t.kind = $2)
        ORDER BY t.created_at DESC`,
      [schoolOf(user), kind]
    );
    res.json(rows.map((t) => ({ ...t, can_edit: canManage(user, t) })));
  } catch (err) { fail(res, err, "Ro'yxatni yuklab bo'lmadi"); }
});

const QuestionBody = z.object({
  question: z.string().trim().min(2).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(8).optional(),
  correct_index: z.number().int().min(0).optional(),
  correct_text: z.string().trim().min(1).max(200).optional(),
  difficulty: z.enum(["oson", "orta", "qiyin"]).default("orta"),
  time_seconds: z.number().int().min(5).max(600).nullable().optional(),
});

const TestBody = z.object({
  kind: z.enum(["test", "survey"]).default("test"),
  title: z.string().trim().min(3).max(200),
  subject: z.string().trim().min(2).max(100).default("So'rovnoma"),
  class_name: z.string().nullable().optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  academic_year: z.string().min(4).optional(),
  duration_minutes: z.number().int().min(5).max(180).default(30),
  is_anonymous: z.boolean().default(false),
  show_result_immediately: z.boolean().default(true),
  has_options: z.boolean().default(true),
  scheduled_open_at: z.string().datetime().nullable().optional(),
  timed: z.boolean().default(true),
  pause_seconds: z.number().int().min(0).max(60).default(0),
  questions: z.array(QuestionBody).min(1).max(200),
});
type TestInput = Omit<z.infer<typeof TestBody>, "quarter" | "academic_year"> & { quarter: number; academic_year: string };

/** Chorak va o'quv yili ko'rsatilmasa — hozirgi sanaga qarab to'ldiriladi */
function withDefaults(d: z.infer<typeof TestBody>): TestInput {
  return { ...d, quarter: d.quarter ?? currentQuarter(), academic_year: d.academic_year ?? currentAcademicYear() };
}

/** Turga qarab maydonlarni normallashtiradi va savollarni tekshiradi. Xato bo'lsa matn qaytaradi. */
function normalize(d: TestInput, kind: Kind): string | null {
  if (kind === "survey") {
    // So'rovnoma: faqat variantli, vaqtsiz, to'g'ri javobsiz
    d.has_options = true; d.timed = false; d.pause_seconds = 0; d.duration_minutes = 0;
    d.show_result_immediately = false;
    for (const q of d.questions) {
      if (!q.options || q.options.length < 2) return `"${q.question}" savolida kamida 2 variant bo'lishi kerak`;
    }
    return null;
  }
  for (const q of d.questions) {
    if (d.has_options) {
      if (!q.options || q.options.length < 2) return `"${q.question}" savolida kamida 2 variant bo'lishi kerak`;
      if (q.correct_index === undefined || q.correct_index >= q.options.length) return `"${q.question}" savolida to'g'ri javob belgilanmagan`;
    } else if (!q.correct_text) {
      return `"${q.question}" savolida to'g'ri javob matni kiritilmagan`;
    }
  }
  return null;
}

async function insertQuestions(db: PoolClient, testId: string, d: TestInput, kind: Kind, mid: number): Promise<void> {
  for (let i = 0; i < d.questions.length; i++) {
    const q = d.questions[i]!;
    const withOptions = kind === "survey" || d.has_options;
    await db.query(
      `INSERT INTO monitoring_questions
         (test_id, question, options, correct_index, correct_text, order_index, difficulty, time_seconds, maktab_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        testId, q.question,
        withOptions ? JSON.stringify(q.options) : "[]",
        kind === "test" && d.has_options ? q.correct_index : null,
        kind === "test" && !d.has_options ? q.correct_text : null,
        i, q.difficulty, d.timed && kind === "test" ? (q.time_seconds ?? null) : null, mid,
      ]
    );
  }
}

router.post("/monitoring/tests", async (req, res): Promise<void> => {
  const user = staffUser(req, res);
  if (!user) return;
  const parsed = TestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Ma'lumotlar to'liq emas: " + parsed.error.issues[0]?.message }); return; }
  const d = withDefaults(parsed.data);
  const kind = d.kind;
  const problem = normalize(d, kind);
  if (problem) { res.status(400).json({ error: problem }); return; }

  const mid = schoolOf(user) ?? 3;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO monitoring_tests
         (kind, title, subject, class_name, quarter, academic_year, duration_minutes, is_anonymous,
          show_result_immediately, has_options, scheduled_open_at, status, created_by_login, timed, pause_seconds, maktab_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12,$13,$14,$15)
       RETURNING id`,
      [kind, d.title, d.subject, d.class_name ?? null, d.quarter, d.academic_year, d.duration_minutes,
       d.is_anonymous, d.show_result_immediately, d.has_options, d.scheduled_open_at ?? null,
       loginOf(user), d.timed, d.pause_seconds, mid]
    );
    const id = ins.rows[0].id as string;
    await insertQuestions(client, id, d, kind, mid);
    await client.query("COMMIT");
    res.status(201).json({ id });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    fail(res, err, "Saqlashda xatolik yuz berdi");
  } finally { client.release(); }
});

// To'liq ma'lumot (tahrirlash uchun) — to'g'ri javoblar bilan
router.get("/monitoring/tests/:id", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  try {
    const questions = await query<QuestionRow>(
      "SELECT * FROM monitoring_questions WHERE test_id = $1 ORDER BY order_index", [ctx.test.id]
    );
    const cnt = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM monitoring_attempts WHERE test_id = $1", [ctx.test.id]);
    res.json({ ...ctx.test, attempts_count: cnt?.n ?? 0, questions });
  } catch (err) { fail(res, err, "Yuklab bo'lmadi"); }
});

router.put("/monitoring/tests/:id", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  const parsed = TestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Ma'lumotlar to'liq emas: " + parsed.error.issues[0]?.message }); return; }
  const d = withDefaults(parsed.data);
  const kind = ctx.test.kind; // tur o'zgarmaydi
  const problem = normalize(d, kind);
  if (problem) { res.status(400).json({ error: problem }); return; }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cnt = await client.query("SELECT COUNT(*)::int AS n FROM monitoring_attempts WHERE test_id = $1", [ctx.test.id]);
    const locked = (cnt.rows[0].n as number) > 0;

    if (locked) {
      // Javoblar bor: savollar, variantlar va anonimlik o'zgarmaydi — faqat umumiy sozlamalar
      await client.query(
        `UPDATE monitoring_tests
            SET title=$1, subject=$2, class_name=$3, quarter=$4, academic_year=$5, scheduled_open_at=$6
          WHERE id=$7`,
        [d.title, d.subject, d.class_name ?? null, d.quarter, d.academic_year, d.scheduled_open_at ?? null, ctx.test.id]
      );
    } else {
      await client.query(
        `UPDATE monitoring_tests
            SET title=$1, subject=$2, class_name=$3, quarter=$4, academic_year=$5, duration_minutes=$6,
                is_anonymous=$7, show_result_immediately=$8, has_options=$9, scheduled_open_at=$10,
                timed=$11, pause_seconds=$12
          WHERE id=$13`,
        [d.title, d.subject, d.class_name ?? null, d.quarter, d.academic_year, d.duration_minutes,
         d.is_anonymous, d.show_result_immediately, d.has_options, d.scheduled_open_at ?? null,
         d.timed, d.pause_seconds, ctx.test.id]
      );
      await client.query("DELETE FROM monitoring_questions WHERE test_id = $1", [ctx.test.id]);
      await insertQuestions(client, ctx.test.id, d, kind, ctx.test.maktab_id);
    }
    await client.query("COMMIT");
    res.json({ ok: true, questions_locked: locked });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    fail(res, err, "Saqlashda xatolik yuz berdi");
  } finally { client.release(); }
});

router.patch("/monitoring/tests/:id/status", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  const parsed = z.object({ status: z.enum(["draft", "open", "closed"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Noto'g'ri holat" }); return; }
  try {
    await query(
      `UPDATE monitoring_tests
          SET status = $1::text,
              opens_at  = CASE WHEN $1::text = 'open'   THEN COALESCE(opens_at, NOW()) ELSE opens_at END,
              closes_at = CASE WHEN $1::text = 'closed' THEN NOW() ELSE closes_at END,
              scheduled_open_at = CASE WHEN $1::text = 'open' THEN NULL ELSE scheduled_open_at END
        WHERE id = $2`,
      [parsed.data.status, ctx.test.id]
    );
    res.json({ ok: true });
  } catch (err) { fail(res, err, "Holatni o'zgartirib bo'lmadi"); }
});

router.delete("/monitoring/tests/:id", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  try {
    await query("DELETE FROM monitoring_tests WHERE id = $1", [ctx.test.id]);
    res.json({ ok: true });
  } catch (err) { fail(res, err, "O'chirib bo'lmadi"); }
});

// ═════════════════════════════════════════════════════════════════════════════
//  NATIJALAR
// ═════════════════════════════════════════════════════════════════════════════

// Test: o'quvchilar ro'yxati (ism bilan). So'rovnoma: ism ko'rsatilmaydi — faqat sinflar kesimi.
router.get("/monitoring/tests/:id/results", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  try {
    if (ctx.test.kind === "survey") { res.json([]); return; }
    const rows = await query<{ student_login: string; student_name: string; class_name: string; score: number; total: number; submitted_at: string }>(
      `SELECT student_login, student_name, class_name, score, total, submitted_at
         FROM monitoring_attempts WHERE test_id = $1 ORDER BY score DESC, submitted_at ASC`,
      [ctx.test.id]
    );
    res.json(rows.map((r) => ({ ...r, percentage: pct(r.score, r.total) })));
  } catch (err) { fail(res, err, "Natijalarni yuklab bo'lmadi"); }
});

// Savollar kesimida statistika: har variantni nechta o'quvchi tanlagani + sinflar bo'yicha ishtirok
router.get("/monitoring/tests/:id/stats", async (req, res): Promise<void> => {
  const ctx = await managedTest(req, res);
  if (!ctx) return;
  try {
    const questions = await query<QuestionRow>(
      "SELECT * FROM monitoring_questions WHERE test_id = $1 ORDER BY order_index", [ctx.test.id]
    );
    const attempts = await query<{ class_name: string; answers: unknown }>(
      "SELECT class_name, answers FROM monitoring_attempts WHERE test_id = $1", [ctx.test.id]
    );

    const counts = new Map<string, number[]>();
    const answered = new Map<string, number>();
    for (const q of questions) {
      counts.set(q.id, (q.options ?? []).map(() => 0));
      answered.set(q.id, 0);
    }
    const byClass = new Map<string, number>();
    for (const a of attempts) {
      byClass.set(a.class_name || "—", (byClass.get(a.class_name || "—") ?? 0) + 1);
      for (const ans of parseAnswers(a.answers)) {
        const arr = counts.get(ans.question_id);
        if (!arr || typeof ans.chosen_index !== "number") continue;
        if (ans.chosen_index >= 0 && ans.chosen_index < arr.length) {
          arr[ans.chosen_index] = (arr[ans.chosen_index] ?? 0) + 1;
          answered.set(ans.question_id, (answered.get(ans.question_id) ?? 0) + 1);
        }
      }
    }

    res.json({
      kind: ctx.test.kind,
      total: attempts.length,
      by_class: [...byClass.entries()]
        .map(([class_name, count]) => ({ class_name, count }))
        .sort((a, b) => a.class_name.localeCompare(b.class_name, undefined, { numeric: true })),
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options ?? [],
        counts: counts.get(q.id) ?? [],
        answered: answered.get(q.id) ?? 0,
        // To'g'ri javob faqat testda ko'rsatiladi
        correct_index: ctx.test.kind === "test" ? q.correct_index : null,
      })),
    });
  } catch (err) { fail(res, err, "Statistikani yuklab bo'lmadi"); }
});

// ═════════════════════════════════════════════════════════════════════════════
//  TAHLIL / REYTING (faqat kind = 'test') — rahbariyat uchun
// ═════════════════════════════════════════════════════════════════════════════

router.get("/monitoring/analytics/overview", async (req, res): Promise<void> => {
  const user = analyticsUser(req, res);
  if (!user) return;
  const mid = schoolOf(user);
  try {
    const classRows = await query<{ class_name: string; ts: string; tm: string; n: string }>(
      `SELECT a.class_name, SUM(a.score) AS ts, SUM(a.total) AS tm, COUNT(*) AS n
         FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
        WHERE t.kind = 'test' AND ($1::int IS NULL OR a.maktab_id = $1)
        GROUP BY a.class_name`,
      [mid]
    );
    const studentRows = await query<{ student_login: string; student_name: string; class_name: string; ts: string; tm: string; n: string }>(
      `SELECT a.student_login, a.student_name, a.class_name, SUM(a.score) AS ts, SUM(a.total) AS tm, COUNT(*) AS n
         FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
        WHERE t.kind = 'test' AND ($1::int IS NULL OR a.maktab_id = $1)
        GROUP BY a.student_login, a.student_name, a.class_name`,
      [mid]
    );

    const totalScore = classRows.reduce((s, r) => s + Number(r.ts), 0);
    const totalMax = classRows.reduce((s, r) => s + Number(r.tm), 0);
    const totalAttempts = classRows.reduce((s, r) => s + Number(r.n), 0);

    const rank = <T extends { percentage: number }>(rows: T[]) =>
      rows.sort((a, b) => b.percentage - a.percentage).map((r, i) => ({ ...r, place: i + 1 }));

    res.json({
      school_percentage: pct(totalScore, totalMax),
      total_attempts: totalAttempts,
      class_ranking: rank(classRows.map((c) => ({ class_name: c.class_name, percentage: pct(Number(c.ts), Number(c.tm)), attempts: Number(c.n) }))),
      student_ranking: rank(studentRows.map((s) => ({
        student_login: s.student_login, student_name: s.student_name, class_name: s.class_name,
        percentage: pct(Number(s.ts), Number(s.tm)), attempts: Number(s.n),
      }))),
    });
  } catch (err) { fail(res, err, "Tahlilni yuklab bo'lmadi"); }
});

router.get("/monitoring/analytics/class/:className", async (req, res): Promise<void> => {
  const user = analyticsUser(req, res);
  if (!user) return;
  const className = req.params["className"] as string;
  const mid = schoolOf(user);
  try {
    const subjectRows = await query<{ subject: string; ts: string; tm: string; n: string }>(
      `SELECT t.subject, SUM(a.score) AS ts, SUM(a.total) AS tm, COUNT(*) AS n
         FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
        WHERE t.kind = 'test' AND a.class_name = $1 AND ($2::int IS NULL OR a.maktab_id = $2)
        GROUP BY t.subject ORDER BY t.subject`,
      [className, mid]
    );
    const studentRows = await query<{ student_login: string; student_name: string; ts: string; tm: string; n: string }>(
      `SELECT a.student_login, a.student_name, SUM(a.score) AS ts, SUM(a.total) AS tm, COUNT(*) AS n
         FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
        WHERE t.kind = 'test' AND a.class_name = $1 AND ($2::int IS NULL OR a.maktab_id = $2)
        GROUP BY a.student_login, a.student_name`,
      [className, mid]
    );
    res.json({
      class_name: className,
      subjects: subjectRows.map((s) => ({ subject: s.subject, percentage: pct(Number(s.ts), Number(s.tm)), attempts: Number(s.n) })),
      students: studentRows
        .map((s) => ({ student_login: s.student_login, student_name: s.student_name, percentage: pct(Number(s.ts), Number(s.tm)), attempts: Number(s.n) }))
        .sort((a, b) => b.percentage - a.percentage)
        .map((s, i) => ({ ...s, place: i + 1 })),
    });
  } catch (err) { fail(res, err, "Sinf tahlilini yuklab bo'lmadi"); }
});

// ═════════════════════════════════════════════════════════════════════════════
//  O'QUVCHI
// ═════════════════════════════════════════════════════════════════════════════

type OpenItem = Pick<TestRow, "id" | "kind" | "title" | "subject" | "quarter" | "duration_minutes" | "is_anonymous" | "status" | "scheduled_open_at"> & { question_count: number };

router.get("/monitoring/student-home", async (req, res): Promise<void> => {
  const user = studentUser(req, res);
  if (!user) return;
  const className = str(user["class_name"]);
  const login = loginOf(user);
  const mid = schoolOf(user);

  try {
    // Shu o'quvchiga tegishli: ochiq test/so'rovnomalar, rejalashtirilganlar, yopilgan so'rovnomalar
    const items = await query<OpenItem>(
      `SELECT t.id, t.kind, t.title, t.subject, t.quarter, t.duration_minutes, t.is_anonymous, t.status, t.scheduled_open_at,
              (SELECT COUNT(*) FROM monitoring_questions q WHERE q.test_id = t.id)::int AS question_count
         FROM monitoring_tests t
        WHERE ($1::int IS NULL OR t.maktab_id = $1)
          AND (t.class_name IS NULL OR t.class_name = $2)
          AND (t.status = 'open' OR (t.status = 'draft' AND t.scheduled_open_at IS NOT NULL) OR (t.status = 'closed' AND t.kind = 'survey'))
        ORDER BY t.opens_at ASC NULLS LAST, t.scheduled_open_at ASC NULLS LAST, t.created_at DESC`,
      [mid, className]
    );

    // Qaysilarini allaqachon topshirgan
    const ids = items.map((i) => i.id);
    const keys = new Set<string>([login]);
    for (const i of items) keys.add(attemptKey(i, login));
    const doneRows = ids.length
      ? await query<{ test_id: string; student_login: string }>(
          `SELECT test_id, student_login FROM monitoring_attempts
            WHERE test_id = ANY($1::uuid[]) AND student_login = ANY($2::text[])`,
          [ids, [...keys]]
        )
      : [];
    const done = new Set(doneRows.map((r) => `${r.test_id}|${r.student_login}`));
    const isDone = (i: OpenItem) => done.has(`${i.id}|${attemptKey(i, login)}`);

    const pick = (i: OpenItem) => ({
      id: i.id, title: i.title, subject: i.subject, quarter: i.quarter,
      duration_minutes: i.duration_minutes, is_anonymous: i.is_anonymous, question_count: i.question_count,
    });

    const openTests = items.filter((i) => i.kind === "test" && i.status === "open" && !isDone(i)).map(pick);
    const upcoming = items
      .filter((i) => i.status === "draft" && i.scheduled_open_at)
      .map((i) => ({ ...pick(i), kind: i.kind, scheduled_open_at: i.scheduled_open_at as string }));
    const openSurveys = items.filter((i) => i.kind === "survey" && i.status === "open" && !isDone(i)).map(pick);
    const doneSurveys = items.filter((i) => i.kind === "survey" && isDone(i)).map((i) => ({ id: i.id, title: i.title }));

    const archive = await query<{ test_id: string; title: string; subject: string; quarter: number; score: number; total: number; submitted_at: string }>(
      `SELECT a.test_id, t.title, t.subject, t.quarter, a.score, a.total, a.submitted_at
         FROM monitoring_attempts a JOIN monitoring_tests t ON t.id = a.test_id
        WHERE a.student_login = $1 AND t.kind = 'test'
        ORDER BY a.submitted_at DESC`,
      [login]
    );

    res.json({
      student_name: str(user["full_name"]),
      class_name: className,
      tests: {
        open: openTests,
        upcoming,
        archive: archive.map((a) => ({ ...a, percentage: pct(a.score, a.total) })),
      },
      surveys: { open: openSurveys, done: doneSurveys },
    });
  } catch (err) { fail(res, err, "Ma'lumotlarni yuklab bo'lmadi"); }
});

/** O'quvchi shu testni ishlay oladimi? (maktab, sinf, holat, bir martalik) */
async function studentAccess(user: User, testId: string | undefined, res: Response): Promise<TestRow | null> {
  const test = await loadTest(testId);
  const mid = schoolOf(user);
  const classOk = !test || !test.class_name || test.class_name === str(user["class_name"]);
  if (!test || test.status !== "open" || !classOk || (mid !== null && test.maktab_id !== mid)) {
    res.status(404).json({ error: "Topilmadi yoki hali ochilmagan / yopilgan" });
    return null;
  }
  const already = await queryOne(
    "SELECT 1 FROM monitoring_attempts WHERE test_id = $1 AND student_login = $2",
    [test.id, attemptKey(test, loginOf(user))]
  );
  if (already) { res.status(409).json({ error: "Siz bu bo'limni allaqachon topshirgansiz" }); return null; }
  return test;
}

router.get("/monitoring/tests/:id/take", async (req, res): Promise<void> => {
  const user = studentUser(req, res);
  if (!user) return;
  try {
    const test = await studentAccess(user, req.params["id"] as string | undefined, res);
    if (!test) return;
    const questions = await query<Pick<QuestionRow, "id" | "question" | "options" | "difficulty" | "time_seconds">>(
      "SELECT id, question, options, difficulty, time_seconds FROM monitoring_questions WHERE test_id = $1 ORDER BY order_index",
      [test.id]
    );
    res.json({
      test: {
        id: test.id, kind: test.kind, title: test.title, subject: test.subject, quarter: test.quarter,
        duration_minutes: test.duration_minutes, has_options: test.has_options, is_anonymous: test.is_anonymous,
        timed: test.timed, pause_seconds: test.pause_seconds,
      },
      questions,
      server_now: new Date().toISOString(),
    });
  } catch (err) { fail(res, err, "Yuklab bo'lmadi"); }
});

const SubmitBody = z.object({
  answers: z.array(z.object({
    question_id: z.string(),
    chosen_index: z.number().int().min(0).optional(),
    text_answer: z.string().max(300).optional(),
  })).max(300),
});

router.post("/monitoring/tests/:id/submit", async (req, res): Promise<void> => {
  const user = studentUser(req, res);
  if (!user) return;
  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Javoblar noto'g'ri shaklda" }); return; }

  try {
    const test = await studentAccess(user, req.params["id"] as string | undefined, res);
    if (!test) return;

    const questions = await query<Pick<QuestionRow, "id" | "options" | "correct_index" | "correct_text">>(
      "SELECT id, options, correct_index, correct_text FROM monitoring_questions WHERE test_id = $1", [test.id]
    );
    const byId = new Map(questions.map((q) => [q.id, q]));
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

    let score = 0;
    const stored: StoredAnswer[] = [];
    const breakdown: { question_id: string; correct: boolean }[] = [];
    const seen = new Set<string>();

    for (const a of parsed.data.answers) {
      const q = byId.get(a.question_id);
      if (!q || seen.has(a.question_id)) continue;
      seen.add(a.question_id);

      if (test.kind === "survey") {
        const max = (q.options ?? []).length;
        if (a.chosen_index !== undefined && a.chosen_index < max) stored.push({ question_id: q.id, chosen_index: a.chosen_index });
        continue;
      }
      let ok = false;
      if (test.has_options) {
        ok = a.chosen_index !== undefined && q.correct_index === a.chosen_index;
        stored.push({ question_id: q.id, chosen_index: a.chosen_index });
      } else {
        ok = !!a.text_answer && !!q.correct_text && norm(a.text_answer) === norm(q.correct_text);
        stored.push({ question_id: q.id, text_answer: a.text_answer });
      }
      if (ok) score++;
      breakdown.push({ question_id: q.id, correct: ok });
    }

    if (test.kind === "survey" && stored.length < questions.length) {
      res.status(400).json({ error: "Barcha savollarga javob bering" });
      return;
    }

    const total = questions.length;
    const anonymous = test.kind === "survey" && test.is_anonymous;
    try {
      await query(
        `INSERT INTO monitoring_attempts (test_id, student_login, student_name, class_name, answers, score, total, maktab_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [test.id, attemptKey(test, loginOf(user)), anonymous ? "Anonim" : str(user["full_name"]),
         str(user["class_name"]), JSON.stringify(stored), test.kind === "survey" ? 0 : score, total, test.maktab_id]
      );
    } catch (err) {
      if ((err as { code?: string }).code === "23505") { res.status(409).json({ error: "Siz bu bo'limni allaqachon topshirgansiz" }); return; }
      throw err;
    }

    if (test.kind === "survey") { res.json({ kind: "survey", submitted: true }); return; }
    if (!test.show_result_immediately) { res.json({ kind: "test", submitted: true }); return; }
    res.json({ kind: "test", score, total, percentage: pct(score, total), correct_count: score, incorrect_count: total - score, breakdown });
  } catch (err) { fail(res, err, "Javoblarni yuborib bo'lmadi"); }
});

// Test bo'yicha reyting (o'quvchilarga). Anonim bo'lsa ismlar yashiriladi.
router.get("/monitoring/tests/:id/leaderboard", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const test = await loadTest(req.params["id"] as string | undefined);
  if (!test || test.kind !== "test" || !sameSchool(user, test)) { res.status(404).json({ error: "Topilmadi" }); return; }
  try {
    const rows = await query<{ student_login: string; student_name: string; class_name: string; score: number; total: number }>(
      `SELECT student_login, student_name, class_name, score, total
         FROM monitoring_attempts WHERE test_id = $1 ORDER BY score DESC, submitted_at ASC`,
      [test.id]
    );
    const isStaff = STAFF_ROLES.includes(roleOf(user));
    const me = loginOf(user);
    res.json(rows.map((r, idx) => ({
      place: idx + 1,
      student_name: isStaff || !test.is_anonymous || r.student_login === me ? r.student_name : `O'quvchi #${idx + 1}`,
      class_name: r.class_name, score: r.score, total: r.total, is_me: r.student_login === me,
    })));
  } catch (err) { fail(res, err, "Reytingni yuklab bo'lmadi"); }
});

export default router;
