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
import { getChatIdByPhone, normalizePhone } from "../bot/settings.js";

// Magic token store (in-memory, 10 daqiqa amal qiladi)
interface MagicToken {
  payload: Record<string, unknown>;
  expiresAt: number;
}
const magicTokens = new Map<string, MagicToken>();

function generateMagicToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createMagicToken(payload: Record<string, unknown>): string {
  const token = generateMagicToken();
  magicTokens.set(token, { payload, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

// Eskirgan tokenlarni tozalash
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of magicTokens) {
    if (val.expiresAt < now) magicTokens.delete(key);
  }
}, 60 * 1000);

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

// O'quvchi login generatsiyasi: ismi → kichik harf, maxsus belgilar → nuqta
function generateStudentLogin(firstName: string): string {
  return firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "student";
}

// O'quvchi paroli: 3maktab + sinf nomi (kichik harf, bo'shliqlarsiz)
function generateStudentPassword(className: string): string {
  return "3maktab" + className.toLowerCase().replace(/\s+/g, "");
}

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { last_name, first_name, phone_number, class_name } = req.body as {
    last_name?: string;
    first_name?: string;
    phone_number?: string;
    class_name?: string;
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

  // Login va parol avtomatik yaratish
  let login = generateStudentLogin(first_name.trim());
  const password = generateStudentPassword(class_name.trim());

  // Login unikal bo'lishini ta'minlash
  const [{ data: ex1 }, { data: ex2 }] = await Promise.all([
    supabase.from("staff").select("login").eq("login", login).maybeSingle(),
    supabase.from("users").select("login").eq("login", login).maybeSingle(),
  ]);
  if (ex1 || ex2) {
    // Raqam qo'sh
    let suffix = 1;
    let candidate = `${login}${suffix}`;
    while (true) {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from("staff").select("login").eq("login", candidate).maybeSingle(),
        supabase.from("users").select("login").eq("login", candidate).maybeSingle(),
      ]);
      if (!a && !b) { login = candidate; break; }
      suffix++;
      candidate = `${login}${suffix}`;
    }
  }

  // Bir telefon raqami bilan maksimal 2 ta ro'yxatdan o'tish mumkin
  const normalizedPhone = normalizePhone(phone_number);
  const { data: phoneUsers } = await supabase
    .from("users")
    .select("login")
    .eq("phone_number", normalizedPhone);

  if ((phoneUsers?.length ?? 0) >= 2) {
    res.status(400).json({ error: "Bu telefon raqami bilan maksimal 2 ta foydalanuvchi ro'yxatdan o'ta oladi" });
    return;
  }

  // Agar telefon Telegram'da allaqachon bog'langan bo'lsa — haqiqiy chat_id ishlatamiz
  const linkedChatId = getChatIdByPhone(normalizedPhone);
  const telegram_id = linkedChatId ?? Date.now();
  const registration_date = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .insert([{ telegram_id, full_name, phone_number: normalizedPhone, class_name, login, password, registration_date }])
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

