import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

// Pro bo'lmagan foydalanuvchilar uchun bepul bosqichlar chegarasi
const FREE_LEVEL_LIMIT = 2;
const COINS_PER_STAR = 3;

function isProActive(proExpiresAt: string | null | undefined): boolean {
  return !!proExpiresAt && new Date(proExpiresAt).getTime() > Date.now();
}

// GET /api/riddles/levels — bosqichlar ro'yxati, foydalanuvchining shu bosqichdagi eng yaxshi natijasi bilan
router.get("/riddles/levels", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const levelRows = await query<{ level: number; cnt: string }>(
    "SELECT level, COUNT(*) AS cnt FROM riddle_questions GROUP BY level ORDER BY level"
  );
  const bestRows = await query<{ level: number; best_stars: number }>(
    "SELECT level, MAX(stars) AS best_stars FROM riddle_attempts WHERE user_login = $1 GROUP BY level",
    [user["login"] as string]
  );
  const bestMap = new Map(bestRows.map(r => [r.level, r.best_stars]));
  const proActive = isProActive(user["pro_expires_at"] as string | null);

  const levels = levelRows.map(l => ({
    level: l.level,
    question_count: Number(l.cnt),
    best_stars: bestMap.get(l.level) ?? 0,
    locked: !proActive && l.level > FREE_LEVEL_LIMIT,
  }));

  res.json({ levels, is_pro: proActive, free_level_limit: FREE_LEVEL_LIMIT });
});

// GET /api/riddles/level/:n — shu bosqich savollari (to'g'ri javobsiz)
router.get("/riddles/level/:n", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const level = Number(req.params["n"]);
  const proActive = isProActive(user["pro_expires_at"] as string | null);
  if (!proActive && level > FREE_LEVEL_LIMIT) {
    res.status(403).json({ error: "Bu bosqich faqat Pro foydalanuvchilar uchun", pro_required: true });
    return;
  }

  const questions = await query<{ id: string; question: string; options: string[] }>(
    "SELECT id, question, options FROM riddle_questions WHERE level = $1 ORDER BY order_index",
    [level]
  );
  if (questions.length === 0) { res.status(404).json({ error: "Bu bosqich topilmadi" }); return; }
  res.json({ level, questions });
});

const SubmitBody = z.object({
  answers: z.array(z.object({ question_id: z.string(), chosen_index: z.number().int().min(0) })),
});

// POST /api/riddles/level/:n/submit — javoblarni yuborish, ball serverda hisoblanadi, Tanga beriladi
router.post("/riddles/level/:n/submit", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const level = Number(req.params["n"]);
  const proActive = isProActive(user["pro_expires_at"] as string | null);
  if (!proActive && level > FREE_LEVEL_LIMIT) {
    res.status(403).json({ error: "Bu bosqich faqat Pro foydalanuvchilar uchun", pro_required: true });
    return;
  }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const questions = await query<{ id: string; correct_index: number }>(
    "SELECT id, correct_index FROM riddle_questions WHERE level = $1",
    [level]
  );
  const correctMap = new Map(questions.map(q => [q.id, q.correct_index]));

  let score = 0;
  for (const a of parsed.data.answers) {
    if (correctMap.get(a.question_id) === a.chosen_index) score++;
  }
  const total = questions.length;
  const pct = total > 0 ? score / total : 0;
  const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : pct > 0 ? 1 : 0;
  const coins = stars * COINS_PER_STAR;

  await query(
    "INSERT INTO riddle_attempts (user_login, user_name, level, score, total, stars) VALUES ($1,$2,$3,$4,$5,$6)",
    [user["login"] as string, user["full_name"] as string, level, score, total, stars]
  );

  if (coins > 0) {
    await query(
      "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, $2, $3, $4)",
      [user["login"] as string, coins, `Zukko — ${level}-bosqich (${stars}⭐)`, "zukko_game"]
    );
  }

  res.json({ score, total, stars, coins_earned: coins });
});

export default router;
