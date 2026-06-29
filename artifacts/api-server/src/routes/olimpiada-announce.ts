import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, getAuthUser } from "./auth.js";

const router: IRouter = Router();

// GET /api/olimpiada-announce — public, returns the ONE currently active announcement
router.get("/olimpiada-announce", async (req, res): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const row = await queryOne<{
      id: string; title: string; start_time: string;
      end_time: string | null; active: boolean; created_at: string;
    }>(
      `SELECT id, title, start_time, end_time, active, created_at
       FROM olimpiada_announcements
       WHERE active = TRUE
         AND start_time <= $1
         AND (end_time IS NULL OR end_time >= $1)
       ORDER BY start_time DESC
       LIMIT 1`,
      [now]
    );
    if (!row) { res.json(null); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/olimpiada-announce/all — admin: all announcements
router.get("/olimpiada-announce/all", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  try {
    const rows = await query<{
      id: string; title: string; start_time: string;
      end_time: string | null; active: boolean; created_by: string; created_at: string;
    }>(
      "SELECT id, title, start_time, end_time, active, created_by, created_at FROM olimpiada_announcements ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/olimpiada-announce — admin creates
router.post("/olimpiada-announce", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  const { title, start_time, end_time } = req.body as {
    title?: string; start_time?: string; end_time?: string;
  };
  if (!title?.trim() || !start_time) {
    res.status(400).json({ error: "title va start_time kerak" }); return;
  }
  try {
    const row = await queryOne<{ id: string; title: string; start_time: string; end_time: string | null; active: boolean; created_at: string }>(
      `INSERT INTO olimpiada_announcements (title, start_time, end_time, active, created_by)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING id, title, start_time, end_time, active, created_at`,
      [title.trim(), start_time, end_time || null, user["login"] ?? "admin"]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/olimpiada-announce/:id — toggle active
router.patch("/olimpiada-announce/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  const { id } = req.params;
  const { active } = req.body as { active?: boolean };
  try {
    const row = await queryOne<{ id: string; active: boolean }>(
      "UPDATE olimpiada_announcements SET active = $1 WHERE id = $2 RETURNING id, active",
      [active ?? false, id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/olimpiada-announce/:id
router.delete("/olimpiada-announce/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  try {
    await query("DELETE FROM olimpiada_announcements WHERE id = $1", [req.params["id"]]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
