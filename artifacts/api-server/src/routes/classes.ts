import { Router, type IRouter } from "express";
import { query, queryOne, queryCount } from "../lib/db.js";
import {
  ListClassesResponse,
  CreateClassBody,
  DeleteClassParams,
  AssignTeacherParams,
  AssignTeacherBody,
  AssignTeacherResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

// GET /api/classes
router.get("/classes", requireAuth, async (_req, res): Promise<void> => {
  try {
    const classesRaw = await query<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
      "SELECT id, name, teacher_id, created_at FROM classes"
    );

    const sorted = classesRaw.sort((a, b) => {
      const numA = parseInt(a.name) || 0;
      const numB = parseInt(b.name) || 0;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });

    const classesWithDetails = await Promise.all(
      sorted.map(async (c) => {
        let teacher_name: string | null = null;
        if (c.teacher_id) {
          const staff = await queryOne<{ full_name: string }>("SELECT full_name FROM staff WHERE id = $1", [c.teacher_id]);
          teacher_name = staff?.full_name ?? null;
        }
        const student_count = await queryCount("SELECT COUNT(*) FROM users WHERE class_name = $1", [c.name]);
        return { id: c.id, name: c.name, teacher_id: c.teacher_id, teacher_name, student_count, created_at: c.created_at };
      })
    );

    res.json(ListClassesResponse.parse(classesWithDetails));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/classes/bulk
router.post("/classes/bulk", requireAuth, async (req, res): Promise<void> => {
  const { names } = req.body as { names: string[] };
  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: "names massivi bo'sh" });
    return;
  }

  const created: { id: string; name: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    try {
      const data = await queryOne<{ id: string; name: string }>(
        "INSERT INTO classes (name, created_at) VALUES ($1, $2) RETURNING id, name",
        [trimmed, new Date().toISOString()]
      );
      if (data) created.push(data);
    } catch (err) {
      errors.push({ name: trimmed, error: (err as Error).message });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/classes
router.post("/classes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = await queryOne<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
    "INSERT INTO classes (name, created_at) VALUES ($1, $2) RETURNING id, name, teacher_id, created_at",
    [parsed.data.name, new Date().toISOString()]
  );

  if (!data) {
    res.status(500).json({ error: "Sinf qo'shishda xatolik" });
    return;
  }
  res.status(201).json({ id: data.id, name: data.name, teacher_id: data.teacher_id ?? null, teacher_name: null, student_count: 0, created_at: data.created_at });
});

// DELETE /api/classes/:id
router.delete("/classes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await query("DELETE FROM classes WHERE id = $1", [params.data.id]);
  res.sendStatus(204);
});

// PATCH /api/classes/:id/assign-teacher
router.patch("/classes/:id/assign-teacher", requireAuth, async (req, res): Promise<void> => {
  const params = AssignTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AssignTeacherBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const data = await queryOne<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
    "UPDATE classes SET teacher_id = $1 WHERE id = $2 RETURNING id, name, teacher_id, created_at",
    [body.data.staff_id, params.data.id]
  );

  if (!data) {
    res.status(404).json({ error: "Sinf topilmadi" });
    return;
  }

  const [staffRow, student_count] = await Promise.all([
    queryOne<{ full_name: string }>("SELECT full_name FROM staff WHERE id = $1", [body.data.staff_id]),
    queryCount("SELECT COUNT(*) FROM users WHERE class_name = $1", [data.name]),
  ]);

  res.json(AssignTeacherResponse.parse({
    id: data.id,
    name: data.name,
    teacher_id: data.teacher_id,
    teacher_name: staffRow?.full_name ?? null,
    student_count,
    created_at: data.created_at,
  }));
});

export default router;
