import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import {
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
} from "@workspace/api-zod";
import { requireAuth, hashPassword, getAuthUser, schoolOf } from "./auth.js";
import { genUniqueLoginId } from "./auth-login.js";

const router: IRouter = Router();

const SELECT = "telegram_id::float8 AS telegram_id, full_name, phone_number, class_name, login, password, registration_date::text AS registration_date";
// Ro'yxatda parol JO'NATILMAYDI (xavfsizlik) — '' bilan almashtiriladi
const LIST_SELECT = "telegram_id::float8 AS telegram_id, full_name, phone_number, class_name, login, '' AS password, registration_date::text AS registration_date";

// GET /api/students — faqat o'z maktabi (admin → barcha)
router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const mid = schoolOf(getAuthUser(req.headers.authorization));
  const qp = ListStudentsQueryParams.safeParse(req.query);
  try {
    const where: string[] = [];
    const vals: unknown[] = [];
    if (mid !== null) { where.push(`maktab_id = $${vals.length + 1}`); vals.push(mid); }
    if (qp.success && qp.data.class_name) { where.push(`class_name = $${vals.length + 1}`); vals.push(qp.data.class_name); }
    const wsql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await query(`SELECT ${LIST_SELECT} FROM users ${wsql} ORDER BY registration_date DESC`, vals);
    res.json(ListStudentsResponse.parse(rows));
  } catch {
    res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
  }
});

// POST /api/students/bulk
router.post("/students/bulk", requireAuth, async (req, res): Promise<void> => {
  const mid = schoolOf(getAuthUser(req.headers.authorization)) ?? 3; // yaratuvchining maktabi
  const { students } = req.body as { students: { full_name: string; phone_number?: string; class_name: string }[] };
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "students massivi bo'sh" });
    return;
  }

  const created: { full_name: string; login: string; password: string; login_id: string; class_name: string }[] = [];
  const errors: { full_name: string; error: string }[] = [];

  for (const s of students) {
    const parts = (s.full_name ?? "").trim().toLowerCase().split(" ");
    const base = parts[0] ?? "user";
    const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const password = Math.floor(10000 + Math.random() * 90000).toString();
    const telegram_id = Date.now() + Math.floor(Math.random() * 10000);
    try {
      const login_id = await genUniqueLoginId(mid);
      const passwordHash = await hashPassword(password);
      await query(
        "INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, login_id, maktab_id, registration_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [telegram_id, s.full_name, s.phone_number || "", s.class_name, login, passwordHash, login_id, mid, new Date().toISOString()]
      );
      created.push({ full_name: s.full_name, login, password, login_id, class_name: s.class_name });
    } catch {
      errors.push({ full_name: s.full_name, error: "Qo'shishda xatolik" });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/students
router.post("/students", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const mid = schoolOf(getAuthUser(req.headers.authorization)) ?? 3; // yaratuvchining maktabi
  const { full_name, phone_number, class_name } = parsed.data;
  const parts = full_name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "user";
  const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  const telegram_id = Date.now();

  try {
    const login_id = await genUniqueLoginId(mid);
    const passwordHash = await hashPassword(password);
    const data = await queryOne(
      `INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, login_id, maktab_id, registration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${SELECT}, login_id`,
      [telegram_id, full_name, phone_number, class_name, login, passwordHash, login_id, mid, new Date().toISOString()]
    );

    if (!data) {
      res.status(500).json({ error: "O'quvchi qo'shishda xatolik" });
      return;
    }
    // Parolning ASL (ochiq) ko'rinishini bir marta qaytaramiz — bazada esa xeshlangan.
    // (Avval xeshni qaytarardi — admin yangi o'quvchi parolini ko'ra olmasdi.)
    res.status(201).json({ ...GetStudentResponse.parse(data), password, login_id });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: `"${login}" login allaqachon mavjud, qayta urinib ko'ring` });
    } else {
      res.status(500).json({ error: "O'quvchi qo'shishda xatolik: " + msg });
    }
  }
});

// GET /api/students/:id
router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const mid = schoolOf(getAuthUser(req.headers.authorization));
  const data = mid !== null
    ? await queryOne(`SELECT ${SELECT} FROM users WHERE telegram_id = $1 AND maktab_id = $2`, [params.data.id, mid])
    : await queryOne(`SELECT ${SELECT} FROM users WHERE telegram_id = $1`, [params.data.id]);
  if (!data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }
  res.json(GetStudentResponse.parse(data));
});

// PATCH /api/students/:id
router.patch("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateStudentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.data.full_name != null) { setClauses.push(`full_name = $${idx++}`); values.push(body.data.full_name); }
  if (body.data.phone_number != null) { setClauses.push(`phone_number = $${idx++}`); values.push(body.data.phone_number); }
  if (body.data.class_name != null) { setClauses.push(`class_name = $${idx++}`); values.push(body.data.class_name); }
  if (body.data.password != null && String(body.data.password).trim()) { setClauses.push(`password = $${idx++}`); values.push(await hashPassword(String(body.data.password).trim())); }
  const raw = body.data as Record<string, unknown>;
  if (raw["birthday"] !== undefined) { setClauses.push(`birthday = $${idx++}`); values.push(raw["birthday"] || null); }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }
  const mid = schoolOf(getAuthUser(req.headers.authorization));
  values.push(params.data.id);
  const idParam = idx++;
  let scope = "";
  if (mid !== null) { scope = ` AND maktab_id = $${idx++}`; values.push(mid); }

  try {
    const data = await queryOne(
      `UPDATE users SET ${setClauses.join(", ")} WHERE telegram_id = $${idParam}${scope} RETURNING ${SELECT}`,
      values
    );
    if (!data) {
      res.status(404).json({ error: "O'quvchi topilmadi" });
      return;
    }
    res.json(UpdateStudentResponse.parse(data));
  } catch (err) {
    res.status(500).json({ error: "O'quvchini yangilashda xatolik: " + (err as Error).message });
  }
});

// DELETE /api/students/:id
router.delete("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const mid = schoolOf(getAuthUser(req.headers.authorization));
  if (mid !== null) await query("DELETE FROM users WHERE telegram_id = $1 AND maktab_id = $2", [params.data.id, mid]);
  else await query("DELETE FROM users WHERE telegram_id = $1", [params.data.id]);
  res.sendStatus(204);
});

export default router;
