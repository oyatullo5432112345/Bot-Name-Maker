import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import {
  LoginBody,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
  RegisterBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const ADMIN_ID = process.env["ADMIN_ID"] ?? "";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? ADMIN_ID;

// Session: in-memory (xotira) - simple JWT alternative
// Token: base64(JSON) — production'da JWT ishlatish kerak
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

  // Admin tekshiruvi (ADMIN_ID bo'yicha)
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

  // Staff tekshiruvi
  const { data: staffList, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("login", trimmedLogin)
    .eq("password", trimmedPassword);

  if (!staffError && staffList && staffList.length > 0) {
    const staff = staffList[0] as {
      id: string;
      full_name: string;
      role: string;
      class_id: string | null;
      login: string;
      password: string;
      telegram_id: number | null;
    };

    // class nomini olish
    let class_name: string | null = null;
    if (staff.class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", staff.class_id)
        .single();
      class_name = cls?.name ?? null;
    }

    const payload = {
      id: staff.id,
      role: staff.role,
      full_name: staff.full_name,
      login: staff.login,
      class_name,
      class_id: staff.class_id,
      telegram_id: staff.telegram_id,
    };
    const token = createToken(payload);
    res.setHeader("X-Auth-Token", token);
    res.json(LoginResponse.parse({ ...payload, token }));
    return;
  }

  // Student tekshiruvi
  const { data: studentList, error: studentError } = await supabase
    .from("users")
    .select("*")
    .eq("login", trimmedLogin)
    .eq("password", trimmedPassword);

  if (!studentError && studentList && studentList.length > 0) {
    const student = studentList[0] as {
      telegram_id: number;
      full_name: string;
      class_name: string;
      login: string;
      password: string;
    };

    // Sinf ID sini class_name orqali topish
    let student_class_id: string | null = null;
    const { data: clsData } = await supabase
      .from("classes")
      .select("id")
      .eq("name", student.class_name)
      .single();
    student_class_id = clsData?.id ?? null;

    const payload = {
      id: String(student.telegram_id),
      role: "student",
      full_name: student.full_name,
      login: student.login,
      class_name: student.class_name,
      class_id: student_class_id,
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

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { full_name, phone_number, class_name, login, password } = parsed.data;

  // Login band emasligini tekshirish
  const [{ data: existStaff }, { data: existStudent }] = await Promise.all([
    supabase.from("staff").select("login").eq("login", login).maybeSingle(),
    supabase.from("users").select("login").eq("login", login).maybeSingle(),
  ]);

  if (existStaff || existStudent) {
    res.status(400).json({ error: "Bu login band. Boshqa login tanlang." });
    return;
  }

  const telegram_id = Date.now();
  const registration_date = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .insert([{ telegram_id, full_name, phone_number, class_name, login, password, registration_date }])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Xatolik yuz berdi" });
    return;
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
