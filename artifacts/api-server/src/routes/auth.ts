import { Router, type IRouter } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../lib/db.js";
import {
  LoginBody,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger.js";
import { getChatIdByPhone, normalizePhone } from "../bot/settings.js";

// ─── Imzolangan token (HMAC-SHA256) ──────────────────────────────────────────
// Avval token faqat base64(JSON) edi — imzosiz, ya'ni har kim o'zi
// {"role":"admin",...} yasab, admin bo'lib kirishi mumkin edi.
// Endi har bir token maxfiy kalit bilan imzolanadi va imzo tekshirilmasa rad etiladi.
const TOKEN_SECRET = process.env["TOKEN_SECRET"] ?? process.env["JWT_SECRET"];
if (!TOKEN_SECRET) {
  logger.error(
    "⚠️  TOKEN_SECRET (yoki JWT_SECRET) environment variable o'rnatilmagan! " +
    "Tokenlar vaqtinchalik kalit bilan imzolanmoqda — buni Render'da albatta sozlang."
  );
}
const SECRET = TOKEN_SECRET ?? "insecure-dev-secret-o-zgartiring";

// ─── Parol xesh(hash)lash (bcrypt) ───────────────────────────────────────────
// Eski bazada parollar oddiy matn (plaintext) holida saqlangan edi.
// Endi yangi parollar bcrypt bilan xeshlanadi. Eski (hali xeshlanmagan)
// parollar bilan ham kirish davom etadi — muvaffaqiyatli kirishda ular
// avtomatik ravishda bcrypt xeshiga "yangilanadi" (upgrade-on-login),
// shuning uchun alohida katta migratsiya oynasi shart emas.
const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function looksHashed(stored: string): boolean {
  return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
}

/**
 * Kiritilgan parolni bazadagi qiymat bilan solishtiradi.
 * - Agar bazada bcrypt xeshi bo'lsa — bcrypt.compare bilan tekshiradi.
 * - Agar bazada hali eski plaintext parol bo'lsa — to'g'ridan-to'g'ri
 *   solishtiradi (vaqt-doimiy taqqoslash bilan) va agar mos kelsa,
 *   `onUpgrade` callback orqali xeshlangan variantga yangilaydi.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
  onUpgrade?: (newHash: string) => Promise<void>
): Promise<boolean> {
  if (looksHashed(stored)) {
    return bcrypt.compare(plain, stored);
  }
  const a = Buffer.from(plain);
  const b = Buffer.from(stored);
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (matches && onUpgrade) {
    const newHash = await hashPassword(plain);
    await onUpgrade(newHash).catch(() => { /* xeshni yangilab bo'lmasa ham kirishga ruxsat beramiz */ });
  }
  return matches;
}

// ─── Sessiya tokeni muddati ──────────────────────────────────────────────────
// Avval token muddatsiz edi (bir marta olingan token abadiy amal qilardi).
// Endi har bir sessiya tokeni 30 kundan keyin avtomatik eskiradi.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

