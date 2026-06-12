import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import {
  LoginBody,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger.js";
import { getChatIdByPhone, normalizePhone } from "../bot/settings.js";

interface MagicTokenData {
  payload: Record<string, unknown>;
  expiresAt: number;
}

export function createMagicToken(payload: Record<string, unknown>): string {
  const data: MagicTokenData = {
    payload,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function parseMagicToken(token: string): MagicTokenData | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as MagicTokenData;
    if (!data.payload || !data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

const ADMIN_ID = process.env["ADMIN_ID"] ?? "";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? ADMIN_ID;

function createToken(payload: object): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function parseToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAuthUser(authHeader: string | undefined): Record<string, unknown> | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return parseToken(token);
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

  if (trimmedLogin === "admin" && trimmedPassword === ADMIN_PASSWORD.trim()) {
    const payload = {
      id: "admin",
      role: "admin",
      full_name: "Administrator",
      login: "admin",
      class_name: null,
      class_id: null,
      telegram_id: null,
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  type StaffRow = { id: string; full_name: string; role: string; class_id: string | null; login: string; password: string; telegram_id: number | null; subjects?: string[] | null; can_teach?: boolean };

  const staff = await queryOne<StaffRow>(
    "SELECT id, full_name, role, class_id, login, password, telegram_id, subjects, can_teach FROM staff WHERE login = $1 AND password = $2",
    [trimmedLogin, trimmedPassword]
  );

  if (staff) {
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
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  type StudentRow = { id: string; telegram_id: number; full_name: string; class_name: string; login: string; password: string };

  const student = await queryOne<StudentRow>(
    "SELECT id, telegram_id, full_name, class_name, login, password FROM users WHERE login = $1 AND password = $2",
    [trimmedLogin, trimmedPassword]
  );

  if (student) {
    const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [student.class_name]);
    const payload = {
      id: student.id ?? String(student.telegram_id),
      role: "student",
      full_name: student.full_name,
      login: student.login,
      class_name: student.class_name,
      class_id: cls?.id ?? null,
      telegram_id: student.telegram_id,
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  logger.warn({ login }, "Failed login attempt");
  res.status(401).json({ error: "Login yoki parol noto'g'ri" });
});

function generateStudentLogin(firstName: string): string {
  return firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "student";
}

function generateStudentPassword(className: string): string {
  return "3maktab" + className.toLowerCase().replace(/\s+/g, "");
}

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
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
  let login = generateStudentLogin(first_name.trim());
  const password = generateStudentPassword(class_name.trim());

  const ex1 = await queryOne("SELECT login FROM staff WHERE login = $1", [login]);
  const ex2 = await queryOne("SELECT login FROM users WHERE login = $1", [login]);

  if (ex1 || ex2) {
    let suffix = 1;
    while (true) {
      const candidate = `${login}${suffix}`;
      const a = await queryOne("SELECT login FROM staff WHERE login = $1", [candidate]);
      const b = await queryOne("SELECT login FROM users WHERE login = $1", [candidate]);
      if (!a && !b) { login = candidate; break; }
      suffix++;
    }
  }

  const normalizedPhone = normalizePhone(phone_number);
  const phoneUsers = await query("SELECT login FROM users WHERE phone_number = $1", [normalizedPhone]);

  if (phoneUsers.length >= 2) {
    res.status(400).json({ error: "Bu telefon raqami bilan maksimal 2 ta foydalanuvchi ro'yxatdan o'ta oladi" });
    return;
  }

  const linkedChatId = getChatIdByPhone(normalizedPhone);
  const telegram_id = linkedChatId ?? Date.now();
  const registration_date = new Date().toISOString();

  try {
    await query(
      "INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, registration_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [telegram_id, full_name, normalizedPhone, class_name, login, password, registration_date]
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
    };
    const token = createToken(payload);
    res.json(LoginResponse.parse({ ...payload, token }));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Xatolik yuz berdi" });
  }
});

// POST /api/auth/register-staff
router.post("/auth/register-staff", async (req, res): Promise<void> => {
  const { last_name, first_name, full_name: rawFullName, role, class_id, subjects, login: customLogin, password: customPassword, code_id } = req.body as {
    last_name?: string;
    first_name?: string;
    full_name?: string;
    role?: string;
    class_id?: string | null;
    subjects?: string[];
    login?: string;
    password?: string;
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
        zam_direktor: "Direktor o'rinbosari", zavuch: "Zavuch", kutubxonachi: "Kutubxonachi",
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

  if (!customLogin || customLogin.trim().length < 3) {
    res.status(400).json({ error: "Login kamida 3 ta belgidan iborat bo'lishi kerak" });
    return;
  }
  if (!customPassword || customPassword.length < 4) {
    res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" });
    return;
  }

  const login = customLogin.trim();
  const password = customPassword.trim();

  const [existLoginStaff, existLoginStudent] = await Promise.all([
    queryOne("SELECT id FROM staff WHERE login = $1", [login]),
    queryOne("SELECT login FROM users WHERE login = $1", [login]),
  ]);
  if (existLoginStaff || existLoginStudent) {
    res.status(400).json({ error: "Bu login band. Boshqa login tanlang." });
    return;
  }

  try {
    const newStaff = await queryOne<{ id: string; full_name: string; role: string; class_id: string | null; login: string; password: string; telegram_id: number | null }>(
      "INSERT INTO staff (full_name, role, class_id, login, password, telegram_id, subjects, can_teach) VALUES ($1,$2,$3,$4,$5,NULL,$6,$7) RETURNING id, full_name, role, class_id, login, password, telegram_id",
      [full_name.trim(), role, class_id ?? null, login, password,
       JSON.stringify(subjects ?? []),
       role === "teacher" || role === "sinf_rahbari"]
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

    let class_name: string | null = null;
    if (newStaff.class_id) {
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
    };
    const token = createToken(payload);
    res.status(201).json({ ...payload, token, password: newStaff.password });
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

  const authToken = createToken(entry.payload);
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

// POST /api/auth/logout
router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json(LogoutResponse.parse({ ok: true }));
});

export default router;
