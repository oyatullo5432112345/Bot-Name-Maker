import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();
const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

function requireStaff(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || !STAFF_ROLES.includes(user["role"] as string)) return null;
  return user;
}

const DEFAULT_POINTS: Record<string, number> = { oson: 10, orta: 20, qiyin: 30 };

function cellCountOptions(teamCount: number): number[] {
  return teamCount === 2 ? [8, 16] : [9, 18, 30];
}

// GET /api/board-games?search=&status= — arxiv + qidiruv
router.get("/board-games", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const search = (req.query["search"] as string | undefined)?.trim();
  const mine = req.query["mine"] === "true";

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) { params.push(`%${search}%`); conditions.push(`(title ILIKE $${params.length} OR subject ILIKE $${params.length})`); }
  if (mine) { params.push(user["login"] as string); conditions.push(`created_by_login = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query(`SELECT * FROM board_games ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
});

const CellBody = z.object({
  position: z.number().int().min(0),
  type: z.enum(["question", "bonus", "penalty", "lose", "steal"]),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  correct_index: z.number().int().optional(),
  correct_text: z.string().optional(),
  difficulty: z.enum(["oson", "orta", "qiyin"]).optional(),
  points: z.number().int().optional(),
  time_seconds: z.number().int().min(5).max(300).optional(),
  steal_percent: z.number().int().min(1).max(100).default(25),
});

const CreateGameBody = z.object({
  title: z.string().min(2),
  subject: z.string().optional(),
  class_name: z.string().nullable().optional(),
  team_count: z.union([z.literal(2), z.literal(3)]),
  cell_count: z.number().int(),
  cells: z.array(CellBody).min(1),
});

