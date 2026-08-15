import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();
const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

function requireStaff(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || !STAFF_ROLES.includes(user["role"] as string)) return null;
  return user;
}

const SEGMENT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#ef4444", "#a855f7"];

router.get("/wheel-games", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const search = (req.query["search"] as string | undefined)?.trim();
  const rows = search
    ? await query(`SELECT * FROM wheel_games WHERE title ILIKE $1 ORDER BY created_at DESC`, [`%${search}%`])
    : await query(`SELECT * FROM wheel_games ORDER BY created_at DESC`);
  res.json(rows);
});

const SegmentBody = z.object({
  label: z.string().min(1),
  weight: z.number().min(1).max(100).default(1),
  question: z.string().optional(),
  correct_answer: z.string().optional(),
  points: z.number().int().min(1).max(100).default(10),
});

const CreateWheelBody = z.object({
  title: z.string().min(2),
  subject: z.string().optional(),
  class_name: z.string().nullable().optional(),
  time_limit_seconds: z.number().int().min(5).max(300).nullable().optional(),
  team_count: z.number().int().min(2).max(4).default(2),
  segments: z.array(SegmentBody).min(2).max(12),
});

router.post("/wheel-games", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const parsed = CreateWheelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const segments = d.segments.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }));
  const teamScores = Array.from({ length: d.team_count }, (_, i) => ({ name: `${i + 1}-jamoa`, score: 0 }));

  const game = await queryOne<{ id: string }>(
    `INSERT INTO wheel_games (title, subject, class_name, segments, time_limit_seconds, created_by_login, team_count, team_scores)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [d.title, d.subject ?? null, d.class_name ?? null, JSON.stringify(segments), d.time_limit_seconds ?? null, user["login"] as string, d.team_count, JSON.stringify(teamScores)]
  );
  res.status(201).json({ id: game?.id });
});

router.get("/wheel-games/:id", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const game = await queryOne("SELECT * FROM wheel_games WHERE id = $1", [req.params["id"]]);
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }
  res.json(game);
});

router.delete("/wheel-games/:id", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  await query("DELETE FROM wheel_games WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

// POST /api/wheel-games/:id/session/start — o'yinni (qayta) boshlash
router.post("/wheel-games/:id/session/start", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const game = await queryOne<{ team_count: number }>("SELECT team_count FROM wheel_games WHERE id = $1", [req.params["id"]]);
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }
  const teamScores = Array.from({ length: game.team_count }, (_, i) => ({ name: `${i + 1}-jamoa`, score: 0 }));
  await query(
    "UPDATE wheel_games SET session_status = 'playing', team_scores = $1, current_team = 0 WHERE id = $2",
    [JSON.stringify(teamScores), req.params["id"]]
  );
  res.json({ ok: true });
});

// POST /api/wheel-games/:id/spin — server tomonda "shans" (weight) asosida g'olibni tanlaydi
router.post("/wheel-games/:id/spin", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const game = await queryOne<{ segments: { label: string; weight: number; color: string; question?: string; correct_answer?: string; points?: number }[]; current_team: number }>(
    "SELECT segments, current_team FROM wheel_games WHERE id = $1", [req.params["id"]]
  );
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }

  const totalWeight = game.segments.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * totalWeight;
  let winnerIndex = 0;
  for (let i = 0; i < game.segments.length; i++) {
    r -= game.segments[i]!.weight;
    if (r <= 0) { winnerIndex = i; break; }
  }
  const winner = game.segments[winnerIndex]!;
  res.json({ winner_index: winnerIndex, winner, current_team: game.current_team });
});

// POST /api/wheel-games/:id/judge — javobni baholash (ball berish/ayirish) va navbatni o'tkazish
const JudgeBody = z.object({
  outcome: z.enum(["correct", "incorrect", "skip"]),
  points: z.number().int().min(0).max(100).default(0),
});
router.post("/wheel-games/:id/judge", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const parsed = JudgeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const game = await queryOne<{ team_scores: { name: string; score: number }[]; current_team: number; team_count: number }>(
    "SELECT team_scores, current_team, team_count FROM wheel_games WHERE id = $1", [req.params["id"]]
  );
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }

  const scores = [...game.team_scores];
  const cur = game.current_team;
  if (parsed.data.outcome === "correct") {
    scores[cur]!.score += parsed.data.points;
  } else if (parsed.data.outcome === "incorrect") {
    scores[cur]!.score = Math.max(0, scores[cur]!.score - parsed.data.points);
  }
  const nextTeam = (cur + 1) % game.team_count;
  await query("UPDATE wheel_games SET team_scores = $1, current_team = $2 WHERE id = $3", [JSON.stringify(scores), nextTeam, req.params["id"]]);
  res.json({ team_scores: scores, current_team: nextTeam });
});

// POST /api/wheel-games/:id/session/finish — o'yinni yakunlash (g'olibni e'lon qilish uchun)
router.post("/wheel-games/:id/session/finish", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  await query("UPDATE wheel_games SET session_status = 'finished' WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

export default router;
