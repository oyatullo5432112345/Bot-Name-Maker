import { Router, type IRouter } from "express";
import pg from "pg";
import { getAuthUser } from "./auth.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router: IRouter = Router();

const ADMIN_ROLES = ["admin", "mudir"];
function isAdmin(role: string) { return ADMIN_ROLES.includes(role); }

// ─── MAKTABLAR ────────────────────────────────────────────────────────────────

router.get("/olimpiada/maktablar", async (_req, res): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM olimpiada_maktablar ORDER BY jami_ball DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/olimpiada/maktablar", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { nomi, tuman, yil } = req.body as { nomi?: string; tuman?: string; yil?: number };
  if (!nomi || nomi.trim().length < 2) { res.status(400).json({ error: "Maktab nomini kiriting" }); return; }

  try {
    const { rows } = await pool.query(
      "INSERT INTO olimpiada_maktablar (nomi, tuman, yil) VALUES ($1, $2, $3) RETURNING *",
      [nomi.trim(), (tuman ?? "").trim(), yil ?? new Date().getFullYear()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/olimpiada/maktablar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  const body = req.body as { nomi?: string; tuman?: string; yil?: number };
  try {
    const { rows } = await pool.query(
      `UPDATE olimpiada_maktablar SET
        nomi = COALESCE($1, nomi),
        tuman = COALESCE($2, tuman),
        yil = COALESCE($3, yil)
       WHERE id = $4 RETURNING *`,
      [body.nomi?.trim() ?? null, body.tuman?.trim() ?? null, body.yil ?? null, id]
    );
    if (!rows.length) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete("/olimpiada/maktablar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  try {
    await pool.query("DELETE FROM olimpiada_ishtirokchilar WHERE maktab_id = $1", [id]);
    await pool.query("DELETE FROM olimpiada_maktablar WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── ISHTIROKCHILAR ───────────────────────────────────────────────────────────

router.get("/olimpiada/ishtirokchilar", async (req, res): Promise<void> => {
  const maktab_id = req.query["maktab_id"] as string | undefined;
  try {
    const { rows } = maktab_id
      ? await pool.query("SELECT * FROM olimpiada_ishtirokchilar WHERE maktab_id = $1 ORDER BY ball DESC", [maktab_id])
      : await pool.query("SELECT * FROM olimpiada_ishtirokchilar ORDER BY ball DESC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/olimpiada/ishtirokchilar", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { maktab_id, maktab_nomi, ism, fan, ball, orin, yil } = req.body as {
    maktab_id?: string; maktab_nomi?: string; ism?: string;
    fan?: string; ball?: number; orin?: number; yil?: number;
  };

  if (!maktab_id) { res.status(400).json({ error: "Maktab tanlanmagan" }); return; }
  if (!ism?.trim()) { res.status(400).json({ error: "Ism kiriting" }); return; }
  if (!fan?.trim()) { res.status(400).json({ error: "Fan kiriting" }); return; }
  if (ball === undefined || isNaN(Number(ball))) { res.status(400).json({ error: "Ball kiriting" }); return; }

  try {
    const { rows } = await pool.query(
      `INSERT INTO olimpiada_ishtirokchilar (maktab_id, maktab_nomi, ism, fan, ball, orin, yil)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [maktab_id, maktab_nomi ?? "", ism.trim(), fan.trim(), Number(ball), orin ?? null, yil ?? new Date().getFullYear()]
    );
    await recalcBall(maktab_id);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  const body = req.body as { ism?: string; fan?: string; ball?: number; orin?: number | null };
  try {
    const { rows } = await pool.query(
      `UPDATE olimpiada_ishtirokchilar SET
        ism  = COALESCE($1, ism),
        fan  = COALESCE($2, fan),
        ball = COALESCE($3, ball),
        orin = $4
       WHERE id = $5 RETURNING *`,
      [body.ism?.trim() ?? null, body.fan?.trim() ?? null,
       body.ball !== undefined ? Number(body.ball) : null,
       body.orin !== undefined ? (body.orin ? Number(body.orin) : null) : null,
       id]
    );
    if (!rows.length) { res.status(404).json({ error: "Topilmadi" }); return; }
    await recalcBall((rows[0] as { maktab_id: string }).maktab_id);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  try {
    const { rows: ex } = await pool.query(
      "SELECT maktab_id FROM olimpiada_ishtirokchilar WHERE id = $1", [id]
    );
    await pool.query("DELETE FROM olimpiada_ishtirokchilar WHERE id = $1", [id]);
    if (ex[0]) await recalcBall((ex[0] as { maktab_id: string }).maktab_id);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function recalcBall(maktab_id: string) {
  await pool.query(
    `UPDATE olimpiada_maktablar SET jami_ball = (
       SELECT COALESCE(SUM(ball), 0) FROM olimpiada_ishtirokchilar WHERE maktab_id = $1
     ) WHERE id = $1`,
    [maktab_id]
  );
}

export default router;
