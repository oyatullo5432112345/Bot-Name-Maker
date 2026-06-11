import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const ScoreBody = z.object({
  game_id: z.enum(["sozoyini", "jumboq", "arqon", "poyga"]),
  score_change: z.number().int(),
  reason: z.string().optional(),
});

router.post("/games/score", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const parsed = ScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { game_id, score_change, reason } = parsed.data;

  try {
    await query(
      `INSERT INTO game_scores (user_login, full_name, class_name, game_id, score_change, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user["login"] as string, user["full_name"] as string,
       (user["class_name"] as string) ?? "", game_id, score_change, reason ?? null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Ball saqlashda xatolik", details: (err as Error).message });
  }
});

router.get("/games/ratings", async (req, res): Promise<void> => {
  const gameId = req.query["game_id"] as string | undefined;

  try {
    let rows;
    if (gameId) {
      rows = await query(
        "SELECT user_login, full_name, class_name, score_change FROM game_scores WHERE game_id = $1",
        [gameId]
      );
    } else {
      rows = await query("SELECT user_login, full_name, class_name, score_change FROM game_scores");
    }

    const map = new Map<string, { user_login: string; full_name: string; class_name: string; total_score: number; wins: number; losses: number }>();

    for (const row of rows) {
      const key = row["user_login"] as string;
      if (!map.has(key)) {
        map.set(key, {
          user_login: row["user_login"] as string,
          full_name: row["full_name"] as string,
          class_name: row["class_name"] as string,
          total_score: 0, wins: 0, losses: 0,
        });
      }
      const entry = map.get(key)!;
      entry.total_score += row["score_change"] as number;
      if ((row["score_change"] as number) > 0) entry.wins++;
      else if ((row["score_change"] as number) < 0) entry.losses++;
    }

    const ratings = Array.from(map.values())
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 50);

    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: "Reyting yuklashda xatolik", details: (err as Error).message });
  }
});

router.get("/games/my-scores", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const login = user["login"] as string;

  try {
    const rows = await query(
      "SELECT game_id, score_change FROM game_scores WHERE user_login = $1", [login]
    );

    const scores: Record<string, number> = { sozoyini: 0, jumboq: 0, arqon: 0, poyga: 0 };
    for (const row of rows) {
      const gid = row["game_id"] as string;
      if (gid in scores) scores[gid]! += row["score_change"] as number;
    }

    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Ball yuklashda xatolik", details: (err as Error).message });
  }
});

export default router;
