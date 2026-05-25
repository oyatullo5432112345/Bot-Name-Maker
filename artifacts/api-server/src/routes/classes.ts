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

const router: IRouter = Router();

// GET /api/classes
router.get("/classes", async (_req, res): Promise<void> => {
  const { data: classesRaw, error } = await supabase
    .from("classes")
    .select("*");

  // Sinf raqami bo'yicha to'g'ri tartib: 1-A, 2-A, ..., 10-A, 11-A
  const classes = (classesRaw ?? []).sort((a: { name: string }, b: { name: string }) => {
    const numA = parseInt(a.name) || 0;
    const numB = parseInt(b.name) || 0;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const classesWithDetails = await Promise.all(
    (classes ?? []).map(async (cls: { id: string; name: string; teacher_id: string | null; created_at: string }) => {
      let teacher_name: string | null = null;
      if (cls.teacher_id) {
        const { data: staff } = await supabase
          .from("staff")
          .select("full_name")
          .eq("id", cls.teacher_id)
          .single();
        teacher_name = staff?.full_name ?? null;
      }

      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("class_name", cls.name);

      return {
        id: cls.id,
        name: cls.name,
        teacher_id: cls.teacher_id,
        teacher_name,
        student_count: count ?? 0,
        created_at: cls.created_at,
      };
    })
  );

  res.json(ListClassesResponse.parse(classesWithDetails));
});

// POST /api/classes
router.post("/classes", async (req, res): Promise<void> => {
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data, error } = await supabase
    .from("classes")
    .insert([{ name: parsed.data.name, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({
    id: data.id,
    name: data.name,
    teacher_id: data.teacher_id ?? null,
    teacher_name: null,
    student_count: 0,
    created_at: data.created_at,
  });
});

// DELETE /api/classes/:id
router.delete("/classes/:id", async (req, res): Promise<void> => {
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
router.patch("/classes/:id/assign-teacher", async (req, res): Promise<void> => {
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
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Sinf topilmadi" });
    return;
  }

  // Staff nomini olish
  let teacher_name: string | null = null;
  const { data: staff } = await supabase
    .from("staff")
    .select("full_name")
    .eq("id", body.data.staff_id)
    .single();
  teacher_name = staff?.full_name ?? null;

  // student count
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("class_name", data.name);

  res.json(
    AssignTeacherResponse.parse({
      id: data.id,
      name: data.name,
      teacher_id: data.teacher_id,
      teacher_name,
      student_count: count ?? 0,
      created_at: data.created_at,
    })
  );
});

export default router;
