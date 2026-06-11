import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const CreateGradeBody = z.object({
  student_login: z.string().min(1),
  student_name: z.string().min(1),
  class_name: z.string().min(1),
  subject: z.string().min(1),
  grade: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const UpdateGradeBody = z.object({
  grade: z.number().int().min(1).max(5).optional(),
  subject: z.string().min(1).optional(),
  comment: z.string().optional(),
});

// GET /api/grades
router.get("/grades", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const login = user["login"] as string;

  try {
    let rows;
    if (role === "student") {
      rows = await query("SELECT * FROM grades WHERE student_login = $1 ORDER BY created_at DESC", [login]);
    } else if (role === "teacher" || role === "sinf_rahbari") {
      rows = await query("SELECT * FROM grades WHERE teacher_login = $1 ORDER BY created_at DESC", [login]);
    } else if ((role === "director" || role === "zavuch" || role === "zam_direktor") && req.query["class_name"]) {
      rows = await query("SELECT * FROM grades WHERE class_name = $1 ORDER BY created_at DESC", [req.query["class_name"]]);
    } else {
      rows = await query("SELECT * FROM grades ORDER BY created_at DESC");
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Baholarni yuklashda xatolik", details: (err as Error).message });
  }
});

// GET /api/grades/class/:class_name
router.get("/grades/class/:class_name", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const allowedRoles = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];
  if (!allowedRoles.includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { class_name } = req.params as { class_name: string };

  try {
    const rows = await query("SELECT * FROM grades WHERE class_name = $1 ORDER BY created_at DESC", [class_name]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Baholarni yuklashda xatolik", details: (err as Error).message });
  }
});

// POST /api/grades
router.post("/grades", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const allowedRoles = ["admin", "director", "zavuch", "zam_direktor", "teacher", "sinf_rahbari"];
  if (!allowedRoles.includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const parsed = CreateGradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { student_login, student_name, class_name, subject, grade, comment } = parsed.data;

  try {
    const data = await queryOne(
      `INSERT INTO grades (student_login, student_name, class_name, subject, grade, comment, teacher_login, teacher_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [student_login, student_name, class_name, subject, grade, comment ?? "",
       user["login"] as string, user["full_name"] as string, new Date().toISOString()]
    );
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Baho qo'shishda xatolik", details: (err as Error).message });
  }
});

// PUT /api/grades/:id
router.put("/grades/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const allowedRoles = ["admin", "director", "teacher", "sinf_rahbari"];
  if (!allowedRoles.includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const parsed = UpdateGradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { id } = req.params as { id: string };
  const existing = await queryOne<{ teacher_login: string }>(
    "SELECT teacher_login FROM grades WHERE id = $1", [id]
  );

  if (!existing) {
    res.status(404).json({ error: "Baho topilmadi" });
    return;
  }

  if (role !== "admin" && existing.teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu bahoni o'zgartirish uchun ruxsat yo'q" });
    return;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.grade != null) { setClauses.push(`grade = $${idx++}`); values.push(parsed.data.grade); }
  if (parsed.data.subject != null) { setClauses.push(`subject = $${idx++}`); values.push(parsed.data.subject); }
  if (parsed.data.comment != null) { setClauses.push(`comment = $${idx++}`); values.push(parsed.data.comment); }
  setClauses.push(`updated_at = $${idx++}`);
  values.push(new Date().toISOString());

  values.push(id);
  const data = await queryOne(
    `UPDATE grades SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (!data) {
    res.status(500).json({ error: "Bahoni yangilashda xatolik" });
    return;
  }
  res.json(data);
});

// DELETE /api/grades/:id
router.delete("/grades/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const allowedRoles = ["admin", "director", "teacher", "sinf_rahbari"];
  if (!allowedRoles.includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params as { id: string };
  const existing = await queryOne<{ teacher_login: string }>(
    "SELECT teacher_login FROM grades WHERE id = $1", [id]
  );

  if (!existing) {
    res.status(404).json({ error: "Baho topilmadi" });
    return;
  }

  if (role !== "admin" && existing.teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu bahoni o'chirish uchun ruxsat yo'q" });
    return;
  }

  await query("DELETE FROM grades WHERE id = $1", [id]);
  res.json({ ok: true });
});

export default router;
