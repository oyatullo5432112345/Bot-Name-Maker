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

// ════════════════════════════════════════════════════════════════════════════
//  YANGI OLIMPIADA TIZIMI — EVENTLAR, RO'YXAT, NATIJALAR, ZAKOVAT
// ════════════════════════════════════════════════════════════════════════════

// ─── OLIMPIADA EVENTLAR ───────────────────────────────────────────────────

router.get("/olimpiada/events", async (req, res): Promise<void> => {
  const { fan, bosqich, yil, holat } = req.query as Record<string, string | undefined>;
  const conds: string[] = [];
  const params: unknown[] = [];
  if (fan)     { params.push(fan);     conds.push(`fan = $${params.length}`); }
  if (bosqich) { params.push(bosqich); conds.push(`bosqich = $${params.length}`); }
  if (yil)     { params.push(Number(yil)); conds.push(`yil = $${params.length}`); }
  if (holat)   { params.push(holat);   conds.push(`holat = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  try {
    const rows = await query(
      `SELECT e.*,
         (SELECT COUNT(*) FROM olimpiad_registrations WHERE event_id = e.id) AS qatnashchi_soni
       FROM olimpiad_events e ${where} ORDER BY e.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/olimpiada/events/:id", async (req, res): Promise<void> => {
  try {
    const row = await queryOne(
      `SELECT e.*,
         (SELECT COUNT(*) FROM olimpiad_registrations WHERE event_id = e.id) AS qatnashchi_soni
       FROM olimpiad_events e WHERE e.id = $1`,
      [req.params.id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/events", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { nomi, fan, bosqich, sana_boshlanish, sana_tugash, roy_tugash, joy, max_qatnashchi, sinf_from, sinf_to, tavsif, yil } = req.body as Record<string, unknown>;
  if (!nomi || !fan) { res.status(400).json({ error: "Nomi va fan majburiy" }); return; }
  try {
    const row = await queryOne(
      `INSERT INTO olimpiad_events (nomi,fan,bosqich,sana_boshlanish,sana_tugash,roy_tugash,joy,max_qatnashchi,sinf_from,sinf_to,tavsif,yil,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [nomi, fan, bosqich??'maktab', sana_boshlanish??null, sana_tugash??null, roy_tugash??null,
       joy??'', Number(max_qatnashchi??0), Number(sinf_from??1), Number(sinf_to??11),
       tavsif??'', Number(yil??new Date().getFullYear()), String(user.login??'admin')]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.patch("/olimpiada/events/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const b = req.body as Record<string, unknown>;
  try {
    const row = await queryOne(
      `UPDATE olimpiad_events SET
        nomi = COALESCE($1, nomi), fan = COALESCE($2, fan), bosqich = COALESCE($3, bosqich),
        holat = COALESCE($4, holat), sana_boshlanish = COALESCE($5, sana_boshlanish),
        sana_tugash = COALESCE($6, sana_tugash), roy_tugash = COALESCE($7, roy_tugash),
        joy = COALESCE($8, joy), max_qatnashchi = COALESCE($9, max_qatnashchi),
        sinf_from = COALESCE($10, sinf_from), sinf_to = COALESCE($11, sinf_to),
        tavsif = COALESCE($12, tavsif)
       WHERE id = $13 RETURNING *`,
      [b.nomi??null,b.fan??null,b.bosqich??null,b.holat??null,b.sana_boshlanish??null,
       b.sana_tugash??null,b.roy_tugash??null,b.joy??null,
       b.max_qatnashchi!=null?Number(b.max_qatnashchi):null,
       b.sinf_from!=null?Number(b.sinf_from):null,b.sinf_to!=null?Number(b.sinf_to):null,
       b.tavsif??null, req.params.id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.delete("/olimpiada/events/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    await query("DELETE FROM olimpiad_events WHERE id = $1", [req.params.id]);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── RO'YXATDAN O'TISH ────────────────────────────────────────────────────

router.get("/olimpiada/events/:id/registrations", async (req, res): Promise<void> => {
  try {
    const rows = await query(
      "SELECT * FROM olimpiad_registrations WHERE event_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/events/:id/register", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Kirish talab etiladi" }); return; }

  const event = await queryOne<{ id: string; holat: string; max_qatnashchi: number; roy_tugash: string | null }>(
    "SELECT id, holat, max_qatnashchi, roy_tugash FROM olimpiad_events WHERE id = $1",
    [req.params.id]
  );
  if (!event) { res.status(404).json({ error: "Tanlov topilmadi" }); return; }
  if (event.holat !== "royhat_ochiq") { res.status(400).json({ error: "Ro'yxat yopilgan" }); return; }
  if (event.roy_tugash && new Date(event.roy_tugash) < new Date()) {
    res.status(400).json({ error: "Ro'yxat muddati tugagan" }); return;
  }

  if (event.max_qatnashchi > 0) {
    const cnt = await queryCount("SELECT COUNT(*) as count FROM olimpiad_registrations WHERE event_id = $1", [req.params.id]);
    if (cnt >= event.max_qatnashchi) { res.status(400).json({ error: "Ro'yxat to'ldi" }); return; }
  }

  const { student_name, sinf } = req.body as { student_name?: string; sinf?: string };
  const studentId = String(user.id ?? user.telegram_id ?? user.login);
  const name = (student_name ?? String(user.full_name ?? user.login ?? "")).trim();
  if (!name) { res.status(400).json({ error: "Ism talab etiladi" }); return; }

  try {
    const row = await queryOne(
      `INSERT INTO olimpiad_registrations (event_id, student_id, student_name, sinf)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, studentId, name, sinf ?? String(user.class_name ?? "")]
    );
    res.status(201).json(row);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique")) { res.status(400).json({ error: "Siz allaqachon ro'yxatdansiz" }); return; }
    res.status(500).json({ error: msg });
  }
});

router.delete("/olimpiada/events/:id/unregister/:studentId", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    await query("DELETE FROM olimpiad_registrations WHERE event_id = $1 AND student_id = $2",
      [req.params.id, req.params.studentId]);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/olimpiada/events/:id/my-registration", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.json({ registered: false }); return; }
  const studentId = String(user.id ?? user.telegram_id ?? user.login);
  try {
    const row = await queryOne(
      "SELECT * FROM olimpiad_registrations WHERE event_id = $1 AND student_id = $2",
      [req.params.id, studentId]
    );
    res.json({ registered: !!row, registration: row ?? null });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── NATIJALAR ────────────────────────────────────────────────────────────

router.get("/olimpiada/events/:id/results", async (req, res): Promise<void> => {
  try {
    const rows = await query(
      "SELECT * FROM olimpiad_results WHERE event_id = $1 ORDER BY orin ASC NULLS LAST, ball DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/events/:id/results", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { natijalar } = req.body as { natijalar?: { student_id?: string; student_name: string; sinf?: string; maktab?: string; ball: number; orin?: number }[] };
  if (!Array.isArray(natijalar) || !natijalar.length) { res.status(400).json({ error: "Natijalar bo'sh" }); return; }
  try {
    await query("DELETE FROM olimpiad_results WHERE event_id = $1", [req.params.id]);
    for (let i = 0; i < natijalar.length; i++) {
      const n = natijalar[i];
      await queryOne(
        `INSERT INTO olimpiad_results (event_id,student_id,student_name,sinf,maktab,ball,orin)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, n.student_id??`manual_${i}`, n.student_name, n.sinf??'', n.maktab??'', Number(n.ball), n.orin??null]
      );
    }
    await query("UPDATE olimpiad_events SET holat='natijalar_ellon' WHERE id=$1", [req.params.id]);
    res.json({ ok: true, inserted: natijalar.length });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── G'OLIBLAR ZALI ───────────────────────────────────────────────────────

router.get("/olimpiada/goliblar", async (req, res): Promise<void> => {
  const { fan, yil, bosqich } = req.query as Record<string, string | undefined>;
  const conds: string[] = ["r.orin IS NOT NULL AND r.orin <= 3"];
  const params: unknown[] = [];
  if (fan)     { params.push(fan);           conds.push(`e.fan = $${params.length}`); }
  if (yil)     { params.push(Number(yil));   conds.push(`e.yil = $${params.length}`); }
  if (bosqich) { params.push(bosqich);       conds.push(`e.bosqich = $${params.length}`); }
  const where = `WHERE ${conds.join(" AND ")}`;
  try {
    const rows = await query(
      `SELECT r.*, e.nomi AS event_nomi, e.fan AS event_fan, e.bosqich, e.yil
       FROM olimpiad_results r
       JOIN olimpiad_events e ON e.id = r.event_id
       ${where}
       ORDER BY e.yil DESC, r.orin ASC, r.ball DESC`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── STATISTIKA ───────────────────────────────────────────────────────────

router.get("/olimpiada/stats", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    const [events, fanStats, sinfStats, yilStats] = await Promise.all([
      queryOne<{ jami: string; royhat_ochiq: string; natijalar: string }>(
        `SELECT COUNT(*) AS jami,
           SUM(CASE WHEN holat='royhat_ochiq' THEN 1 ELSE 0 END) AS royhat_ochiq,
           SUM(CASE WHEN holat='natijalar_ellon' THEN 1 ELSE 0 END) AS natijalar
         FROM olimpiad_events`
      ),
      query(
        `SELECT e.fan, COUNT(DISTINCT r.id) AS qatnashchilar, COUNT(DISTINCT res.id) AS g_oliblar
         FROM olimpiad_events e
         LEFT JOIN olimpiad_registrations r ON r.event_id = e.id
         LEFT JOIN olimpiad_results res ON res.event_id = e.id AND res.orin IS NOT NULL
         GROUP BY e.fan ORDER BY qatnashchilar DESC`
      ),
      query(
        `SELECT r.sinf, COUNT(*) AS soni
         FROM olimpiad_registrations r GROUP BY r.sinf ORDER BY soni DESC LIMIT 15`
      ),
      query(
        `SELECT e.yil, COUNT(DISTINCT e.id) AS eventlar, COUNT(DISTINCT r.id) AS qatnashchilar
         FROM olimpiad_events e
         LEFT JOIN olimpiad_registrations r ON r.event_id = e.id
         GROUP BY e.yil ORDER BY e.yil DESC LIMIT 5`
      ),
    ]);
    res.json({ events, fanStats, sinfStats, yilStats });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ─── ZAKOVAT ──────────────────────────────────────────────────────────────

router.get("/olimpiada/zakovat", async (_req, res): Promise<void> => {
  try {
    const rows = await query(
      `SELECT s.*, COUNT(t.id)::int AS jamoalar
       FROM zakovat_sessions s
       LEFT JOIN zakovat_teams t ON t.session_id = s.id
       GROUP BY s.id ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/zakovat", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { nomi, sana, raundlar_soni, savollar_soni } = req.body as Record<string, unknown>;
  if (!nomi) { res.status(400).json({ error: "Nomi majburiy" }); return; }
  try {
    const row = await queryOne(
      `INSERT INTO zakovat_sessions (nomi, sana, raundlar_soni, savollar_soni)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nomi, sana??null, Number(raundlar_soni??3), Number(savollar_soni??5)]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.get("/olimpiada/zakovat/:id", async (req, res): Promise<void> => {
  try {
    const session = await queryOne("SELECT * FROM zakovat_sessions WHERE id=$1", [req.params.id]);
    if (!session) { res.status(404).json({ error: "Topilmadi" }); return; }
    const teams = await query("SELECT * FROM zakovat_teams WHERE session_id=$1 ORDER BY jamoa_nomi", [req.params.id]);
    const scores = await query("SELECT * FROM zakovat_scores WHERE session_id=$1", [req.params.id]);
    res.json({ session, teams, scores });
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.patch("/olimpiada/zakovat/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const b = req.body as Record<string, unknown>;
  try {
    const row = await queryOne(
      `UPDATE zakovat_sessions SET
        nomi = COALESCE($1,nomi), sana = COALESCE($2,sana),
        holat = COALESCE($3,holat), raundlar_soni = COALESCE($4,raundlar_soni),
        savollar_soni = COALESCE($5,savollar_soni)
       WHERE id=$6 RETURNING *`,
      [b.nomi??null,b.sana??null,b.holat??null,
       b.raundlar_soni!=null?Number(b.raundlar_soni):null,
       b.savollar_soni!=null?Number(b.savollar_soni):null, req.params.id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.delete("/olimpiada/zakovat/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    await query("DELETE FROM zakovat_sessions WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/zakovat/:id/teams", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { jamoa_nomi, azolar } = req.body as { jamoa_nomi?: string; azolar?: string[] };
  if (!jamoa_nomi?.trim()) { res.status(400).json({ error: "Jamoa nomi majburiy" }); return; }
  try {
    const row = await queryOne(
      "INSERT INTO zakovat_teams (session_id, jamoa_nomi, azolar) VALUES ($1,$2,$3) RETURNING *",
      [req.params.id, jamoa_nomi.trim(), azolar ?? []]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.patch("/olimpiada/zakovat/teams/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { jamoa_nomi, azolar } = req.body as { jamoa_nomi?: string; azolar?: string[] };
  try {
    const row = await queryOne(
      "UPDATE zakovat_teams SET jamoa_nomi=COALESCE($1,jamoa_nomi), azolar=COALESCE($2,azolar) WHERE id=$3 RETURNING *",
      [jamoa_nomi??null, azolar??null, req.params.id]
    );
    if (!row) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.delete("/olimpiada/zakovat/teams/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    await query("DELETE FROM zakovat_teams WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

router.post("/olimpiada/zakovat/:id/score", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdmin(String(user.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { team_id, raund, ball } = req.body as { team_id?: string; raund?: number; ball?: number };
  if (!team_id || raund === undefined || ball === undefined) {
    res.status(400).json({ error: "team_id, raund, ball majburiy" }); return;
  }
  try {
    const row = await queryOne(
      `INSERT INTO zakovat_scores (session_id, team_id, raund, ball)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (session_id, team_id, raund) DO UPDATE SET ball=EXCLUDED.ball
       RETURNING *`,
      [req.params.id, team_id, Number(raund), Number(ball)]
    );
    res.json(row);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

export default router;