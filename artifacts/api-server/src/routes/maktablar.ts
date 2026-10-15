import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

// ============================================================
//  MAKTABLAR (ko'p maktabli platforma) — FAZA 1A
// ------------------------------------------------------------
//  Faqat TUMAN ADMINI (role='admin') maktab yaratadi/boshqaradi.
//  Admin — yagona super-admin, butun tumanni ko'radi.
//  Har maktabni keyin Direktor/Zavuch/MMTB yuritadi (o'z maktabi).
// ============================================================

function admin(req: { headers: { authorization?: string } }): Record<string, unknown> | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || (u["role"] as string) !== "admin") return null;
  return u;
}

// GET /maktablar/mine — joriy foydalanuvchining maktabi (kirish yozuvi uchun)
//  Har qanday kirgan foydalanuvchi uchun. Admin → barcha maktablar.
router.get("/maktablar/mine", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  try {
    if ((u["role"] as string) === "admin") {
      res.json({ id: null, nom: "Barcha maktablar", tuman: "Toshloq", is_admin: true });
      return;
    }
    // maktab_id tokendan; bo'lmasa login bo'yicha qidiramiz; bo'lmasa 3
    let mid = typeof u["maktab_id"] === "number" ? (u["maktab_id"] as number) : null;
    if (mid === null && typeof u["login"] === "string") {
      const row = await queryOne<{ maktab_id: number }>(
        (u["role"] as string) === "student"
          ? "SELECT maktab_id FROM users WHERE login = $1"
          : "SELECT maktab_id FROM staff WHERE login = $1",
        [u["login"]],
      ).catch(() => null);
      mid = row?.maktab_id ?? 3;
    }
    if (mid === null) mid = 3;
    const m = await queryOne<{ id: number; nom: string; tuman: string }>(
      "SELECT id, nom, tuman FROM maktablar WHERE id = $1", [mid],
    );
    res.json(m ? { ...m, is_admin: false } : { id: mid, nom: `${mid}-maktab`, tuman: "Toshloq", is_admin: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /maktablar — barcha maktablar (admin) — har biri bo'yicha o'quvchi/xodim soni
router.get("/maktablar", async (req, res): Promise<void> => {
  if (!admin(req)) { res.status(403).json({ error: "Faqat tuman admini" }); return; }
  try {
    const rows = await query<{
      id: number; nom: string; tuman: string; manzil: string; direktor: string;
      is_active: boolean; oquvchi: string; xodim: string; sinf: string;
    }>(
      `SELECT m.id, m.nom, m.tuman, m.manzil, m.direktor, m.is_active,
         (SELECT COUNT(*) FROM users u  WHERE u.maktab_id  = m.id) AS oquvchi,
         (SELECT COUNT(*) FROM staff s  WHERE s.maktab_id  = m.id) AS xodim,
         (SELECT COUNT(*) FROM classes c WHERE c.maktab_id = m.id) AS sinf
       FROM maktablar m
       ORDER BY m.id`,
    );
    res.json(rows.map((r) => ({
      id: r.id, nom: r.nom, tuman: r.tuman, manzil: r.manzil, direktor: r.direktor,
      is_active: r.is_active,
      counts: { oquvchi: Number(r.oquvchi), xodim: Number(r.xodim), sinf: Number(r.sinf) },
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const SchoolBody = z.object({
  id: z.number().int().min(1).max(999),       // maktab raqami
  nom: z.string().min(1).max(120),
  tuman: z.string().min(1).max(80).optional().default("Toshloq"),
  manzil: z.string().max(200).optional().default(""),
  direktor: z.string().max(120).optional().default(""),
});

// POST /maktablar — yangi maktab (admin)
router.post("/maktablar", async (req, res): Promise<void> => {
  if (!admin(req)) { res.status(403).json({ error: "Faqat tuman admini" }); return; }
  const parsed = SchoolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const m = parsed.data;
  try {
    const exists = await queryOne<{ id: number }>("SELECT id FROM maktablar WHERE id = $1", [m.id]);
    if (exists) { res.status(409).json({ error: `${m.id}-raqamli maktab allaqachon bor` }); return; }
    await query(
      `INSERT INTO maktablar (id, nom, tuman, manzil, direktor) VALUES ($1, $2, $3, $4, $5)`,
      [m.id, m.nom, m.tuman, m.manzil, m.direktor],
    );
    res.json({ ok: true, id: m.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const SchoolUpdate = z.object({
  nom: z.string().min(1).max(120).optional(),
  tuman: z.string().min(1).max(80).optional(),
  manzil: z.string().max(200).optional(),
  direktor: z.string().max(120).optional(),
  is_active: z.boolean().optional(),
});

// PUT /maktablar/:id — tahrirlash (admin)
router.put("/maktablar/:id", async (req, res): Promise<void> => {
  if (!admin(req)) { res.status(403).json({ error: "Faqat tuman admini" }); return; }
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Noto'g'ri id" }); return; }
  const parsed = SchoolUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const p = parsed.data;
  try {
    const exists = await queryOne<{ id: number }>("SELECT id FROM maktablar WHERE id = $1", [id]);
    if (!exists) { res.status(404).json({ error: "Maktab topilmadi" }); return; }
    await query(
      `UPDATE maktablar SET
         nom = COALESCE($2, nom),
         tuman = COALESCE($3, tuman),
         manzil = COALESCE($4, manzil),
         direktor = COALESCE($5, direktor),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
       WHERE id = $1`,
      [id, p.nom ?? null, p.tuman ?? null, p.manzil ?? null, p.direktor ?? null, p.is_active ?? null],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /maktablar/:id — o'chirish (admin). 3-maktab va ma'lumotli maktab o'chmaydi.
router.delete("/maktablar/:id", async (req, res): Promise<void> => {
  if (!admin(req)) { res.status(403).json({ error: "Faqat tuman admini" }); return; }
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Noto'g'ri id" }); return; }
  if (id === 3) { res.status(400).json({ error: "Asosiy (3-) maktabni o'chirib bo'lmaydi" }); return; }
  try {
    const used = await queryOne<{ n: string }>(
      `SELECT (
         (SELECT COUNT(*) FROM users  WHERE maktab_id = $1) +
         (SELECT COUNT(*) FROM staff  WHERE maktab_id = $1) +
         (SELECT COUNT(*) FROM classes WHERE maktab_id = $1)
       ) AS n`, [id],
    );
    if (Number(used?.n ?? 0) > 0) {
      res.status(400).json({ error: "Bu maktabda ma'lumot bor — avval o'quvchi/xodim/sinflarni ko'chiring yoki o'chiring" });
      return;
    }
    await query("DELETE FROM maktablar WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
