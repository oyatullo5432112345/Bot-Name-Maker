import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";

const router: IRouter = Router();

// GET /api/teacher-subjects?class_id=xxx  YOKI  ?teacher_id=xxx
router.get("/teacher-subjects", async (req, res): Promise<void> => {
  const class_id = req.query["class_id"] as string | undefined;
  const teacher_id = req.query["teacher_id"] as string | undefined;

  let query = supabase
    .from("teacher_subjects")
    .select("id, teacher_id, class_id, subject, created_at")
    .order("subject");

  if (class_id) {
    query = query.eq("class_id", class_id);
  }
  if (teacher_id) {
    query = query.eq("teacher_id", teacher_id);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Enrich with teacher and class names
  const enriched = await Promise.all(
    (data ?? []).map(async (row: { id: string; teacher_id: string; class_id: string; subject: string; created_at: string }) => {
      const [{ data: staff }, { data: cls }] = await Promise.all([
        supabase.from("staff").select("full_name, role").eq("id", row.teacher_id).single(),
        supabase.from("classes").select("name").eq("id", row.class_id).single(),
      ]);
      return {
        ...row,
        teacher_name: staff?.full_name ?? null,
        teacher_role: staff?.role ?? null,
        class_name: cls?.name ?? null,
      };
    })
  );

  res.json(enriched);
});

// POST /api/teacher-subjects
router.post("/teacher-subjects", async (req, res): Promise<void> => {
  const { teacher_id, class_id, subject } = req.body as {
    teacher_id?: string;
    class_id?: string;
    subject?: string;
  };

  if (!teacher_id || !class_id || !subject?.trim()) {
    res.status(400).json({ error: "teacher_id, class_id va subject kerak" });
    return;
  }

  const { data, error } = await supabase
    .from("teacher_subjects")
    .insert([{ teacher_id, class_id, subject: subject.trim() }])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Bu o'qituvchi bu sinfga bu fandan allaqachon biriktirilgan" });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// DELETE /api/teacher-subjects/:id
router.delete("/teacher-subjects/:id", async (req, res): Promise<void> => {
  const { id } = req.params;

  const { error } = await supabase
    .from("teacher_subjects")
    .delete()
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.sendStatus(204);
});

export default router;