// POST /api/board-games — yangi o'yin (barcha katakchalari bilan)
router.post("/board-games", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  if (!cellCountOptions(d.team_count).includes(d.cell_count)) {
    res.status(400).json({ error: `${d.team_count} jamoa uchun katakchalar soni ${cellCountOptions(d.team_count).join(", ")} bo'lishi kerak` });
    return;
  }

  const teamNames = Array.from({ length: d.team_count }, (_, i) => ({ name: `${i + 1}-jamoa`, score: 0 }));

  const game = await queryOne<{ id: string }>(
    `INSERT INTO board_games (title, subject, class_name, team_count, cell_count, status, team_scores, created_by_login)
     VALUES ($1,$2,$3,$4,$5,'ready',$6,$7) RETURNING id`,
    [d.title, d.subject ?? null, d.class_name ?? null, d.team_count, d.cell_count, JSON.stringify(teamNames), user["login"] as string]
  );
  if (!game) { res.status(500).json({ error: "O'yin yaratilmadi" }); return; }

  for (const c of d.cells) {
    const points = c.points ?? (c.type === "question" ? DEFAULT_POINTS[c.difficulty ?? "orta"] : c.type === "bonus" ? 15 : c.type === "penalty" ? 15 : 0);
    await query(
      `INSERT INTO board_cells (game_id, position, type, question, options, correct_index, correct_text, difficulty, points, time_seconds, steal_percent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        game.id, c.position, c.type, c.question ?? null,
        c.options ? JSON.stringify(c.options) : null, c.correct_index ?? null, c.correct_text ?? null,
        c.difficulty ?? null, points, c.time_seconds ?? null, c.steal_percent,
      ]
    );
  }

  res.status(201).json({ id: game.id });
});

// GET /api/board-games/:id — to'liq holat (boshqaruv ekrani uchun)
router.get("/board-games/:id", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const game = await queryOne("SELECT * FROM board_games WHERE id = $1", [req.params["id"]]);
  if (!game) { res.status(404).json({ error: "O'yin topilmadi" }); return; }
  const cells = await query("SELECT * FROM board_cells WHERE game_id = $1 ORDER BY position", [req.params["id"]]);
  res.json({ game, cells });
});

router.delete("/board-games/:id", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const game = await queryOne<{ created_by_login: string | null }>(
    "SELECT created_by_login FROM board_games WHERE id = $1", [req.params["id"]]
  );
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }
  if (game.created_by_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Faqat o'yinni yaratgan kishi o'chira oladi" });
    return;
  }

  await query("DELETE FROM board_games WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

// POST /api/board-games/:id/session/start — o'yinni (qayta) boshlash, ballarni nolga tushiradi
const StartSessionBody = z.object({ team_names: z.array(z.string().min(1)).optional() });
router.post("/board-games/:id/session/start", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const game = await queryOne<{ team_count: number }>("SELECT team_count FROM board_games WHERE id = $1", [req.params["id"]]);
  if (!game) { res.status(404).json({ error: "O'yin topilmadi" }); return; }

  const parsed = StartSessionBody.safeParse(req.body);
  const names = parsed.success && parsed.data.team_names?.length === game.team_count
    ? parsed.data.team_names
    : Array.from({ length: game.team_count }, (_, i) => `${i + 1}-jamoa`);

  const teamScores = names.map(n => ({ name: n, score: 0 }));
  await query(
    `UPDATE board_games SET session_status = 'playing', team_scores = $1, current_team = 0,
       play_count = play_count + 1, last_played_at = NOW() WHERE id = $2`,
    [JSON.stringify(teamScores), req.params["id"]]
  );
  await query(`UPDATE board_cells SET revealed = false, claimed_by_team = null WHERE game_id = $1`, [req.params["id"]]);
  res.json({ ok: true });
});

// POST /api/board-games/:id/cells/:cellId/reveal — katakchani ochish (matnini ko'rsatish)
router.post("/board-games/:id/cells/:cellId/reveal", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const cell = await queryOne("SELECT * FROM board_cells WHERE id = $1 AND game_id = $2", [req.params["cellId"], req.params["id"]]);
  if (!cell) { res.status(404).json({ error: "Katakcha topilmadi" }); return; }
  await query("UPDATE board_cells SET revealed = true WHERE id = $1", [req.params["cellId"]]);
  res.json(cell);
});

// POST /api/board-games/:id/cells/:cellId/resolve — natijani qo'llash (ball berish/olish/o'g'irlash) va navbatni o'tkazish
const ResolveBody = z.object({
  outcome: z.enum(["correct", "incorrect", "ack", "steal"]),
  target_team: z.number().int().optional(), // 'steal' uchun — kimdan o'g'irlanadi
});
router.post("/board-games/:id/cells/:cellId/resolve", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const parsed = ResolveBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const game = await queryOne<{ team_scores: { name: string; score: number }[]; current_team: number; team_count: number; cell_count: number }>(
    "SELECT team_scores, current_team, team_count, cell_count FROM board_games WHERE id = $1", [req.params["id"]]
  );
  const cell = await queryOne<{ id: string; type: string; points: number; steal_percent: number; claimed_by_team: number | null }>(
    "SELECT id, type, points, steal_percent, claimed_by_team FROM board_cells WHERE id = $1 AND game_id = $2",
    [req.params["cellId"], req.params["id"]]
  );
  if (!game || !cell) { res.status(404).json({ error: "Topilmadi" }); return; }
  if (cell.claimed_by_team !== null) { res.status(409).json({ error: "Bu katakcha allaqachon ishlatilgan" }); return; }

  const scores = [...game.team_scores];
  const cur = game.current_team;

  if (cell.type === "question") {
    if (parsed.data.outcome === "correct") scores[cur]!.score += cell.points;
  } else if (cell.type === "bonus") {
    scores[cur]!.score += cell.points;
  } else if (cell.type === "penalty") {
    scores[cur]!.score = Math.max(0, scores[cur]!.score - cell.points);
  } else if (cell.type === "lose") {
    scores[cur]!.score = 0;
  } else if (cell.type === "steal") {
    const target = parsed.data.target_team;
    if (target !== undefined && target !== cur && scores[target]) {
      const stolen = Math.round(scores[target]!.score * (cell.steal_percent / 100));
      scores[target]!.score -= stolen;
      scores[cur]!.score += stolen;
    }
  }

  const nextTeam = (cur + 1) % game.team_count;

  await query("UPDATE board_cells SET claimed_by_team = $1 WHERE id = $2", [cur, cell.id]);
  await query("UPDATE board_games SET team_scores = $1, current_team = $2 WHERE id = $3", [JSON.stringify(scores), nextTeam, req.params["id"]]);

  const remaining = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*) AS cnt FROM board_cells WHERE game_id = $1 AND claimed_by_team IS NULL", [req.params["id"]]
  );
  const finished = Number(remaining?.cnt ?? 0) === 0;
  if (finished) {
    await query("UPDATE board_games SET session_status = 'finished' WHERE id = $1", [req.params["id"]]);
  }

  res.json({ team_scores: scores, current_team: nextTeam, finished });
});

// POST /api/board-games/import — "Ish reja" fayli (rasm/PDF) dan savollarni avtomatik chiqarish
router.post("/board-games/import", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) { res.status(500).json({ error: "ANTHROPIC_API_KEY sozlanmagan" }); return; }

  const { file_base64, media_type, count } = req.body as { file_base64?: string; media_type?: string; count?: number };
  if (!file_base64 || !media_type) { res.status(400).json({ error: "Fayl yuborilmadi" }); return; }
  const isPdf = media_type === "application/pdf";

  const n = Math.min(Math.max(count ?? 16, 4), 30);
  const systemPrompt =
    `Siz o'qituvchining ish reja hujjatini o'qib, undan sinf uchun test savollari tayyorlaydigan yordamchisiz. ` +
    `Hujjatdagi mavzular asosida ${n} ta variantli savol tuzing (har birida 4 ta variant, 1 tasi to'g'ri). ` +
    `Qiyinlik darajasini ("oson","orta","qiyin") mavzu murakkabligiga qarab belgilang — taxminan teng taqsimlang. ` +
    `Faqat quyidagi JSON massiv qaytaring, boshqa hech narsa yozmang:\n` +
    `[{"question":"...","options":["A","B","C","D"],"correct_index":0,"difficulty":"oson"}]`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type, data: file_base64 } }
              : { type: "image", source: { type: "base64", media_type, data: file_base64 } },
            { type: "text", text: "Ish reja asosida savollarni tuzing." },
          ],
        }],
      }),
    });
    if (!aiRes.ok) { res.status(502).json({ error: `Claude API xatosi: ${(await aiRes.text()).slice(0, 300)}` }); return; }
    const aiData = (await aiRes.json()) as { content: { type: string; text?: string }[] };
    const text = aiData.content.find(c => c.type === "text")?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Xatolik" });
  }
});

export default router;
