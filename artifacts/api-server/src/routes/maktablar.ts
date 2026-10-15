// ═══════════════════════════════════════════════════════════════════════════
//  MAKTABLAR — ko'p-maktab (multi-tenant) tizimi
//
//  • Har bir o'quvchi / sinf / xodim bitta maktabga (maktab_id) tegishli.
//  • Bosh administrator (role = "admin") hamma maktabni ko'radi va yangi
//    maktab ochib, unga DIREKTOR biriktiradi.
//  • Direktor o'z maktabini boshqaradi — faqat o'z maktabi ma'lumotlarini
//    ko'radi (scope: callerScope orqali).
//  • Eski (3-maktab) ma'lumotlari avtomatik DEFAULT_MAKTAB_ID ga biriktiriladi,
//    shuning uchun hozirgi ishlayotgan tizim buzilmaydi.
// ═══════════════════════════════════════════════════════════════════════════

import { Router, type IRouter, type Request } from "express";
import { query, queryOne, queryCount } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser, hashPassword } from "./auth.js";
import { genUniqueLoginId } from "./auth-login.js";

const router: IRouter = Router();

// 3-maktab — tizimdagi birinchi (standart) maktab. Barcha eski ma'lumotlar shunga tegishli.
export const DEFAULT_MAKTAB_ID = "00000000-0000-0000-0000-000000000003";

