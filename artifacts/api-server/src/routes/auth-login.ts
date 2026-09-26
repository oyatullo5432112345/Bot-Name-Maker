// ═══════════════════════════════════════════════════════════════════════════
//  KIRISH — Yuz (Face ID) va 5 xonali ID orqali
//
//  • O'quvchi: yuzni skanerlab kiradi (yuz izlari serverda solishtiriladi —
//    boshqa o'quvchilarning yuz ma'lumoti brauzerga YUBORILMAYDI). Imkoni
//    bo'lmasa 5 xonali ID bilan ham kira oladi.
//  • O'qituvchi / admin: 5 xonali ID bilan (admin uchun parol ham zaxira — /auth/login).
//  • Yuz bilan kirilgach sessiya 1 soat; keyin qayta so'raladi.
//  • Yuzda "tiriklik" tekshiruvi: 2 ta kadr (to'g'ri + burilgan) — rasm bilan aldashni qiyinlashtiradi.
// ═══════════════════════════════════════════════════════════════════════════

import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

const SECRET = process.env["TOKEN_SECRET"] ?? process.env["JWT_SECRET"] ?? "insecure-dev-secret-o-zgartiring";
const FACE_SESSION_MS = Number(process.env["FACE_SESSION_MIN"] ?? 60) * 60_000; // yuz: 1 soat
const ID_SESSION_MS = Number(process.env["ID_SESSION_MIN"] ?? 720) * 60_000; // ID: 12 soat

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const LIST_ROLES = [...MANAGE, "sinf_rahbari", "teacher"];

