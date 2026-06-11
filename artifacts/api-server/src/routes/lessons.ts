import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

const CreateLessonBody = z.object({
  title: z.string().min(2),
  subject: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
  class_name: z.string().min(1),
});

const UpdateLessonBody = z.object({
  title: z.string().min(2).optional(),
  subject: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  class_name: z.string().min(1).optional(),
});

// GET /api/lessons
router.get("/lessons", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const class_name = user["class_name"] as string | null;
  const login = user["login"] as string;

  try {
    let rows;
    if (role === "student" && class_name) {
      rows = await query("SELECT * FROM lessons WHERE class_name = $1 ORDER BY created_at DESC", [class_name]);
    } else if (role === "teacher" || role === "sinf_rahbari") {
      rows = await query("SELECT * FROM lessons WHERE teacher_login = $1 ORDER BY created_at DESC", [login]);
    } else {
      rows = await query("SELECT * FROM lessons ORDER BY created_at DESC");
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Darsliklarni yuklashda xatolik", details: (err as Error).message });
  }
});

// POST /api/lessons
router.post("/lessons", async (req, res): Promise<void> => {
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

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, subject, description, content, class_name } = parsed.data;

  try {
    const data = await queryOne(
      `INSERT INTO lessons (title, subject, description, content, class_name, teacher_login, teacher_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, subject, description ?? "", content ?? "", class_name,
       user["login"] as string, user["full_name"] as string, new Date().toISOString()]
    );
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Darslik qo'shishda xatolik", details: (err as Error).message });
  }
});

// PUT /api/lessons/:id
router.put("/lessons/:id", async (req, res): Promise<void> => {
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

  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { id } = req.params as { id: string };
  const existing = await queryOne<{ teacher_login: string }>(
    "SELECT teacher_login FROM lessons WHERE id = $1", [id]
  );

  if (!existing) {
    res.status(404).json({ error: "Darslik topilmadi" });
    return;
  }

  if (role !== "admin" && existing.teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu darslikni o'zgartirish uchun ruxsat yo'q" });
    return;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const raw = parsed.data as Record<string, unknown>;
  for (const [key, val] of Object.entries(raw)) {
    if (val !== undefined) { setClauses.push(`${key} = $${idx++}`); values.push(val); }
  }
  setClauses.push(`updated_at = $${idx++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const data = await queryOne(
    `UPDATE lessons SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (!data) {
    res.status(500).json({ error: "Darslikni yangilashda xatolik" });
    return;
  }
  res.json(data);
});

// DELETE /api/lessons/:id
router.delete("/lessons/:id", async (req, res): Promise<void> => {
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
    "SELECT teacher_login FROM lessons WHERE id = $1", [id]
  );

  if (!existing) {
    res.status(404).json({ error: "Darslik topilmadi" });
    return;
  }

  if (role !== "admin" && existing.teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu darslikni o'chirish uchun ruxsat yo'q" });
    return;
  }

  await query("DELETE FROM lessons WHERE id = $1", [id]);
  res.json({ ok: true });
});

export default router;
