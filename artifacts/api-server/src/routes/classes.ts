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
import { requireAuth, getAuthUser, schoolOf } from "./auth.js";

const router: IRouter = Router();

// GET /api/classes — o'z maktabi (admin → barcha; token yo'q → 3-maktab)
router.get("/classes", async (req, res): Promise<void> => {
  try {
    const user = getAuthUser(req.headers.authorization);
    const mid = user ? schoolOf(user) : 3; // token bo'lmasa eski public = 3-maktab
    const wsql = mid !== null ? "WHERE maktab_id = $1" : "";
    const vals = mid !== null ? [mid] : [];
    const classesRaw = await query<{ id: string; name: string; teacher_id: string | null; created_at: string; maktab_id: number }>(
      `SELECT id, name, teacher_id, created_at, maktab_id FROM classes ${wsql}`, vals
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
        // o'quvchi sonini aynan shu sinf+maktab bo'yicha sanaymiz
        const student_count = await queryCount("SELECT COUNT(*) FROM users WHERE class_name = $1 AND maktab_id = $2", [c.name, c.maktab_id]);
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
  const mid = schoolOf(getAuthUser(req.headers.authorization)) ?? 3;
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
        "INSERT INTO classes (name, maktab_id, created_at) VALUES ($1, $2, $3) RETURNING id, name",
        [trimmed, mid, new Date().toISOString()]
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

  try {
    const mid = schoolOf(getAuthUser(req.headers.authorization)) ?? 3;
    const data = await queryOne<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
      "INSERT INTO classes (name, maktab_id, created_at) VALUES ($1, $2, $3) RETURNING id, name, teacher_id, created_at",
      [parsed.data.name, mid, new Date().toISOString()]
    );

    if (!data) {
      res.status(500).json({ error: "Sinf qo'shishda xatolik" });
      return;
    }
    res.status(201).json({ id: data.id, name: data.name, teacher_id: data.teacher_id ?? null, teacher_name: null, student_count: 0, created_at: data.created_at });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: `"${parsed.data.name}" nomli sinf allaqachon mavjud` });
    } else {
      res.status(500).json({ error: "Sinf qo'shishda xatolik: " + msg });
    }
  }
});

// DELETE /api/classes/:id
router.delete("/classes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const mid = schoolOf(getAuthUser(req.headers.authorization));
  if (mid !== null) await query("DELETE FROM classes WHERE id = $1 AND maktab_id = $2", [params.data.id, mid]);
  else await query("DELETE FROM classes WHERE id = $1", [params.data.id]);
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

  const mid = schoolOf(getAuthUser(req.headers.authorization));
  const data = mid !== null
    ? await queryOne<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
        "UPDATE classes SET teacher_id = $1 WHERE id = $2 AND maktab_id = $3 RETURNING id, name, teacher_id, created_at",
        [body.data.staff_id, params.data.id, mid])
    : await queryOne<{ id: string; name: string; teacher_id: string | null; created_at: string }>(
        "UPDATE classes SET teacher_id = $1 WHERE id = $2 RETURNING id, name, teacher_id, created_at",
        [body.data.staff_id, params.data.id]);

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
