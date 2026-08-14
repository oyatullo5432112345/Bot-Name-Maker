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

const CreateWheelBody = z.object({
  title: z.string().min(2),
  subject: z.string().optional(),
  class_name: z.string().nullable().optional(),
  time_limit_seconds: z.number().int().min(5).max(300).nullable().optional(),
  segments: z.array(z.object({
    label: z.string().min(1),
    weight: z.number().min(1).max(100).default(1),
  })).min(2).max(12),
});

router.post("/wheel-games", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const parsed = CreateWheelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const segments = d.segments.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }));

  const game = await queryOne<{ id: string }>(
    `INSERT INTO wheel_games (title, subject, class_name, segments, time_limit_seconds, created_by_login)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [d.title, d.subject ?? null, d.class_name ?? null, JSON.stringify(segments), d.time_limit_seconds ?? null, user["login"] as string]
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

// POST /api/wheel-games/:id/spin — server tomonda "shans" (weight) asosida g'olibni tanlaydi
router.post("/wheel-games/:id/spin", async (req, res): Promise<void> => {
  const user = requireStaff(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const game = await queryOne<{ segments: { label: string; weight: number; color: string }[] }>(
    "SELECT segments FROM wheel_games WHERE id = $1", [req.params["id"]]
  );
  if (!game) { res.status(404).json({ error: "Topilmadi" }); return; }

  const totalWeight = game.segments.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * totalWeight;
  let winnerIndex = 0;
  for (let i = 0; i < game.segments.length; i++) {
    r -= game.segments[i]!.weight;
    if (r <= 0) { winnerIndex = i; break; }
  }
  res.json({ winner_index: winnerIndex, winner: game.segments[winnerIndex] });
});

export default router;
