import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";

const CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function genCode(): string {
  let c = "";
  for (let i = 0; i < 8; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const c = genCode();
    const existing = await queryOne("SELECT id FROM registration_codes WHERE code = $1", [c]);
    if (!existing) return c;
  }
  return genCode();
}

const router: IRouter = Router();

// POST /api/auth/verify-code
router.post("/auth/verify-code", async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) {
    res.status(400).json({ error: "Kod kiritilmagan" });
    return;
  }
  const upperCode = code.trim().toUpperCase();
  const data = await queryOne<{
    id: string; code: string; full_name: string; first_name: string; last_name: string;
    role: string; class_id: string | null; class_name: string | null;
  }>(
    "SELECT * FROM registration_codes WHERE code = $1 AND used = false",
    [upperCode]
  );

  if (!data) {
    res.status(404).json({ error: "Kod topilmadi yoki allaqachon ishlatilgan" });
    return;
  }

  res.json({
    valid: true,
    id: data.id, code: data.code, full_name: data.full_name,
    first_name: data.first_name, last_name: data.last_name,
    role: data.role, class_id: data.class_id, class_name: data.class_name,
  });
});

// GET /api/admin/codes
router.get("/admin/codes", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { class_id, role } = req.query as Record<string, string>;
  let sql = "SELECT * FROM registration_codes";
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (class_id) { conditions.push(`class_id = $${params.length + 1}`); params.push(class_id); }
  if (role) { conditions.push(`role = $${params.length + 1}`); params.push(role); }

  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";

  try {
    const data = await query(sql, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/admin/codes/generate
router.post("/admin/codes/generate", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { names, role = "student", class_id, class_name } = req.body as {
    names: string[]; role?: string; class_id?: string; class_name?: string;
  };

  if (!names?.length) { res.status(400).json({ error: "Ismlar kiritilmagan" }); return; }

  const rows = [];
  for (const raw of names) {
    const full_name = raw.trim();
    if (!full_name) continue;
    const parts = full_name.split(/\s+/);
    const last_name = parts[0] ?? "";
    const first_name = parts.slice(1).join(" ") || last_name;
    const code = await uniqueCode();
    rows.push({ code, full_name, first_name, last_name, role, class_id: class_id || null, class_name: class_name || null });
  }

  if (!rows.length) { res.status(400).json({ error: "Hech qanday ism topilmadi" }); return; }

  try {
    const inserted = [];
    for (const r of rows) {
      const d = await queryOne(
        `INSERT INTO registration_codes (code, full_name, first_name, last_name, role, class_id, class_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [r.code, r.full_name, r.first_name, r.last_name, r.role, r.class_id, r.class_name]
      );
      if (d) inserted.push(d);
    }
    res.json({ generated: inserted });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/codes/:id
router.delete("/admin/codes/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  try {
    await query("DELETE FROM registration_codes WHERE id = $1", [req.params["id"]]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/codes — ommaviy o'chirish (body: {ids?: string[], unused?: boolean, class_id?: string})
router.delete("/admin/codes", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "mudir"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { ids, unused, class_id } = req.body as { ids?: string[]; unused?: boolean; class_id?: string };

  try {
    let deleted = 0;

    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      const result = await query(`DELETE FROM registration_codes WHERE id IN (${placeholders}) RETURNING id`, ids);
      deleted = result.length;
    } else if (unused === true) {
      const params: unknown[] = [];
      let sql = "DELETE FROM registration_codes WHERE used = false";
      if (class_id) { params.push(class_id); sql += ` AND class_id = $1`; }
      const result = await query(sql + " RETURNING id", params);
      deleted = result.length;
    } else {
      res.status(400).json({ error: "ids yoki unused=true parametri kerak" });
      return;
    }

    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