// ─── Sxema (server ishga tushganda, idempotent) ─────────────────────────────
const MAKTAB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS maktablar (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  address    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO maktablar (id, name, slug, address)
VALUES ('${DEFAULT_MAKTAB_ID}', '3-maktab', '3maktab', 'Toshloq tumani')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE staff   ADD COLUMN IF NOT EXISTS maktab_id UUID REFERENCES maktablar(id) ON DELETE CASCADE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS maktab_id UUID REFERENCES maktablar(id) ON DELETE CASCADE;
ALTER TABLE users   ADD COLUMN IF NOT EXISTS maktab_id UUID REFERENCES maktablar(id) ON DELETE CASCADE;
UPDATE staff   SET maktab_id = '${DEFAULT_MAKTAB_ID}' WHERE maktab_id IS NULL;
UPDATE classes SET maktab_id = '${DEFAULT_MAKTAB_ID}' WHERE maktab_id IS NULL;
UPDATE users   SET maktab_id = '${DEFAULT_MAKTAB_ID}' WHERE maktab_id IS NULL;
ALTER TABLE staff   ALTER COLUMN maktab_id SET DEFAULT '${DEFAULT_MAKTAB_ID}';
ALTER TABLE classes ALTER COLUMN maktab_id SET DEFAULT '${DEFAULT_MAKTAB_ID}';
ALTER TABLE users   ALTER COLUMN maktab_id SET DEFAULT '${DEFAULT_MAKTAB_ID}';
CREATE INDEX IF NOT EXISTS idx_staff_maktab   ON staff(maktab_id);
CREATE INDEX IF NOT EXISTS idx_classes_maktab ON classes(maktab_id);
CREATE INDEX IF NOT EXISTS idx_users_maktab   ON users(maktab_id);
-- Sinf nomi endi GLOBAL emas, MAKTAB ichida unique (1-maktab ham "5-A" ochishi mumkin)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_name_maktab ON classes(name, maktab_id);
`;
void query(MAKTAB_SCHEMA_SQL)
  .then(() => logger.info("Maktablar (multi-tenant) sxemasi tayyor ✅"))
  .catch((err) => logger.error({ err }, "Maktablar sxemasini yaratishda xato"));

// ─── Scope: joriy foydalanuvchi qaysi maktabni ko'radi ──────────────────────
// • admin  → isSuper=true, maktabId=null (HAMMA maktab)
// • boshqa → o'z maktabi (eski tokenlar uchun 3-maktab)
export function callerScope(req: Request): { maktabId: string | null; isSuper: boolean } {
  const u = getAuthUser(req.headers.authorization) as { role?: string; maktab_id?: string | null } | null;
  const role = String(u?.role ?? "");
  if (role === "admin") return { maktabId: null, isSuper: true };
  const mid = (u?.maktab_id as string | undefined) ?? DEFAULT_MAKTAB_ID;
  return { maktabId: mid, isSuper: false };
}

function requireSuper(req: Request, res: import("express").Response): boolean {
  const { isSuper } = callerScope(req);
  if (!isSuper) {
    res.status(403).json({ error: "Bu amal faqat bosh administrator uchun" });
    return false;
  }
  return true;
}

function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  return s || "maktab" + Math.floor(100 + Math.random() * 900);
}

function makeStaffLogin(fullName: string): string {
  const base = (fullName.trim().split(/\s+/)[0] ?? "direktor").toLowerCase().replace(/[^a-z]/g, "") || "direktor";
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

// ═══════════════════════════════════════ ENDPOINTLAR ═══════════════════════════

// GET /api/maktablar — barcha maktablar + sonlar (faqat bosh admin)
router.get("/maktablar", async (req, res): Promise<void> => {
  if (!requireSuper(req, res)) return;
  try {
    const rows = await query<{ id: string; name: string; slug: string; address: string; created_at: string }>(
      "SELECT id, name, slug, address, created_at::text AS created_at FROM maktablar ORDER BY created_at"
    );
    const out = await Promise.all(rows.map(async (m) => {
      const [students, classes, staff, director] = await Promise.all([
        queryCount("SELECT COUNT(*) FROM users WHERE maktab_id = $1", [m.id]),
        queryCount("SELECT COUNT(*) FROM classes WHERE maktab_id = $1", [m.id]),
        queryCount("SELECT COUNT(*) FROM staff WHERE maktab_id = $1", [m.id]),
        queryOne<{ full_name: string; login: string }>(
          "SELECT full_name, login FROM staff WHERE maktab_id = $1 AND role IN ('director','mudir') ORDER BY created_at LIMIT 1",
          [m.id]
        ),
      ]);
      return {
        id: m.id, name: m.name, slug: m.slug, address: m.address, created_at: m.created_at,
        students, classes, staff,
        director_name: director?.full_name ?? null,
        director_login: director?.login ?? null,
        is_default: m.id === DEFAULT_MAKTAB_ID,
      };
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/maktablar  { name, address? } — yangi maktab ochish (faqat bosh admin)
router.post("/maktablar", async (req, res): Promise<void> => {
  if (!requireSuper(req, res)) return;
  const name = String((req.body as { name?: unknown }).name ?? "").trim();
  const address = String((req.body as { address?: unknown }).address ?? "").trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Maktab nomini kiriting (masalan: 1-maktab)" });
    return;
  }
  try {
    let slug = slugify(name);
    // slug band bo'lsa — raqam qo'shamiz
    const exists = await queryOne("SELECT id FROM maktablar WHERE slug = $1", [slug]);
    if (exists) slug = `${slug}${Math.floor(10 + Math.random() * 90)}`;
    const m = await queryOne<{ id: string; name: string; slug: string; address: string; created_at: string }>(
      "INSERT INTO maktablar (name, slug, address) VALUES ($1,$2,$3) RETURNING id, name, slug, address, created_at::text AS created_at",
      [name, slug, address]
    );
    if (!m) { res.status(500).json({ error: "Maktab yaratishda xatolik" }); return; }
    res.status(201).json({ ...m, students: 0, classes: 0, staff: 0, director_name: null, director_login: null, is_default: false });
  } catch (err) {
    res.status(500).json({ error: "Maktab yaratishda xatolik: " + (err as Error).message });
  }
});

// GET /api/maktablar/:id/directors — maktab direktor(lar)i
router.get("/maktablar/:id/directors", async (req, res): Promise<void> => {
  if (!requireSuper(req, res)) return;
  const { id } = req.params;
  const rows = await query<{ id: string; full_name: string; login: string; login_id: string; role: string }>(
    "SELECT id, full_name, login, login_id, role FROM staff WHERE maktab_id = $1 AND role IN ('director','mudir') ORDER BY created_at",
    [id]
  );
  res.json(rows);
});

// POST /api/maktablar/:id/director  { full_name } — maktabga direktor biriktirish (faqat bosh admin)
// Login + parol + 5 xonali ID avtomatik yaratiladi va BIR MARTA qaytariladi.
router.post("/maktablar/:id/director", async (req, res): Promise<void> => {
  if (!requireSuper(req, res)) return;
  const { id } = req.params;
  const full_name = String((req.body as { full_name?: unknown }).full_name ?? "").trim();
  if (full_name.length < 3) {
    res.status(400).json({ error: "Direktorning ism-familiyasini to'liq kiriting" });
    return;
  }

  const maktab = await queryOne<{ id: string; name: string; slug: string }>(
    "SELECT id, name, slug FROM maktablar WHERE id = $1", [id]
  );
  if (!maktab) { res.status(404).json({ error: "Maktab topilmadi" }); return; }

  // Bir maktabda bitta direktor
  const existing = await queryOne<{ full_name: string; login: string }>(
    "SELECT full_name, login FROM staff WHERE maktab_id = $1 AND role = 'director'", [id]
  );
  if (existing) {
    res.status(400).json({ error: `Bu maktabda direktor allaqachon bor: ${existing.full_name} (${existing.login}). Avval uni o'chiring yoki tahrirlang.` });
    return;
  }

  try {
    const login = makeStaffLogin(full_name);
    const password = `${maktab.slug}direktor`; // masalan: 1maktabdirektor
    const passwordHash = await hashPassword(password);
    const login_id = await genUniqueLoginId();
    const row = await queryOne<{ id: string }>(
      `INSERT INTO staff (full_name, role, class_id, login, password, login_id, telegram_id, subjects, can_teach, maktab_id)
       VALUES ($1,'director',NULL,$2,$3,$4,NULL,'{}',false,$5) RETURNING id`,
      [full_name, login, passwordHash, login_id, id]
    );
    if (!row) { res.status(500).json({ error: "Direktor yaratishda xatolik" }); return; }
    res.status(201).json({
      id: row.id, full_name, login, password, login_id,
      maktab_id: id, maktab_name: maktab.name,
    });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "Login band bo'lib qoldi, qayta urinib ko'ring" });
    } else {
      res.status(500).json({ error: "Direktor yaratishda xatolik: " + msg });
    }
  }
});

// DELETE /api/maktablar/:id — maktabni o'chirish (faqat bosh admin, 3-maktab o'chirilmaydi)
router.delete("/maktablar/:id", async (req, res): Promise<void> => {
  if (!requireSuper(req, res)) return;
  const { id } = req.params;
  if (id === DEFAULT_MAKTAB_ID) {
    res.status(400).json({ error: "Asosiy maktab (3-maktab) o'chirilmaydi" });
    return;
  }
  const students = await queryCount("SELECT COUNT(*) FROM users WHERE maktab_id = $1", [id]);
  if (students > 0) {
    res.status(400).json({ error: `Maktabda ${students} ta o'quvchi bor. Avval ularni o'chiring yoki ko'chiring.` });
    return;
  }
  await query("DELETE FROM maktablar WHERE id = $1", [id]); // staff/classes CASCADE bilan o'chadi
  res.sendStatus(204);
});

export default router;
