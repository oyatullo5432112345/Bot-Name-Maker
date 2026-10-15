import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import {
  ListStaffResponse,
  CreateStaffBody,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  DeleteStaffParams,
} from "@workspace/api-zod";
import { requireAuth, hashPassword } from "./auth.js";
import { genUniqueLoginId } from "./auth-login.js";
import { callerScope, DEFAULT_MAKTAB_ID } from "./maktablar.js";

const router: IRouter = Router();

const SELECT = "id, full_name, role, class_id, login, password, telegram_id::float8 AS telegram_id, subjects, can_teach";
// Ro'yxatda parol JO'NATILMAYDI (xavfsizlik) — '' bilan almashtiriladi
const LIST_SELECT = "id, full_name, role, class_id, login, '' AS password, telegram_id::float8 AS telegram_id, subjects, can_teach";

async function enrichStaff(staff: {
  id: string; full_name: string; role: string; class_id?: string | null;
  login: string; telegram_id?: number | null;
  subjects?: string[] | null; can_teach?: boolean | null;
}) {
  let class_name: string | null = null;
  if (staff.class_id) {
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [staff.class_id]);
    class_name = cls?.name ?? null;
  }
  return { ...staff, class_name, subjects: staff.subjects ?? [], can_teach: staff.can_teach ?? false };
}

// GET /api/staff/:id
router.get("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { maktabId, isSuper } = callerScope(req);
  const data = await queryOne<Parameters<typeof enrichStaff>[0]>(
    `SELECT ${SELECT} FROM staff WHERE id = $1 ${isSuper ? "" : "AND maktab_id = $2"}`,
    isSuper ? [id] : [id, maktabId]
  );
  if (!data) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }
  const enriched = await enrichStaff(data);
  res.json(enriched);
});

// GET /api/staff — faqat tizimga kirganlar (direktor faqat o'z maktabi xodimlarini ko'radi)
router.get("/staff", requireAuth, async (req, res): Promise<void> => {
  const { maktabId, isSuper } = callerScope(req);
  try {
    const rows = isSuper
      ? await query<Parameters<typeof enrichStaff>[0]>(`SELECT ${LIST_SELECT} FROM staff ORDER BY full_name`)
      : await query<Parameters<typeof enrichStaff>[0]>(`SELECT ${LIST_SELECT} FROM staff WHERE maktab_id = $1 ORDER BY full_name`, [maktabId]);
    const enriched = await Promise.all(rows.map(d => enrichStaff(d)));
    res.json(ListStaffResponse.parse(enriched));
  } catch {
    res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
  }
});

// POST /api/staff/bulk
router.post("/staff/bulk", requireAuth, async (req, res): Promise<void> => {
  const { staff: items } = req.body as {
    staff: { full_name: string; role: string; subjects?: string[]; can_teach?: boolean }[];
  };
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "staff massivi bo'sh" });
    return;
  }

  const insertMaktab = callerScope(req).maktabId ?? DEFAULT_MAKTAB_ID;
  const created: { full_name: string; login: string; password: string; login_id: string; role: string }[] = [];
  const errors: { full_name: string; error: string }[] = [];

  for (const s of items) {
    const parts = (s.full_name ?? "").trim().toLowerCase().split(" ");
    const base = parts[0] ?? "staff";
    const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const password = Math.floor(10000 + Math.random() * 90000).toString();
    const can_teach = s.can_teach ?? (s.role === "teacher" || s.role === "sinf_rahbari");
    try {
      const login_id = await genUniqueLoginId();
      const passwordHash = await hashPassword(password);
      await query(
        "INSERT INTO staff (full_name, role, login, password, login_id, telegram_id, subjects, can_teach, maktab_id) VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8)",
        [s.full_name, s.role, login, passwordHash, login_id, JSON.stringify(s.subjects ?? []), can_teach, insertMaktab]
      );
      created.push({ full_name: s.full_name, login, password, login_id, role: s.role });
    } catch (err) {
      errors.push({ full_name: s.full_name, error: (err as Error).message });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/staff
router.post("/staff", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const insertMaktab = callerScope(req).maktabId ?? DEFAULT_MAKTAB_ID;
  const parts = parsed.data.full_name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "staff";
  const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const login_id = await genUniqueLoginId();
    const passwordHash = await hashPassword(password);
    const data = await queryOne<Parameters<typeof enrichStaff>[0]>(
      `INSERT INTO staff (full_name, role, class_id, login, password, login_id, telegram_id, subjects, can_teach, maktab_id)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,'{}',false,$7) RETURNING ${SELECT}`,
      [parsed.data.full_name, parsed.data.role, parsed.data.class_id ?? null, login, passwordHash, login_id, insertMaktab]
    );

    if (!data) {
      res.status(500).json({ error: "Xodim qo'shishda xatolik" });
      return;
    }
    const enriched = await enrichStaff(data);
    // parolning ASL (ochiq) ko'rinishini bir marta qaytaramiz — bazada esa xeshlangan
    res.status(201).json({ ...enriched, password, login_id });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: `"${login}" login allaqachon mavjud, qayta urinib ko'ring` });
    } else {
      res.status(500).json({ error: "Xodim qo'shishda xatolik: " + msg });
    }
  }
});

// PATCH /api/staff/:id
router.patch("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateStaffBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const raw = body.data as Record<string, unknown>;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (raw["full_name"] != null) { setClauses.push(`full_name = $${idx++}`); values.push(raw["full_name"]); }
  if (raw["role"] != null) { setClauses.push(`role = $${idx++}`); values.push(raw["role"]); }
  if (raw["class_id"] !== undefined) { setClauses.push(`class_id = $${idx++}`); values.push(raw["class_id"]); }
  if (raw["login"] != null) { setClauses.push(`login = $${idx++}`); values.push(raw["login"]); }
  if (raw["password"] != null && String(raw["password"]).trim()) {
    setClauses.push(`password = $${idx++}`);
    values.push(await hashPassword(String(raw["password"]).trim())); // xeshlab saqlaymiz
  }
  if (raw["can_teach"] !== undefined) { setClauses.push(`can_teach = $${idx++}`); values.push(raw["can_teach"]); }
  if (raw["subjects"] !== undefined) { setClauses.push(`subjects = $${idx++}`); values.push(JSON.stringify(raw["subjects"])); }
  if (raw["birthday"] !== undefined) { setClauses.push(`birthday = $${idx++}`); values.push(raw["birthday"] || null); }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }
  values.push(params.data.id);

  try {
    const data = await queryOne<Parameters<typeof enrichStaff>[0]>(
      `UPDATE staff SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING ${SELECT}`,
      values
    );

    if (!data) {
      res.status(404).json({ error: "Xodim topilmadi" });
      return;
    }

    const enriched = await enrichStaff(data);
    res.json(UpdateStaffResponse.parse({ ...enriched, password: "" })); // xeshni qaytarmaymiz
  } catch (err) {
    res.status(500).json({ error: "Xodimni yangilashda xatolik: " + (err as Error).message });
  }
});

// DELETE /api/staff/:id
router.delete("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await Promise.allSettled([
      query("DELETE FROM teacher_subjects WHERE teacher_id = $1", [params.data.id]),
      query("UPDATE timetable SET teacher_id = NULL WHERE teacher_id = $1", [params.data.id]),
      query("UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1", [params.data.id]),
    ]);
    await query("DELETE FROM staff WHERE id = $1", [params.data.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