function createSignedToken(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function parseSignedToken<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

interface MagicTokenData {
  payload: Record<string, unknown>;
  expiresAt: number;
}

export function createMagicToken(payload: Record<string, unknown>): string {
  const data: MagicTokenData = {
    payload,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  return createSignedToken(data);
}

function parseMagicToken(token: string): MagicTokenData | null {
  const data = parseSignedToken<MagicTokenData>(token);
  if (!data?.payload || !data.expiresAt) return null;
  return data;
}

// Bot /start dan kelgan Telegram foydalanuvchisini platformadagi akkauntga bog'lash uchun
// qisqa muddatli imzolangan token. pin-login o'quvchini "o'zim" deb tanlab PIN qo'yganda
// telegram_id ni shu token orqali bog'laydi (bildirishnomalar ishlashi uchun).
export function createTgBindToken(tg: number): string {
  return createSignedToken({ tg, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}
export function parseTgBindToken(token: string): number | null {
  const d = parseSignedToken<{ tg?: number; exp?: number }>(token);
  if (!d || typeof d.tg !== "number" || typeof d.exp !== "number" || Date.now() > d.exp) return null;
  return d.tg;
}

const router: IRouter = Router();

// #12/#13: bosqichma-bosqich o'quvchi kirishi uchun ustunlar.
//   classes.smena — sinf qaysi smenada (1/2); faqat 2 smenali maktablarda ishlatiladi.
//   users.pin_set — o'quvchi o'zining 4 xonali / chizma parolini o'rnatganmi.
void query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS smena SMALLINT;`).catch(() => { /* migratsiya yaratadi */ });
void query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_set BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => { /* migratsiya yaratadi */ });

const ADMIN_ID = process.env["ADMIN_ID"] ?? "";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? ADMIN_ID;

function createToken(payload: object): string {
  // Har bir sessiya tokeniga yaratilgan vaqt + amal qilish muddatini qo'shamiz.
  const withExpiry = { ...payload, _issuedAt: Date.now(), _expiresAt: Date.now() + SESSION_TTL_MS };
  return createSignedToken(withExpiry);
}

/** Sessiya tokeni (30 kun) — Telegram Mini App kirishi uchun ham ishlatiladi */
export function createSessionToken(payload: object): string {
  return createToken(payload);
}

function parseToken(token: string): Record<string, unknown> | null {
  const data = parseSignedToken<Record<string, unknown>>(token);
  if (!data) return null;
  const expiresAt = data["_expiresAt"] as number | undefined;
  // Eski (v1) tokenlarda _expiresAt yo'q edi — ularni ham vaqtincha qabul qilamiz,
  // lekin yangi login qilinganda ular avtomatik yangi, muddatli tokenga almashadi.
  if (typeof expiresAt === "number" && Date.now() > expiresAt) {
    return null;
  }
  return data;
}

export function getAuthUser(authHeader: string | undefined): Record<string, unknown> | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return parseToken(token);
}

// ─── KO'P MAKTABLI IZOLYATSIYA ───────────────────────────────────────────────
//  schoolOf: foydalanuvchi qaysi maktabni ko'radi.
//   • admin (tuman super-admini) → null = BARCHA maktablar (filtr yo'q)
//   • boshqalar → o'z maktab_id si (eski tokenda yo'q bo'lsa 3 — hozirgi maktab)
//  Har bir route SELECT/INSERT/UPDATE/DELETE da shu bilan filtrlanadi.
export function schoolOf(user: Record<string, unknown> | null | undefined): number | null {
  if (!user) return null;
  if ((user["role"] as string) === "admin") {
    // Bosh admin bitta maktabni "ko'rish" rejimiga o'tsa — o'sha maktab (token ichida _viewMaktab).
    // Aks holda null = BARCHA maktablar (aralash ko'rinish).
    const v = user["_viewMaktab"];
    return typeof v === "number" ? v : null;
  }
  const m = user["maktab_id"];
  return typeof m === "number" ? m : 3;
}

import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  (req as Request & { user: Record<string, unknown> }).user = user;
  next();
}

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { login, password } = parsed.data;
  const trimmedLogin = login.trim();
  const trimmedPassword = password.trim();

  // Admin paroli bo'sh bo'lsa (env sozlanmagan) — admin login qabul qilinmaydi (xavfsizlik)
  if (trimmedLogin === "admin" && ADMIN_PASSWORD.trim() !== "" && trimmedPassword === ADMIN_PASSWORD.trim()) {
    const payload = {
      id: "admin",
      role: "admin",
      full_name: "Administrator",
      login: "admin",
      class_name: null,
      class_id: null,
      telegram_id: null,
      maktab_id: null, // tuman super-admini — barcha maktablar (token ichida qoladi)
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  type StaffRow = { id: string; full_name: string; role: string; class_id: string | null; login: string; password: string; telegram_id: number | null; subjects?: string[] | null; can_teach?: boolean; pro_expires_at?: string | null; maktab_id?: number | null };

  const staff = await queryOne<StaffRow>(
    "SELECT id, full_name, role, class_id, login, password, telegram_id, subjects, can_teach, pro_expires_at, maktab_id FROM staff WHERE LOWER(login) = LOWER($1)",
    [trimmedLogin]
  );

  const staffPasswordOk = staff
    ? await verifyPassword(trimmedPassword, staff.password, async (newHash) => {
        await query("UPDATE staff SET password = $1 WHERE id = $2", [newHash, staff.id]);
      })
    : false;

  if (staff && staffPasswordOk) {
    let class_name: string | null = null;
    if (staff.class_id) {
      const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [staff.class_id]);
      class_name = cls?.name ?? null;
    }
    const isTeachingRole = ["teacher", "sinf_rahbari"].includes(staff.role);
    const subjects = isTeachingRole ? (staff.subjects ?? []) : undefined;
    const payload = {
      id: staff.id,
      role: staff.role,
      full_name: staff.full_name,
      login: staff.login,
      class_name,
      class_id: staff.class_id,
      telegram_id: staff.telegram_id,
      subjects,
      can_teach: staff.can_teach ?? false,
      pro_expires_at: (staff as Record<string, unknown>)["pro_expires_at"] as string | null ?? null,
      maktab_id: staff.role === "admin" ? null : (staff.maktab_id ?? 3),
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  type StudentRow = { id: string; telegram_id: number; full_name: string; class_name: string; login: string; password: string; pro_expires_at?: string | null; maktab_id?: number | null };

  const student = await queryOne<StudentRow>(
    "SELECT id, telegram_id, full_name, class_name, login, password, pro_expires_at, maktab_id FROM users WHERE LOWER(login) = LOWER($1)",
    [trimmedLogin]
  );

  const studentPasswordOk = student
    ? await verifyPassword(trimmedPassword, student.password, async (newHash) => {
        await query("UPDATE users SET password = $1 WHERE id = $2", [newHash, student.id]);
      })
    : false;

  if (student && studentPasswordOk) {
    const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [student.class_name]);
    const payload = {
      id: student.id ?? String(student.telegram_id),
      role: "student",
      full_name: student.full_name,
      login: student.login,
      class_name: student.class_name,
      class_id: cls?.id ?? null,
      telegram_id: student.telegram_id,
      pro_expires_at: (student as Record<string, unknown>)["pro_expires_at"] as string | null ?? null,
      maktab_id: student.maktab_id ?? 3,
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  logger.warn({ login }, "Failed login attempt");
  res.status(401).json({ error: "Login yoki parol noto'g'ri" });
});

// ═══════════════════════════════════════════════════════════════════════════
//  #12 — BOSQICHMA-BOSQICH O'QUVCHI KIRISHI (ochiq — autentifikatsiyasiz)
//    maktab → (smena — faqat 2 smenali maktabda) → bo'lim → sinf → o'zi → PIN
//  Eski ID+parol bilan kirish (/auth/login) ham ishlayveradi.
// ═══════════════════════════════════════════════════════════════════════════

// 1) Maktablar ro'yxati (o'chirilmaganlar) — smena belgisi bilan
router.get("/auth/pick/schools", async (_req, res): Promise<void> => {
  const rows = await query<{ id: number; nom: string; tuman: string; ikki_smena: boolean }>(
    "SELECT id, nom, COALESCE(tuman,'') AS tuman, COALESCE(ikki_smena,false) AS ikki_smena FROM maktablar WHERE deleted_at IS NULL ORDER BY id"
  ).catch(() => [] as { id: number; nom: string; tuman: string; ikki_smena: boolean }[]);
  res.json(rows);
});

// 2) Sinflar — maktab bo'yicha; ixtiyoriy smena (1/2) va bo'lim (boshlangich/yuqori) filtri
router.get("/auth/pick/classes", async (req, res): Promise<void> => {
  const mid = Number(req.query["maktab_id"]);
  if (!Number.isInteger(mid)) { res.status(400).json({ error: "maktab_id kerak" }); return; }
  const smenaRaw = req.query["smena"];
  const smena = smenaRaw != null && String(smenaRaw) !== "" ? Number(smenaRaw) : null;
  const bolim = typeof req.query["bolim"] === "string" ? String(req.query["bolim"]) : "";
  const rows = await query<{ name: string; smena: number | null }>(
    "SELECT name, smena FROM classes WHERE maktab_id = $1 AND name <> '' ORDER BY name",
    [mid]
  ).catch(() => [] as { name: string; smena: number | null }[]);
  const grade = (nm: string): number => { const m = nm.match(/^\s*(\d{1,2})/); return m ? Number(m[1]) : 0; };
  let out = rows;
  // smena tanlangan bo'lsa — shu smenadagi (yoki hali belgilanmagan) sinflar
  if (smena === 1 || smena === 2) out = out.filter((r) => r.smena == null || r.smena === smena);
  if (bolim === "boshlangich") out = out.filter((r) => grade(r.name) >= 1 && grade(r.name) <= 4);
  else if (bolim === "yuqori") out = out.filter((r) => grade(r.name) >= 5);
  res.json(out.map((r) => r.name));
});

// 3) Sinfdagi o'quvchilar — o'zini tanlash uchun (parol o'rnatilgan/yo'qligi bilan)
router.get("/auth/pick/students", async (req, res): Promise<void> => {
  const mid = Number(req.query["maktab_id"]);
  const cls = typeof req.query["class"] === "string" ? String(req.query["class"]).trim() : "";
  if (!Number.isInteger(mid) || !cls) { res.status(400).json({ error: "maktab_id va class kerak" }); return; }
  const rows = await query<{ login: string; full_name: string; pin_set: boolean }>(
    "SELECT login, full_name, COALESCE(pin_set,false) AS pin_set FROM users WHERE maktab_id = $1 AND class_name = $2 ORDER BY full_name",
    [mid, cls]
  ).catch(() => [] as { login: string; full_name: string; pin_set: boolean }[]);
  res.json(rows);
});

// 4) PIN bilan kirish. pin_set=false bo'lsa — birinchi marta o'rnatiladi; aks holda tekshiriladi.
//    pin — 4 xonali kod YOKI chizma (pattern, masalan "0-1-2-5-8") — ikkisi ham matn sifatida keladi.
const PinLoginBody = z.object({ login: z.string().min(1), pin: z.string().min(4).max(64), tg: z.string().max(400).optional() });
router.post("/auth/pin-login", async (req, res): Promise<void> => {
  const parsed = PinLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }
  const login = parsed.data.login.trim();
  const pin = parsed.data.pin.trim();
  type Row = { id: string; telegram_id: number; full_name: string; class_name: string; login: string; password: string; pro_expires_at?: string | null; maktab_id?: number | null; pin_set?: boolean };
  const student = await queryOne<Row>(
    "SELECT id, telegram_id, full_name, class_name, login, password, pro_expires_at, maktab_id, COALESCE(pin_set,false) AS pin_set FROM users WHERE LOWER(login) = LOWER($1)",
    [login]
  );
  if (!student) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
  if (student.pin_set) {
    const ok = await verifyPassword(pin, student.password, async (newHash) => {
      await query("UPDATE users SET password = $1 WHERE id = $2", [newHash, student.id]);
    });
    if (!ok) { res.status(401).json({ error: "Parol noto'g'ri" }); return; }
  } else {
    const hash = await hashPassword(pin);
    await query("UPDATE users SET password = $1, pin_set = TRUE WHERE id = $2", [hash, student.id]);
  }
  // Bot /start dan kelgan bo'lsa (tg token) va o'quvchiga hali Telegram bog'lanmagan bo'lsa —
  // telegram_id ni bog'laymiz (davomat bildirishnomalari ishlashi uchun). Best-effort.
  let boundTg = student.telegram_id;
  if (parsed.data.tg && (!student.telegram_id || Number(student.telegram_id) === 0)) {
    const tg = parseTgBindToken(parsed.data.tg);
    if (tg) {
      try {
        await query("UPDATE users SET telegram_id = $1 WHERE id = $2 AND (telegram_id IS NULL OR telegram_id = 0)", [tg, student.id]);
        boundTg = tg;
      } catch { /* telegram_id band bo'lishi mumkin — bildirishnomasiz davom etadi */ }
    }
  }
  const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1 AND maktab_id = $2", [student.class_name, student.maktab_id ?? 3]);
  const payload = {
    id: student.id ?? String(student.telegram_id),
    role: "student",
    full_name: student.full_name,
    login: student.login,
    class_name: student.class_name,
    class_id: cls?.id ?? null,
    telegram_id: boundTg,
    pro_expires_at: (student as Record<string, unknown>)["pro_expires_at"] as string | null ?? null,
    maktab_id: student.maktab_id ?? 3,
  };
  const token = createToken(payload);
  res.setHeader("X-Auth-Token", token);
  res.json(LoginResponse.parse({ ...payload, token }));
});

// 5) PINni tiklash (admin/rahbariyat/sinf rahbari) — o'quvchi parolini unutsa, qayta o'rnatadi.
router.post("/auth/pin-reset", async (req, res): Promise<void> => {
  const au = getAuthUser(req.headers.authorization);
  const role = au ? String(au["role"] ?? "") : "";
  if (!["admin", "director", "zam_direktor", "zavuch", "sinf_rahbari"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  const login = typeof (req.body as Record<string, unknown>)?.["login"] === "string" ? String((req.body as Record<string, unknown>)["login"]).trim() : "";
  if (!login) { res.status(400).json({ error: "login kerak" }); return; }
  const mid = schoolOf(au);
  if (mid === null) {
    await query("UPDATE users SET pin_set = FALSE WHERE LOWER(login) = LOWER($1)", [login]);
  } else {
    await query("UPDATE users SET pin_set = FALSE WHERE LOWER(login) = LOWER($1) AND maktab_id = $2", [login, mid]);
  }
  res.json({ ok: true });
});

function generateStudentLogin(firstName: string): string {
  const base = firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "student";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

async function uniqueLogin(base: string): Promise<string> {
  let login = base;
  let suffix = 1;
  while (true) {
    const [a, b] = await Promise.all([
      queryOne("SELECT login FROM staff WHERE LOWER(login) = LOWER($1)", [login]),
      queryOne("SELECT login FROM users WHERE LOWER(login) = LOWER($1)", [login]),
    ]);
    if (!a && !b) return login;
    login = `${base}${suffix}`;
    suffix++;
  }
}

const STAFF_ROLE_SLUG: Record<string, string> = {
  director: "direktor",
  mudir: "direktor",
  zam_direktor: "zamdirektor",
  zavuch: "zavuch",
  kutubxonachi: "kutubxona",
  teacher: "fan",
};

function generateStaffPassword(role: string, className: string | null): string {
  if (role === "sinf_rahbari" && className) {
    return "3maktab" + className.toLowerCase().replace(/\s+/g, "");
  }
  return "3maktab" + (STAFF_ROLE_SLUG[role] ?? role);
}

function generateStudentPassword(className: string): string {
  return "3maktab" + className.toLowerCase().replace(/\s+/g, "");
}

// POST /api/auth/register
// MAHFIY KOD bilan ro'yxatdan o'tish BEKOR QILINDI.
// Endi hisobni maktab ma'muriyati ochadi; o'quvchi Face ID yoki 5 xonali ID bilan kiradi.
router.post("/auth/register", async (_req, res): Promise<void> => {
  res.status(410).json({ error: "Ro'yxatdan o'tish yopilgan. Hisob maktab ma'muriyati tomonidan beriladi. Face ID yoki 5 xonali ID bilan kiring." });
  return;
});

// (eski kod — endi ishlatilmaydi)
router.post("/auth/_register_disabled", async (req, res): Promise<void> => {
  const { last_name, first_name, phone_number, class_name, code_id } = req.body as {
    last_name?: string;
    first_name?: string;
    phone_number?: string;
    class_name?: string;
    code_id?: string;
  };

  if (!first_name || first_name.trim().length < 2) {
    res.status(400).json({ error: "Ismni kiriting (kamida 2 ta harf)" });
    return;
  }
  if (!last_name || last_name.trim().length < 2) {
    res.status(400).json({ error: "Familiyani kiriting (kamida 2 ta harf)" });
    return;
  }
  if (!phone_number || phone_number.trim().length < 7) {
    res.status(400).json({ error: "Telefon raqamni kiriting" });
    return;
  }
  if (!class_name || class_name.trim().length < 1) {
    res.status(400).json({ error: "Sinfni tanlang" });
    return;
  }

  const full_name = `${last_name.trim()} ${first_name.trim()}`;
  const login = await uniqueLogin(generateStudentLogin(first_name.trim()));
  const password = generateStudentPassword(class_name.trim());

  const normalizedPhone = normalizePhone(phone_number);
  const phoneUsers = await query("SELECT login FROM users WHERE phone_number = $1", [normalizedPhone]);

  if (phoneUsers.length >= 2) {
    res.status(400).json({ error: "Bu telefon raqami bilan maksimal 2 ta foydalanuvchi ro'yxatdan o'ta oladi" });
    return;
  }

  const linkedChatId = getChatIdByPhone(normalizedPhone);
  const telegram_id = linkedChatId ?? Date.now();
  const registration_date = new Date().toISOString();

  const pro_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const passwordHash = await hashPassword(password);
    await query(
      "INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, registration_date, pro_expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [telegram_id, full_name, normalizedPhone, class_name, login, passwordHash, registration_date, pro_expires_at]
    );

    if (code_id) {
      await query(
        "UPDATE registration_codes SET used = true, used_at = $1 WHERE id = $2",
        [new Date().toISOString(), code_id]
      );
    }

    const payload = {
      id: String(telegram_id),
      role: "student",
      full_name,
      login,
      class_name,
      class_id: null,
      telegram_id,
      pro_expires_at,
    };
    const token = createToken(payload);
    res.json({ ...LoginResponse.parse({ ...payload, token }), password });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Xatolik yuz berdi" });
  }
});
router.post("/auth/register-staff", async (req, res): Promise<void> => {
  const { last_name, first_name, full_name: rawFullName, role, class_id, subjects, code_id } = req.body as {
    last_name?: string;
    first_name?: string;
    full_name?: string;
    role?: string;
    class_id?: string | null;
    subjects?: string[];
    code_id?: string;
  };

  const full_name = (first_name && last_name)
    ? `${last_name.trim()} ${first_name.trim()}`
    : (rawFullName ?? "");

  const allowedRoles = ["director", "mudir", "zam_direktor", "zavuch", "sinf_rahbari", "teacher", "kutubxonachi"];
  if (!role || !allowedRoles.includes(role)) {
    res.status(400).json({ error: "Noto'g'ri rol tanlandi" });
    return;
  }
  if (!full_name || full_name.trim().length < 2) {
    res.status(400).json({ error: "Ism familiyani to'liq kiriting" });
    return;
  }

  const SINGLE_SLOT_ROLES = ["director", "mudir", "zam_direktor", "zavuch", "kutubxonachi"];
  if (SINGLE_SLOT_ROLES.includes(role)) {
    const existingRole = await queryOne("SELECT id FROM staff WHERE role = $1", [role]);
    if (existingRole) {
      const roleNames: Record<string, string> = {
        director: "Direktor", mudir: "Obidov Boburjon",
        zam_direktor: "MMTB", zavuch: "O'quv ishlari mudiri", kutubxonachi: "Kutubxonachi",
      };
      res.status(400).json({ error: `${roleNames[role] ?? role} allaqachon ro'yxatdan o'tgan` });
      return;
    }
  }

  if ((role === "sinf_rahbari" || role === "teacher") && class_id) {
    const existingRahbar = await queryOne(
      "SELECT id FROM staff WHERE role IN ('sinf_rahbari','teacher') AND class_id = $1",
      [class_id]
    );
    if (existingRahbar) {
      res.status(400).json({ error: "Bu sinf uchun sinf rahbari allaqachon tayinlangan" });
      return;
    }
  }

  if (role === "sinf_rahbari" && !class_id) {
    res.status(400).json({ error: "Sinf rahbari uchun sinf tanlanishi shart" });
    return;
  }

  // Login va parol endi qo'lda kiritilmaydi — avtomatik generatsiya qilinadi
  // (login: ismning bosh harfi katta bilan; parol: 3maktab + sinf yoki lavozim).
  let classNameForPassword: string | null = null;
  if (class_id) {
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [class_id]);
    classNameForPassword = cls?.name ?? null;
  }

  const loginFirstName = (first_name && first_name.trim()) || full_name.trim().split(" ")[0] || "xodim";
  const login = await uniqueLogin(generateStudentLogin(loginFirstName));
  const password = generateStaffPassword(role, classNameForPassword);

  const pro_expires_at_staff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const passwordHash = await hashPassword(password);
    const newStaff = await queryOne<{ id: string; full_name: string; role: string; class_id: string | null; login: string; password: string; telegram_id: number | null; pro_expires_at: string | null }>(
      "INSERT INTO staff (full_name, role, class_id, login, password, telegram_id, subjects, can_teach, pro_expires_at) VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8) RETURNING id, full_name, role, class_id, login, password, telegram_id, pro_expires_at",
      [full_name.trim(), role, class_id ?? null, login, passwordHash,
       subjects ?? [],
       role === "teacher" || role === "sinf_rahbari",
       pro_expires_at_staff]
    );

    if (!newStaff) {
      res.status(500).json({ error: "Qo'shishda xatolik yuz berdi" });
      return;
    }

    if (code_id) {
      await query(
        "UPDATE registration_codes SET used = true, used_at = $1 WHERE id = $2",
        [new Date().toISOString(), code_id]
      );
    }

    let class_name: string | null = classNameForPassword;
    if (!class_name && newStaff.class_id) {
      const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [newStaff.class_id]);
      class_name = cls?.name ?? null;
    }

    const payload = {
      id: newStaff.id,
      role: newStaff.role,
      full_name: newStaff.full_name,
      login: newStaff.login,
      class_name,
      class_id: newStaff.class_id,
      telegram_id: newStaff.telegram_id,
      pro_expires_at: newStaff.pro_expires_at ?? null,
    };
    const token = createToken(payload);
    // Diqqat: bu yerda ataylab bazadagi (xeshlangan) `newStaff.password` emas,
    // balki foydalanuvchi kiritgan asl (plaintext) `password` qaytariladi —
    // aks holda admin ekranida bcrypt xeshi ko'rsatilib qolardi.
    res.status(201).json({ ...payload, token, password });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Xatolik yuz berdi" });
  }
});

// GET /api/auth/bot-login?token=xxx
router.get("/auth/bot-login", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "Token kerak" });
    return;
  }

  const entry = parseMagicToken(token);
  if (!entry) {
    res.status(401).json({ error: "Token yaroqsiz" });
    return;
  }
  if (entry.expiresAt < Date.now()) {
    res.status(401).json({ error: "Token muddati o'tgan (15 daqiqa). Botdan qayta havolani oling." });
    return;
  }

  // maktab_id ni token ichiga qo'shamiz (bot payloadida bo'lmasligi mumkin) —
  // login bo'yicha DB dan qidiramiz. Admin → null (barcha maktablar).
  const p = entry.payload as Record<string, unknown>;
  let maktab_id: number | null = (typeof p["maktab_id"] === "number" ? (p["maktab_id"] as number) : null);
  if (maktab_id === null && p["role"] !== "admin" && typeof p["login"] === "string") {
    const row = await queryOne<{ maktab_id: number }>(
      p["role"] === "student"
        ? "SELECT maktab_id FROM users WHERE login = $1"
        : "SELECT maktab_id FROM staff WHERE login = $1",
      [p["login"]],
    ).catch(() => null);
    maktab_id = row?.maktab_id ?? 3;
  }
  const authToken = createToken({ ...entry.payload, maktab_id });
  res.json(LoginResponse.parse({ ...entry.payload, token: authToken }));
});

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    return;
  }
  res.json(GetMeResponse.parse(user));
});

// POST /api/auth/view-school { maktab_id: number | null }
// Bosh admin uchun: bitta maktabni "ko'rish" rejimiga o'tadi (yoki null = barcha maktablar).
// Yangi token qaytaradi — undan keyin barcha sahifalar o'sha maktabga filtrlanadi.
router.post("/auth/view-school", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || (user["role"] as string) !== "admin") {
    res.status(403).json({ error: "Faqat bosh administrator" });
    return;
  }
  const raw = (req.body as { maktab_id?: unknown })?.maktab_id;
  const mid = (raw === null || raw === undefined || raw === "") ? null : Number(raw);
  if (mid !== null && !Number.isInteger(mid)) {
    res.status(400).json({ error: "Noto'g'ri maktab raqami" });
    return;
  }
  // Tokenni qayta yasaymiz: eski muddat belgilarini olib tashlab, _viewMaktab ni qo'yamiz.
  const payload: Record<string, unknown> = { ...user, _viewMaktab: mid };
  delete payload["_issuedAt"];
  delete payload["_expiresAt"];
  const token = createToken(payload);
  res.setHeader("X-Auth-Token", token);
  res.json({ token, maktab_id: mid });
});

// POST /api/auth/logout
router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json(LogoutResponse.parse({ ok: true }));
});

// PATCH /api/auth/update-credentials — login va/yoki parolni o'zgartirish
// (avtomatik berilgan login/parol yoqmasa, foydalanuvchi o'zi tahrirlaydi).
// Ishlaydi: o'quvchi, o'qituvchi/xodim va admin uchun ham.
const UpdateCredentialsBody = z.object({
  login: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._]+$/, "Login faqat lotin harflar, raqam va nuqtadan iborat bo'lsin").optional(),
  password: z.string().min(4).max(64).optional(),
});

router.patch("/auth/update-credentials", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  if (user["role"] === "admin") { res.status(400).json({ error: "Admin login/paroli bu yerdan o'zgartirilmaydi" }); return; }

  const parsed = UpdateCredentialsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { login: newLogin, password: newPassword } = parsed.data;
  if (!newLogin && !newPassword) { res.status(400).json({ error: "Hech narsa o'zgartirilmadi" }); return; }

  const isStudent = user["role"] === "student";
  const table = isStudent ? "users" : "staff";
  const userId = user["id"] as string;

  if (newLogin) {
    const trimmed = newLogin.trim();
    const [existStaff, existStudent] = await Promise.all([
      queryOne("SELECT id FROM staff WHERE LOWER(login) = LOWER($1) AND id != $2", [trimmed, isStudent ? "" : userId]),
      queryOne("SELECT id FROM users WHERE LOWER(login) = LOWER($1) AND id != $2", [trimmed, isStudent ? userId : ""]),
    ]);
    if (existStaff || existStudent) {
      res.status(400).json({ error: "Bu login band. Boshqasini tanlang." });
      return;
    }
    await query(`UPDATE ${table} SET login = $1 WHERE id = $2`, [trimmed, userId]);
  }

  if (newPassword) {
    const hash = await hashPassword(newPassword);
    await query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hash, userId]);
  }

  const fresh = await queryOne<{ login: string }>(`SELECT login FROM ${table} WHERE id = $1`, [userId]);
  res.json({ ok: true, login: fresh?.login ?? user["login"] });
});

export default router;
