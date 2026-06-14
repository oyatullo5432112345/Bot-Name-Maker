import { Router, type IRouter } from "express";
import { query, queryOne, queryCount } from "../lib/db.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

const ADMIN_ROLES = ["admin", "mudir"];
function isAdmin(role: string) { return ADMIN_ROLES.includes(role); }

// ─── MAKTABLAR ────────────────────────────────────────────────────────────────

router.get("/olimpiada/maktablar", async (_req, res): Promise<void> => {
  try {
    const rows = await query("SELECT * FROM olimpiada_maktablar ORDER BY jami_ball DESC");
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
    const row = await queryOne(
      "INSERT INTO olimpiada_maktablar (nomi, tuman, yil) VALUES ($1, $2, $3) RETURNING *",
      [nomi.trim(), (tuman ?? "").trim(), yil ?? new Date().getFullYear()]
    );
    res.status(201).json(row);
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
    const row = await queryOne(
      `UPDATE olimpiada_maktablar SET
        nomi = COALESCE($1, nomi),
        tuman = COALESCE($2, tuman),
        yil = COALESCE($3, yil)
       WHERE id = $4 RETURNING *`,
      [body.nomi?.trim() ?? null, body.tuman?.trim() ?? null, body.yil ?? null, id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete("/olimpiada/maktablar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  try {
    await query("DELETE FROM olimpiada_ishtirokchilar WHERE maktab_id = $1", [id]);
    await query("DELETE FROM olimpiada_maktablar WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── ISHTIROKCHILAR ───────────────────────────────────────────────────────────
// holat: 'royhatdan_otgan'   — olimpiadagacha ro'yxatga olingan (ball/orin yo'q)
//        'natija_kiritilgan' — olimpiadadan keyin ball/orin kiritilgan

router.get("/olimpiada/ishtirokchilar", async (req, res): Promise<void> => {
  const maktab_id = req.query["maktab_id"] as string | undefined;
  const holat = req.query["holat"] as string | undefined;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (maktab_id) { params.push(maktab_id); conditions.push(`maktab_id = $${params.length}`); }
  if (holat) { params.push(holat); conditions.push(`holat = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const rows = await query(
      `SELECT * FROM olimpiada_ishtirokchilar ${where} ORDER BY ball DESC NULLS LAST, ism ASC`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Ro'yxatdan o'tish: ball/orin kerak emas, holat = 'royhatdan_otgan'
router.post("/olimpiada/royhatdan-otish", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { maktab_id, maktab_nomi, ism, fan, yil } = req.body as {
    maktab_id?: string; maktab_nomi?: string; ism?: string; fan?: string; yil?: number;
  };

  if (!maktab_id) { res.status(400).json({ error: "Maktab tanlanmagan" }); return; }
  if (!ism?.trim()) { res.status(400).json({ error: "Ism kiriting" }); return; }
  if (!fan?.trim()) { res.status(400).json({ error: "Fan kiriting" }); return; }

  try {
    const currentYil = yil ?? new Date().getFullYear();
    const mavjud = await queryCount(
      `SELECT COUNT(*) as count FROM olimpiada_ishtirokchilar
       WHERE maktab_id = $1 AND fan = $2 AND yil = $3`,
      [maktab_id, fan.trim(), currentYil]
    );

    const row = await queryOne(
      `INSERT INTO olimpiada_ishtirokchilar (maktab_id, maktab_nomi, ism, fan, ball, orin, yil, holat)
       VALUES ($1, $2, $3, $4, NULL, NULL, $5, 'royhatdan_otgan') RETURNING *`,
      [maktab_id, maktab_nomi ?? "", ism.trim(), fan.trim(), currentYil]
    );
    res.status(201).json({ ...(row as object), ogohlantirish: mavjud >= 3 ? `Diqqat: bu maktabdan "${fan.trim()}" fani bo'yicha allaqachon ${mavjud} ta o'quvchi ro'yxatdan o'tgan` : null });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Omaviy ro'yxatdan o'tish (bir maktab uchun, bir nechta fan/ism)
router.post("/olimpiada/royhatdan-otish/bulk", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { maktab_id, maktab_nomi, royhat, yil } = req.body as {
    maktab_id?: string;
    maktab_nomi?: string;
    royhat?: { ism: string; fan: string }[];
    yil?: number;
  };

  if (!maktab_id) { res.status(400).json({ error: "Maktab tanlanmagan" }); return; }
  if (!Array.isArray(royhat) || !royhat.length) {
    res.status(400).json({ error: "Ro'yxat bo'sh" }); return;
  }

  const currentYil = yil ?? new Date().getFullYear();
  const inserted: unknown[] = [];
  const errors: string[] = [];
  const ogohlantirishlar: string[] = [];

  // shu so'rovdan oldingi fan bo'yicha sonlarni ham hisobga olish uchun
  const fanCounts = new Map<string, number>();

  for (const i of royhat) {
    if (!i.ism?.trim() || !i.fan?.trim()) {
      errors.push(`"${i.ism}" — to'liq to'ldirilmagan`);
      continue;
    }
    const fan = i.fan.trim();
    try {
      if (!fanCounts.has(fan)) {
        const cnt = await queryCount(
          `SELECT COUNT(*) as count FROM olimpiada_ishtirokchilar
           WHERE maktab_id = $1 AND fan = $2 AND yil = $3`,
          [maktab_id, fan, currentYil]
        );
        fanCounts.set(fan, cnt);
      }

      const row = await queryOne(
        `INSERT INTO olimpiada_ishtirokchilar (maktab_id, maktab_nomi, ism, fan, ball, orin, yil, holat)
         VALUES ($1, $2, $3, $4, NULL, NULL, $5, 'royhatdan_otgan') RETURNING *`,
        [maktab_id, maktab_nomi ?? "", i.ism.trim(), fan, currentYil]
      );
      inserted.push(row);
      fanCounts.set(fan, (fanCounts.get(fan) ?? 0) + 1);

      if (fanCounts.get(fan)! > 3) {
        ogohlantirishlar.push(`"${fan}" fani bo'yicha 3 tadan ortiq o'quvchi ro'yxatdan o'tgan (${fanCounts.get(fan)} ta)`);
      }
    } catch (e) {
      errors.push(`"${i.ism}" — ${(e as Error).message}`);
    }
  }

  res.status(201).json({
    inserted: inserted.length,
    errors,
    ogohlantirishlar: [...new Set(ogohlantirishlar)],
  });
});

// Eski endpoint — to'g'ridan-to'g'ri natija (ball/orin) bilan ishtirokchi qo'shish.
// Hozir ham ishlaydi: holat avtomatik 'natija_kiritilgan' bo'ladi.
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
    const row = await queryOne(
      `INSERT INTO olimpiada_ishtirokchilar (maktab_id, maktab_nomi, ism, fan, ball, orin, yil, holat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'natija_kiritilgan') RETURNING *`,
      [maktab_id, maktab_nomi ?? "", ism.trim(), fan.trim(), Number(ball), orin ?? null, yil ?? new Date().getFullYear()]
    );
    await recalcBall(maktab_id);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Tahrirlash: ism/fan/ball/orin yangilash. Ball kiritilsa, holat avtomatik
// 'natija_kiritilgan' ga o'tadi (ro'yxatdan o'tgan ishtirokchiga natija qo'yish).
router.patch("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  const body = req.body as { ism?: string; fan?: string; ball?: number | null; orin?: number | null };
  try {
    const ballProvided = body.ball !== undefined && body.ball !== null && !isNaN(Number(body.ball));
    const row = await queryOne<{ maktab_id: string }>(
      `UPDATE olimpiada_ishtirokchilar SET
        ism   = COALESCE($1, ism),
        fan   = COALESCE($2, fan),
        ball  = CASE WHEN $3 THEN $4 ELSE ball END,
        orin  = $5,
        holat = CASE WHEN $3 THEN 'natija_kiritilgan' ELSE holat END
       WHERE id = $6 RETURNING *`,
      [
        body.ism?.trim() ?? null,
        body.fan?.trim() ?? null,
        ballProvided,
        ballProvided ? Number(body.ball) : null,
        body.orin !== undefined ? (body.orin ? Number(body.orin) : null) : null,
        id,
      ]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    await recalcBall(row.maktab_id);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/olimpiada/ishtirokchilar/bulk", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { maktab_id, maktab_nomi, ishtirokchilar, yil } = req.body as {
    maktab_id?: string;
    maktab_nomi?: string;
    ishtirokchilar?: { ism: string; fan: string; ball: number; orin?: number | null }[];
    yil?: number;
  };

  if (!maktab_id) { res.status(400).json({ error: "Maktab tanlanmagan" }); return; }
  if (!Array.isArray(ishtirokchilar) || !ishtirokchilar.length) {
    res.status(400).json({ error: "Ishtirokchilar ro'yxati bo'sh" }); return;
  }

  const currentYil = yil ?? new Date().getFullYear();
  const inserted: unknown[] = [];
  const errors: string[] = [];

  for (const i of ishtirokchilar) {
    if (!i.ism?.trim() || !i.fan?.trim() || isNaN(Number(i.ball))) {
      errors.push(`"${i.ism}" — to'liq to'ldirilmagan`);
      continue;
    }
    try {
      const row = await queryOne(
        `INSERT INTO olimpiada_ishtirokchilar (maktab_id, maktab_nomi, ism, fan, ball, orin, yil, holat)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'natija_kiritilgan') RETURNING *`,
        [maktab_id, maktab_nomi ?? "", i.ism.trim(), i.fan.trim(), Number(i.ball), i.orin ?? null, currentYil]
      );
      inserted.push(row);
    } catch (e) {
      errors.push(`"${i.ism}" — ${(e as Error).message}`);
    }
  }

  if (inserted.length > 0) await recalcBall(maktab_id);
  res.status(201).json({ inserted: inserted.length, errors });
});

router.delete("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { id } = req.params;
  try {
    const existing = await queryOne<{ maktab_id: string }>(
      "SELECT maktab_id FROM olimpiada_ishtirokchilar WHERE id = $1", [id]
    );
    await query("DELETE FROM olimpiada_ishtirokchilar WHERE id = $1", [id]);
    if (existing) await recalcBall(existing.maktab_id);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function recalcBall(maktab_id: string) {
  await query(
    `UPDATE olimpiada_maktablar SET jami_ball = (
       SELECT COALESCE(SUM(ball), 0) FROM olimpiada_ishtirokchilar
       WHERE maktab_id = $1 AND holat = 'natija_kiritilgan'
     ) WHERE id = $1`,
    [maktab_id]
  );
}

export default router;