import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
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
    const { data: classesRaw, error } = await supabase
      .from("classes")
      .select("id, name, teacher_id, created_at");

    if (error) throw error;

    const sorted = (classesRaw ?? []).sort((a, b) => {
      const numA = parseInt((a as { name: string }).name) || 0;
      const numB = parseInt((b as { name: string }).name) || 0;
      if (numA !== numB) return numA - numB;
      return (a as { name: string }).name.localeCompare((b as { name: string }).name);
    });

    const classesWithDetails = await Promise.all(
      sorted.map(async (cls) => {
        const c = cls as { id: string; name: string; teacher_id: string | null; created_at: string };
        let teacher_name: string | null = null;
        if (c.teacher_id) {
          const { data: staff } = await supabase
            .from("staff")
            .select("full_name")
            .eq("id", c.teacher_id)
            .single();
          teacher_name = (staff as { full_name: string } | null)?.full_name ?? null;
        }
        const { count } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("class_name", c.name);

        return {
          id: c.id,
          name: c.name,
          teacher_id: c.teacher_id,
          teacher_name,
          student_count: count ?? 0,
          created_at: c.created_at,
        };
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

    const { data, error } = await supabase
      .from("classes")
      .insert({ name: trimmed, created_at: new Date().toISOString() })
      .select("id, name")
      .single();

    if (error) {
      errors.push({ name: trimmed, error: error.message });
    } else if (data) {
      created.push({ id: (data as { id: string }).id, name: (data as { name: string }).name });
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

  const { data, error } = await supabase
    .from("classes")
    .insert({ name: parsed.data.name, created_at: new Date().toISOString() })
    .select("id, name, teacher_id, created_at")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const d = data as { id: string; name: string; teacher_id: string | null; created_at: string };
  res.status(201).json({
    id: d.id,
    name: d.name,
    teacher_id: d.teacher_id ?? null,
    teacher_name: null,
    student_count: 0,
    created_at: d.created_at,
  });
});

// DELETE /api/classes/:id
router.delete("/classes/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", params.data.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
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

  const { data, error } = await supabase
    .from("classes")
    .update({ teacher_id: body.data.staff_id })
    .eq("id", params.data.id)
    .select("id, name, teacher_id, created_at")
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Sinf topilmadi" });
    return;
  }

  const d = data as { id: string; name: string; teacher_id: string | null; created_at: string };

  const [{ data: staffRow }, { count }] = await Promise.all([
    supabase.from("staff").select("full_name").eq("id", body.data.staff_id).single(),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("class_name", d.name),
  ]);

  res.json(AssignTeacherResponse.parse({
    id: d.id,
    name: d.name,
    teacher_id: d.teacher_id,
    teacher_name: (staffRow as { full_name: string } | null)?.full_name ?? null,
    student_count: count ?? 0,
    created_at: d.created_at,
  }));
});

export default router;