// ─── Sxema (server ishga tushganda, idempotent — Render free'da preDeploy yo'q) ──
const AUTH_SCHEMA_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id) WHERE login_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_login_id ON staff(login_id) WHERE login_id <> '';
CREATE TABLE IF NOT EXISTS auth_settings (
  id SMALLINT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;
void query(AUTH_SCHEMA_SQL)
  .then(() => logger.info("Kirish (auth login_id) sxemasi tayyor ✅"))
  .catch((err) => logger.error({ err }, "auth login_id sxemasini yaratishda xato"));

interface AuthSettings { admin_login_id?: string }
async function getAuthSettings(): Promise<AuthSettings> {
  const row = await queryOne<{ data: AuthSettings }>("SELECT data FROM auth_settings WHERE id = 1").catch(() => null);
  return row?.data ?? {};
}
async function saveAuthSettings(next: AuthSettings): Promise<void> {
  await query(
    `INSERT INTO auth_settings (id, data, updated_at) VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
    [JSON.stringify(next)]
  );
}

// ─── Token (auth.ts bilan bir xil format — getAuthUser tekshira oladi) ───────
function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}
function createToken(payload: object, ttlMs: number): string {
  const withExpiry = { ...payload, _issuedAt: Date.now(), _expiresAt: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(withExpiry)).toString("base64url");
  return `${body}.${sign(body)}`;
}

// ─── 5 xonali ID ──────────────────────────────────────────────────────────
async function idTaken(code: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    queryOne("SELECT 1 FROM users WHERE login_id = $1", [code]),
    queryOne("SELECT 1 FROM staff WHERE login_id = $1", [code]),
  ]);
  const s = await getAuthSettings();
  return !!a || !!b || s.admin_login_id === code;
}
export async function genUniqueLoginId(): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const code = String(crypto.randomInt(10000, 100000)); // 10000..99999
    if (!(await idTaken(code))) return code;
  }
  throw new Error("Bo'sh ID topilmadi");
}
/** users/staff qatoriga login_id yo'q bo'lsa — beradi va qaytaradi */
export async function ensureLoginId(table: "users" | "staff", id: string): Promise<string> {
  const row = await queryOne<{ login_id: string }>(`SELECT login_id FROM ${table} WHERE id = $1`, [id]);
  if (row?.login_id) return row.login_id;
  const code = await genUniqueLoginId();
  await query(`UPDATE ${table} SET login_id = $1 WHERE id = $2`, [code, id]);
  return code;
}
async function ensureAdminId(): Promise<string> {
  const s = await getAuthSettings();
  if (s.admin_login_id) return s.admin_login_id;
  const code = await genUniqueLoginId();
  await saveAuthSettings({ ...s, admin_login_id: code });
  return code;
}

// ─── Yuz izlari solishtirish ────────────────────────────────────────────────
function dist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i]! - b[i]!; s += d * d; }
  return Math.sqrt(s);
}
function isDescriptor(x: unknown): x is number[] {
  return Array.isArray(x) && x.length === 128 && x.every((n) => typeof n === "number");
}
async function faceThreshold(): Promise<number> {
  const row = await queryOne<{ data: { threshold?: number } }>("SELECT data FROM face_settings WHERE id = 1").catch(() => null);
  const t = row?.data?.threshold ?? 0.48;
  return Math.min(0.46, t); // kirishда biroz qat'iyroq
}

// ─── Oddiy tezlik cheklovi (xotirada) ────────────────────────────────────────
const hits = new Map<string, { n: number; reset: number }>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.reset) { hits.set(key, { n: 1, reset: now + windowMs }); return false; }
  h.n++;
  return h.n > max;
}
function clientIp(req: Request): string {
  const xf = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return xf || req.socket?.remoteAddress || "?";
}

// ─── Payloadlar ──────────────────────────────────────────────────────────────
async function studentPayload(u: { id: string; full_name: string; login: string; class_name: string; telegram_id: number | null; pro_expires_at?: string | null }) {
  const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [u.class_name]).catch(() => null);
  return {
    id: u.id ?? String(u.telegram_id), role: "student", full_name: u.full_name, login: u.login,
    class_name: u.class_name, class_id: cls?.id ?? null, telegram_id: u.telegram_id,
    pro_expires_at: u.pro_expires_at ?? null,
  };
}
async function staffPayload(s: { id: string; full_name: string; login: string; role: string; class_id: string | null; telegram_id: number | null; subjects?: string[] | null; can_teach?: boolean; pro_expires_at?: string | null }) {
  let class_name: string | null = null;
  if (s.class_id) {
    const c = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [s.class_id]).catch(() => null);
    class_name = c?.name ?? null;
  }
  const teaching = ["teacher", "sinf_rahbari"].includes(s.role);
  return {
    id: s.id, role: s.role, full_name: s.full_name, login: s.login, class_name, class_id: s.class_id,
    telegram_id: s.telegram_id, subjects: teaching ? (s.subjects ?? []) : undefined,
    can_teach: s.can_teach ?? false, pro_expires_at: s.pro_expires_at ?? null,
  };
}

// ═══════════════════════════════ ENDPOINTLAR ══════════════════════════════════

// GET /api/auth/login-config — kirish sahifasi uchun (ochiq)
router.get("/auth/login-config", async (_req, res): Promise<void> => {
  res.json({ face_login: true, id_login: true, liveness: true });
});

// POST /api/auth/face-login  { descriptors: number[][] }  (o'quvchilar)
router.post("/auth/face-login", async (req, res): Promise<void> => {
  const ip = clientIp(req);
  if (rateLimited(`face:${ip}`, 12, 5 * 60_000)) { res.status(429).json({ error: "Juda ko'p urinish. Biroz kuting yoki ID bilan kiring." }); return; }

  const body = req.body as { descriptors?: unknown };
  const ds = Array.isArray(body.descriptors) ? (body.descriptors as unknown[]).filter(isDescriptor) as number[][] : [];
  if (ds.length < 1) { res.status(400).json({ error: "Yuz ma'lumoti yuborilmadi" }); return; }
  if (ds.length >= 2 && dist(ds[0]!, ds[1]!) < 0.12) {
    res.status(400).json({ error: "Tiriklik tasdiqlanmadi — boshingizni biroz buring va qayta urinib ko'ring" });
    return;
  }

  const th = await faceThreshold();
  const people = await query<{ student_login: string; descriptors: number[][] }>(
    "SELECT student_login, descriptors FROM face_profiles WHERE consent"
  );

  // Har bir kelgan kadr uchun eng yaqin va ikkinchi eng yaqin o'quvchini topamiz
  function matchOne(d: number[]): { login: string | null; best: number; second: number } {
    let bLogin: string | null = null, best = Infinity, second = Infinity;
    for (const p of people) {
      let m = Infinity;
      for (const pd of p.descriptors ?? []) { if (isDescriptor(pd)) { const v = dist(d, pd); if (v < m) m = v; } }
      if (m < best) { second = best; best = m; bLogin = p.student_login; }
      else if (m < second) second = m;
    }
    return { login: bLogin, best, second };
  }

  const results = ds.map(matchOne);
  const ok = results.every((r) => r.login && r.best < th && r.second - r.best > 0.06);
  const sameLogin = results.every((r) => r.login === results[0]!.login);
  if (!ok || !sameLogin || !results[0]!.login) {
    res.status(401).json({ error: "Yuz tanilmadi. Qayta urinib ko'ring yoki 5 xonali ID bilan kiring." });
    return;
  }

  const login = results[0]!.login;
  const u = await queryOne<{ id: string; full_name: string; login: string; class_name: string; telegram_id: number | null; pro_expires_at?: string | null }>(
    "SELECT id, full_name, login, class_name, telegram_id::float8 AS telegram_id, pro_expires_at FROM users WHERE login = $1",
    [login]
  );
  if (!u) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
  const payload = await studentPayload(u);
  const token = createToken(payload, FACE_SESSION_MS);
  res.json({ ...payload, token });
});

// POST /api/auth/id-login  { login_id }
router.post("/auth/id-login", async (req, res): Promise<void> => {
  const ip = clientIp(req);
  if (rateLimited(`id:${ip}`, 20, 5 * 60_000)) { res.status(429).json({ error: "Juda ko'p urinish. Biroz kuting." }); return; }

  const raw = String((req.body as { login_id?: unknown }).login_id ?? "").trim();
  if (!/^\d{5}$/.test(raw)) { res.status(400).json({ error: "5 xonali ID kiriting" }); return; }

  // O'quvchi
  const student = await queryOne<{ id: string; full_name: string; login: string; class_name: string; telegram_id: number | null; pro_expires_at?: string | null }>(
    "SELECT id, full_name, login, class_name, telegram_id::float8 AS telegram_id, pro_expires_at FROM users WHERE login_id = $1",
    [raw]
  );
  if (student) {
    const payload = await studentPayload(student);
    res.json({ ...payload, token: createToken(payload, ID_SESSION_MS) });
    return;
  }
  // Xodim
  const staff = await queryOne<{ id: string; full_name: string; login: string; role: string; class_id: string | null; telegram_id: number | null; subjects?: string[] | null; can_teach?: boolean; pro_expires_at?: string | null }>(
    "SELECT id, full_name, login, role, class_id, telegram_id, subjects, can_teach, pro_expires_at FROM staff WHERE login_id = $1",
    [raw]
  );
  if (staff) {
    const payload = await staffPayload(staff);
    res.json({ ...payload, token: createToken(payload, ID_SESSION_MS) });
    return;
  }
  // Admin
  const s = await getAuthSettings();
  if (s.admin_login_id && s.admin_login_id === raw) {
    const payload = { id: "admin", role: "admin", full_name: "Administrator", login: "admin", class_name: null, class_id: null, telegram_id: null };
    res.json({ ...payload, token: createToken(payload, ID_SESSION_MS) });
    return;
  }

  logger.warn({ ip }, "id-login: noto'g'ri ID");
  res.status(401).json({ error: "Bunday ID topilmadi" });
});

// GET /api/auth/my-id — o'z 5 xonali IDsini ko'rish (kerak bo'lsa yaratadi)
router.get("/auth/my-id", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization) as { id?: string; role?: string; login?: string } | null;
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  try {
    let login_id: string;
    if (u.role === "admin") login_id = await ensureAdminId();
    else if (u.role === "student") login_id = await ensureLoginId("users", String(u.id));
    else login_id = await ensureLoginId("staff", String(u.id));
    res.json({ login_id });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/auth/login-ids?class_name=...  — rahbariyat/o'qituvchi uchun ID ro'yxati (tarqatish uchun)
router.get("/auth/login-ids", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization) as { role?: string; class_name?: string | null } | null;
  if (!u || !LIST_ROLES.includes(String(u.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const className = String(req.query["class_name"] ?? "").trim();
  // Sinf rahbari / o'qituvchi faqat o'z sinfini ko'radi
  const scoped = ["sinf_rahbari", "teacher"].includes(String(u.role));
  const cls = scoped ? (u.class_name ?? "") : className;
  if (!cls) { res.status(400).json({ error: "Sinf tanlanmagan" }); return; }

  const rows = await query<{ id: string; full_name: string; login: string; login_id: string }>(
    "SELECT id, full_name, login, login_id FROM users WHERE class_name = $1 ORDER BY full_name",
    [cls]
  );
  // Bo'sh IDlarni to'ldiramiz
  const out: { full_name: string; login: string; login_id: string }[] = [];
  for (const r of rows) {
    const code = r.login_id || (await ensureLoginId("users", r.id));
    out.push({ full_name: r.full_name, login: r.login, login_id: code });
  }
  res.json(out);
});

// POST /api/auth/regen-id  { role: "student"|"staff", id }  — IDni yangilash (rahbariyat)
router.post("/auth/regen-id", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization) as { role?: string } | null;
  if (!u || !MANAGE.includes(String(u.role))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { role, id } = req.body as { role?: string; id?: string };
  const table = role === "staff" ? "staff" : "users";
  if (!id) { res.status(400).json({ error: "id kerak" }); return; }
  const code = await genUniqueLoginId();
  await query(`UPDATE ${table} SET login_id = $1 WHERE id = $2`, [code, id]);
  res.json({ ok: true, login_id: code });
});

export default router;