// POST /api/auth/register-staff
router.post("/auth/register-staff", async (req, res): Promise<void> => {
  const { last_name, first_name, full_name: rawFullName, role, class_id, phone_number, subjects, login: customLogin, password: customPassword } = req.body as {
    last_name?: string;
    first_name?: string;
    full_name?: string;
    role?: string;
    class_id?: string | null;
    phone_number?: string;
    subjects?: string[];
    login?: string;
    password?: string;
  };

  // Ism: ikkita qatordan yoki to'liq ismdan olish
  const full_name = (first_name && last_name)
    ? `${last_name.trim()} ${first_name.trim()}`
    : (rawFullName ?? "");

  const allowedRoles = ["director", "zam_direktor", "zavuch", "sinf_rahbari", "teacher", "kutubxonachi"];
  if (!role || !allowedRoles.includes(role)) {
    res.status(400).json({ error: "Noto'g'ri rol tanlandi" });
    return;
  }
  if (!full_name || full_name.trim().length < 2) {
    res.status(400).json({ error: "Ism familiyani to'liq kiriting" });
    return;
  }

  // Bir martalik rollar: direktor, zavuch, zam_direktor, kutubxonachi
  const SINGLE_SLOT_ROLES = ["director", "zam_direktor", "zavuch", "kutubxonachi"];
  if (SINGLE_SLOT_ROLES.includes(role)) {
    const { data: existingRole } = await supabase
      .from("staff")
      .select("id")
      .eq("role", role)
      .maybeSingle();
    if (existingRole) {
      const roleNames: Record<string, string> = {
        director: "Direktor",
        zam_direktor: "Direktor o'rinbosari",
        zavuch: "Zavuch",
        kutubxonachi: "Kutubxonachi",
      };
      res.status(400).json({ error: `${roleNames[role] ?? role} allaqachon ro'yxatdan o'tgan` });
      return;
    }
  }

  // Sinf rahbari: har bir sinf uchun faqat bitta (sinf_rahbari yoki teacher rolidan)
  if (role === "sinf_rahbari") {
    if (!class_id) {
      res.status(400).json({ error: "Sinf rahbari uchun sinf tanlanishi shart" });
      return;
    }
    const { data: existingRahbar } = await supabase
      .from("staff")
      .select("id")
      .in("role", ["sinf_rahbari", "teacher"])
      .eq("class_id", class_id)
      .maybeSingle();
    if (existingRahbar) {
      res.status(400).json({ error: "Bu sinf uchun sinf rahbari allaqachon tayinlangan" });
      return;
    }
  }

  // O'qituvchi sinf_id bilan kelsa, sinf rahbari sifatida tayinlanadi — tekshirish
  if (role === "teacher" && class_id) {
    const { data: existingRahbar } = await supabase
      .from("staff")
      .select("id")
      .in("role", ["sinf_rahbari", "teacher"])
      .eq("class_id", class_id)
      .maybeSingle();
    if (existingRahbar) {
      res.status(400).json({ error: "Bu sinf uchun sinf rahbari allaqachon tayinlangan" });
      return;
    }
  }

  // Login va parol: xodim o'zi tanlagan bo'lishi shart
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

  // Login band emasligini tekshirish
  const [{ data: existLoginStaff }, { data: existLoginStudent }] = await Promise.all([
    supabase.from("staff").select("id").eq("login", login).maybeSingle(),
    supabase.from("users").select("login").eq("login", login).maybeSingle(),
  ]);
  if (existLoginStaff || existLoginStudent) {
    res.status(400).json({ error: "Bu login band. Boshqa login tanlang." });
    return;
  }

  const insertData: Record<string, unknown> = {
    full_name: full_name.trim(),
    role,
    class_id: class_id ?? null,
    login,
    password,
    telegram_id: null,
  };

  const { data, error } = await supabase
    .from("staff")
    .insert([insertData])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Xatolik yuz berdi" });
    return;
  }

  // Subjects ni saqlashga urinib ko'rish (column mavjud bo'lsa)
  if ((role === "teacher" || role === "sinf_rahbari") && Array.isArray(subjects) && subjects.length > 0) {
    const staffId = (data as { id: string }).id;
    await supabase.from("staff").update({ subjects }).eq("id", staffId).then(() => {/* graceful */});
  }

  const staffData = data as {
    id: string;
    full_name: string;
    role: string;
    class_id: string | null;
    login: string;
    password: string;
    telegram_id: number | null;
  };

  let class_name: string | null = null;
  if (staffData.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", staffData.class_id)
      .single();
    class_name = cls?.name ?? null;
  }

  const payload = {
    id: staffData.id,
    role: staffData.role,
    full_name: staffData.full_name,
    login: staffData.login,
    class_name,
    class_id: staffData.class_id,
    telegram_id: staffData.telegram_id,
  };
  const token = createToken(payload);
  res.status(201).json({ ...payload, token, password: staffData.password });
});

// GET /api/auth/bot-login?token=xxx  — bot magic link orqali kirish
router.get("/auth/bot-login", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "Token kerak" });
    return;
  }

  const entry = magicTokens.get(token);
  if (!entry) {
    res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
    return;
  }
  if (entry.expiresAt < Date.now()) {
    magicTokens.delete(token);
    res.status(401).json({ error: "Token muddati o'tgan" });
    return;
  }

  magicTokens.delete(token);
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
