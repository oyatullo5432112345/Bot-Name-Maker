import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

// ============================================================
// "BEK VA LOLA: SAYOHAT v2" — server tomoni
// ------------------------------------------------------------
//  Asosiy g'oya: savollar BAZADA, baholash SERVERDA (anti-cheat).
//  To'g'ri javob o'quvchiga HECH QACHON yuborilmaydi — faqat
//  javob yuborilgandan keyin natija bilan birga qaytariladi.
//
//  O'quvchi uchun:
//   GET  /sayohat/regions              — viloyatlar (ochilish vaqti + savol soni)
//   GET  /sayohat/questions            — viloyat savollari (javobsiz)
//   POST /sayohat/submit               — javoblarni serverga yuborish (server baholaydi)
//   GET  /sayohat/progress             — holat + umumiy ball
//   POST /sayohat/progress             — holatni saqlash (kosmetik)
//
//  Admin (rahbariyat) uchun:
//   GET    /sayohat/admin/regions        — barcha viloyatlar (boshqaruv)
//   POST   /sayohat/admin/regions/:id    — ochilish vaqti / faollik
//   GET    /sayohat/admin/questions      — viloyat savollari (javobi bilan)
//   POST   /sayohat/admin/questions      — savol qo'shish
//   PUT    /sayohat/admin/questions/:id  — savolni tahrirlash
//   DELETE /sayohat/admin/questions/:id  — savolni o'chirish
//   GET    /sayohat/admin/stats          — statistika
// ============================================================

const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];
const DIFFS = ["oson", "orta", "qiyin"] as const;

type AuthUser = Record<string, unknown>;
function auth(req: { headers: { authorization?: string } }): AuthUser | null {
  return getAuthUser(req.headers.authorization);
}
function uid(u: AuthUser): string {
  return (u["login"] as string) ?? "";
}
function isMgmt(u: AuthUser): boolean {
  return MGMT_ROLES.includes(u["role"] as string);
}

// Yulduz: to'g'ri javoblar nisbatiga qarab (0..3)
function calcStars(correct: number, total: number): number {
  if (total <= 0) return 0;
  const r = correct / total;
  if (r >= 0.999) return 3;
  if (r >= 0.6) return 2;
  if (r >= 0.4) return 1;
  return 0;
}

interface QuestionRow {
  id: number;
  region_id: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  hint: string;
  points: number;
  is_active: boolean;
}

// Viloyat ochiqmi? (vaqt darvozasi) — rahbariyat uchun har doim ochiq
function regionTimeOpen(unlockAt: string | null, user: AuthUser): boolean {
  if (isMgmt(user)) return true;
  if (!unlockAt) return true; // vaqt belgilanmagan — jadval tartibi frontendda hal qilinadi
  return Date.now() >= new Date(unlockAt).getTime();
}

// ============================================================
//  O'QUVCHI / O'YINCHI
// ============================================================

// GET /sayohat/regions — faol viloyatlar + ochilish vaqti + savol soni
router.get("/sayohat/regions", async (req, res): Promise<void> => {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  try {
    const rows = await query<{
      id: string; title: string; order_index: number; unlock_at: string | null; is_active: boolean;
      oson: string; orta: string; qiyin: string;
    }>(
      `SELECT r.id, r.title, r.order_index, r.unlock_at, r.is_active,
         COUNT(q.id) FILTER (WHERE q.difficulty='oson'  AND q.is_active) AS oson,
         COUNT(q.id) FILTER (WHERE q.difficulty='orta'  AND q.is_active) AS orta,
         COUNT(q.id) FILTER (WHERE q.difficulty='qiyin' AND q.is_active) AS qiyin
       FROM sayohat_regions r
       LEFT JOIN sayohat_questions q ON q.region_id = r.id
       WHERE r.is_active = TRUE
       GROUP BY r.id
       ORDER BY r.order_index`,
    );
    res.json(rows.map((r) => ({
      id: r.id,
      title: r.title,
      order_index: r.order_index,
      unlock_at: r.unlock_at,
      counts: { oson: Number(r.oson), orta: Number(r.orta), qiyin: Number(r.qiyin) },
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /sayohat/questions?region_id=&difficulty= — JAVOBSIZ savollar
router.get("/sayohat/questions", async (req, res): Promise<void> => {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const region_id = String(req.query["region_id"] ?? "");
  const difficulty = String(req.query["difficulty"] ?? "");
  if (!region_id || !DIFFS.includes(difficulty as typeof DIFFS[number])) {
    res.status(400).json({ error: "region_id va to'g'ri difficulty kerak" });
    return;
  }

  try {
    const region = await queryOne<{ unlock_at: string | null; is_active: boolean }>(
      "SELECT unlock_at, is_active FROM sayohat_regions WHERE id = $1",
      [region_id],
    );
    if (!region || !region.is_active) { res.status(404).json({ error: "Viloyat topilmadi" }); return; }
    if (!regionTimeOpen(region.unlock_at, user)) { res.status(403).json({ error: "Bu viloyat hali ochilmagan" }); return; }

    const rows = await query<QuestionRow>(
      `SELECT id, question_text, options, hint, points
       FROM sayohat_questions
       WHERE region_id = $1 AND difficulty = $2 AND is_active = TRUE
       ORDER BY id`,
      [region_id, difficulty],
    );
    // To'g'ri javob (correct_index) va explanation YUBORILMAYDI — anti-cheat
    res.json(rows.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      hint: q.hint,
      points: q.points,
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /sayohat/submit — server baholaydi va tanga beradi
const SubmitBody = z.object({
  region_id: z.string().min(1).max(50),
  difficulty: z.enum(DIFFS),
  answers: z.array(z.object({
    question_id: z.number().int(),
    chosen_index: z.number().int().min(0).max(10),
  })).min(1).max(100),
});

router.post("/sayohat/submit", async (req, res): Promise<void> => {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = uid(user);

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { region_id, difficulty, answers } = parsed.data;

  try {
    const region = await queryOne<{ unlock_at: string | null; is_active: boolean }>(
      "SELECT unlock_at, is_active FROM sayohat_regions WHERE id = $1",
      [region_id],
    );
    if (!region || !region.is_active) { res.status(404).json({ error: "Viloyat topilmadi" }); return; }
    if (!regionTimeOpen(region.unlock_at, user)) { res.status(403).json({ error: "Bu viloyat hali ochilmagan" }); return; }

    // Shu viloyat+daraja uchun BARCHA faol savollar (server haqiqati)
    const questions = await query<QuestionRow>(
      `SELECT id, difficulty, correct_index, explanation, points
       FROM sayohat_questions
       WHERE region_id = $1 AND difficulty = $2 AND is_active = TRUE`,
      [region_id, difficulty],
    );
    if (questions.length === 0) { res.status(400).json({ error: "Bu viloyatda savol yo'q" }); return; }

    const byId = new Map(questions.map((q) => [q.id, q]));
    const chosenById = new Map(answers.map((a) => [a.question_id, a.chosen_index]));

    // Baholash — jami = viloyatdagi barcha savollar (kam javob yuborib aldab bo'lmaydi)
    let correct = 0;
    let earned = 0;
    const perQuestion = questions.map((q) => {
      const chosen = chosenById.has(q.id) ? chosenById.get(q.id)! : -1;
      const ok = chosen === q.correct_index;
      if (ok) { correct += 1; earned += q.points; }
      return {
        question_id: q.id,
        chosen_index: chosen,
        correct_index: q.correct_index,
        is_correct: ok,
        explanation: q.explanation,
      };
    });
    const total = questions.length;
    const stars = calcStars(correct, total);

    // ─── Tanga (anti-cheat: viloyatdan bir marta; yaxshilansa farqi) ───
    let coinsDelta = 0;
    if (stars >= 1) {
      const prev = await queryOne<{ stars: number; coins_awarded: number }>(
        "SELECT stars, coins_awarded FROM sayohat_awards WHERE user_id = $1 AND region_id = $2",
        [login, region_id],
      );
      const prevCoins = prev?.coins_awarded ?? 0;
      const prevStars = prev?.stars ?? 0;
      coinsDelta = Math.max(0, earned - prevCoins);
      const newCoins = Math.max(prevCoins, earned);
      const newStars = Math.max(prevStars, stars);

      await query(
        `INSERT INTO sayohat_awards (user_id, region_id, stars, coins_awarded, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, region_id)
         DO UPDATE SET stars = $3, coins_awarded = $4, updated_at = NOW()`,
        [login, region_id, newStars, newCoins],
      );

      // Haqiqiy tanga logiga — faqat o'quvchiga (tanga tizimi o'quvchiniki)
      if (coinsDelta > 0 && (user["role"] as string) === "student") {
        await query(
          "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, $2, $3, 'sayohat')",
          [login, coinsDelta, `Sayohat: ${region_id} (${stars}⭐)`],
        );
      }

      // Umumiy ball + yakunlangan viloyatlar (serverda hisoblanadi)
      const agg = await queryOne<{ total: number }>(
        "SELECT COALESCE(SUM(coins_awarded),0)::int AS total FROM sayohat_awards WHERE user_id = $1",
        [login],
      );
      const done = await query<{ region_id: string }>(
        "SELECT region_id FROM sayohat_awards WHERE user_id = $1 AND stars >= 1",
        [login],
      );
      await query(
        `INSERT INTO sayohat_user_progress (user_id, total_score, completed_regions, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET total_score = EXCLUDED.total_score,
                       completed_regions = EXCLUDED.completed_regions,
                       updated_at = NOW()`,
        [login, agg?.total ?? 0, JSON.stringify(done.map((d) => d.region_id))],
      );
    }

    res.json({
      ok: true,
      correct,
      total,
      stars,
      earned_points: earned,
      coins_awarded: coinsDelta,
      per_question: perQuestion,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /sayohat/progress — holat + umumiy ball
router.get("/sayohat/progress", async (req, res): Promise<void> => {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  try {
    const row = await queryOne<{ state: unknown; total_score: number; completed_regions: unknown }>(
      "SELECT state, total_score, completed_regions FROM sayohat_user_progress WHERE user_id = $1",
      [uid(user)],
    );
    res.json({
      state: row?.state ?? null,
      total_score: row?.total_score ?? 0,
      completed_regions: row?.completed_regions ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /sayohat/progress { state } — kosmetik holat (qahramon/ism/daraja/yulduzlar)
const ProgressBody = z.object({ state: z.record(z.string(), z.unknown()) });
router.post("/sayohat/progress", async (req, res): Promise<void> => {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const parsed = ProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    // total_score/completed_regions ga TEGMAYMIZ — ular serverda baholashda yangilanadi
    await query(
      `INSERT INTO sayohat_user_progress (user_id, state, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [uid(user), JSON.stringify(parsed.data.state)],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
//  ADMIN (rahbariyat)
// ============================================================
function requireMgmt(req: { headers: { authorization?: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }): AuthUser | null {
  const user = auth(req);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return null; }
  if (!isMgmt(user)) { res.status(403).json({ error: "Ruxsat yo'q" }); return null; }
  return user;
}

// GET /sayohat/admin/regions — barcha viloyatlar + savol soni (boshqaruv)
router.get("/sayohat/admin/regions", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  try {
    const rows = await query<{
      id: string; title: string; order_index: number; unlock_at: string | null; is_active: boolean; total: string;
    }>(
      `SELECT r.id, r.title, r.order_index, r.unlock_at, r.is_active,
         COUNT(q.id) FILTER (WHERE q.is_active) AS total
       FROM sayohat_regions r
       LEFT JOIN sayohat_questions q ON q.region_id = r.id
       GROUP BY r.id
       ORDER BY r.order_index`,
    );
    res.json(rows.map((r) => ({
      id: r.id, title: r.title, order_index: r.order_index,
      unlock_at: r.unlock_at, is_active: r.is_active, questions: Number(r.total),
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /sayohat/admin/regions/:id — ochilish vaqti / faollik
const RegionUpdate = z.object({
  unlock_at: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});
router.post("/sayohat/admin/regions/:id", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  const id = String(req.params["id"]);
  const parsed = RegionUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { unlock_at, is_active } = parsed.data;
  if (unlock_at !== undefined && unlock_at !== null && Number.isNaN(Date.parse(unlock_at))) {
    res.status(400).json({ error: "Noto'g'ri sana" }); return;
  }
  try {
    const exists = await queryOne<{ id: string }>("SELECT id FROM sayohat_regions WHERE id = $1", [id]);
    if (!exists) { res.status(404).json({ error: "Viloyat topilmadi" }); return; }
    await query(
      `UPDATE sayohat_regions
       SET unlock_at = COALESCE($2, CASE WHEN $4 THEN NULL ELSE unlock_at END),
           is_active = COALESCE($3, is_active),
           updated_by = $5, updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        unlock_at ?? null,
        is_active ?? null,
        unlock_at === null, // true bo'lsa — vaqtni tozalaymiz
        uid(user),
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /sayohat/admin/questions?region_id= — savollar (JAVOBI bilan — faqat admin)
router.get("/sayohat/admin/questions", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  const region_id = String(req.query["region_id"] ?? "");
  if (!region_id) { res.status(400).json({ error: "region_id kerak" }); return; }
  try {
    const rows = await query<QuestionRow>(
      `SELECT id, region_id, difficulty, question_text, options, correct_index, explanation, hint, points, is_active
       FROM sayohat_questions WHERE region_id = $1
       ORDER BY difficulty, id`,
      [region_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const QuestionBody = z.object({
  region_id: z.string().min(1).max(50),
  difficulty: z.enum(DIFFS),
  question_text: z.string().min(3).max(1000),
  options: z.array(z.string().min(1).max(300)).min(2).max(6),
  correct_index: z.number().int().min(0).max(5),
  explanation: z.string().max(1000).optional().default(""),
  hint: z.string().max(500).optional().default(""),
  points: z.number().int().min(1).max(100).optional().default(10),
  is_active: z.boolean().optional().default(true),
});

// POST /sayohat/admin/questions — qo'shish
router.post("/sayohat/admin/questions", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  const parsed = QuestionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const q = parsed.data;
  if (q.correct_index >= q.options.length) {
    res.status(400).json({ error: "To'g'ri variant raqami variantlar sonidan katta" }); return;
  }
  try {
    const region = await queryOne<{ id: string }>("SELECT id FROM sayohat_regions WHERE id = $1", [q.region_id]);
    if (!region) { res.status(404).json({ error: "Viloyat topilmadi" }); return; }
    const row = await queryOne<{ id: number }>(
      `INSERT INTO sayohat_questions
         (region_id, difficulty, question_text, options, correct_index, explanation, hint, points, is_active, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [q.region_id, q.difficulty, q.question_text, JSON.stringify(q.options), q.correct_index,
       q.explanation, q.hint, q.points, q.is_active, uid(user)],
    );
    res.json({ ok: true, id: row?.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /sayohat/admin/questions/:id — tahrirlash
router.put("/sayohat/admin/questions/:id", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Noto'g'ri id" }); return; }
  const parsed = QuestionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const q = parsed.data;
  if (q.correct_index >= q.options.length) {
    res.status(400).json({ error: "To'g'ri variant raqami variantlar sonidan katta" }); return;
  }
  try {
    const exists = await queryOne<{ id: number }>("SELECT id FROM sayohat_questions WHERE id = $1", [id]);
    if (!exists) { res.status(404).json({ error: "Savol topilmadi" }); return; }
    await query(
      `UPDATE sayohat_questions SET
         region_id = $2, difficulty = $3, question_text = $4, options = $5::jsonb,
         correct_index = $6, explanation = $7, hint = $8, points = $9, is_active = $10
       WHERE id = $1`,
      [id, q.region_id, q.difficulty, q.question_text, JSON.stringify(q.options), q.correct_index,
       q.explanation, q.hint, q.points, q.is_active],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /sayohat/admin/questions/:id
router.delete("/sayohat/admin/questions/:id", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Noto'g'ri id" }); return; }
  try {
    await query("DELETE FROM sayohat_questions WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /sayohat/admin/stats — statistika
router.get("/sayohat/admin/stats", async (req, res): Promise<void> => {
  const user = requireMgmt(req, res); if (!user) return;
  try {
    const totals = await queryOne<{ players: string; questions: string; coins: string }>(
      `SELECT
         (SELECT COUNT(*) FROM sayohat_user_progress) AS players,
         (SELECT COUNT(*) FROM sayohat_questions WHERE is_active) AS questions,
         (SELECT COALESCE(SUM(coins_awarded),0) FROM sayohat_awards) AS coins`,
    );
    const perRegion = await query<{ region_id: string; title: string; finishers: string; avg_stars: string | null }>(
      `SELECT r.id AS region_id, r.title,
         COUNT(a.id) FILTER (WHERE a.stars >= 1) AS finishers,
         ROUND(AVG(a.stars) FILTER (WHERE a.stars >= 1), 2) AS avg_stars
       FROM sayohat_regions r
       LEFT JOIN sayohat_awards a ON a.region_id = r.id
       GROUP BY r.id
       ORDER BY r.order_index`,
    );
    const top = await query<{ user_id: string; total_score: number; completed: number }>(
      `SELECT user_id, total_score, jsonb_array_length(completed_regions) AS completed
       FROM sayohat_user_progress
       ORDER BY total_score DESC
       LIMIT 20`,
    );
    res.json({
      players: Number(totals?.players ?? 0),
      questions: Number(totals?.questions ?? 0),
      coins: Number(totals?.coins ?? 0),
      per_region: perRegion.map((r) => ({
        region_id: r.region_id, title: r.title,
        finishers: Number(r.finishers), avg_stars: r.avg_stars ? Number(r.avg_stars) : 0,
      })),
      top: top.map((t) => ({ user_id: t.user_id, total_score: t.total_score, completed: Number(t.completed) })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
