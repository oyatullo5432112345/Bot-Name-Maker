import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
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
  const class_name = user["class_name"] as string | null;

  let query = supabase
    .from("grades")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "student") {
    query = supabase
      .from("grades")
      .select("*")
      .eq("student_login", login)
      .order("created_at", { ascending: false });
  } else if (role === "teacher" || role === "sinf_rahbari") {
    query = supabase
      .from("grades")
      .select("*")
      .eq("teacher_login", login)
      .order("created_at", { ascending: false });
  } else if ((role === "director" || role === "zavuch" || role === "zam_direktor") && req.query["class_name"]) {
    query = supabase
      .from("grades")
      .select("*")
      .eq("class_name", req.query["class_name"] as string)
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Baholarni yuklashda xatolik", details: error.message });
    return;
  }
  res.json(data ?? []);
});

// GET /api/grades/class/:class_name - sinf baholarini ko'rish
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

  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .eq("class_name", class_name)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Baholarni yuklashda xatolik", details: error.message });
    return;
  }
  res.json(data ?? []);
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

  const { data, error } = await supabase
    .from("grades")
    .insert([{
      student_login,
      student_name,
      class_name,
      subject,
      grade,
      comment: comment ?? "",
      teacher_login: user["login"] as string,
      teacher_name: user["full_name"] as string,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Baho qo'shishda xatolik", details: error?.message });
    return;
  }
  res.status(201).json(data);
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

  const { data: existing } = await supabase
    .from("grades")
    .select("teacher_login")
    .eq("id", id)
    .single();

  if (!existing) {
    res.status(404).json({ error: "Baho topilmadi" });
    return;
  }

  if (role !== "admin" && (existing as { teacher_login: string }).teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu bahoni o'zgartirish uchun ruxsat yo'q" });
    return;
  }

  const { data, error } = await supabase
    .from("grades")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
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

  const { data: existing } = await supabase
    .from("grades")
    .select("teacher_login")
    .eq("id", id)
    .single();

  if (!existing) {
    res.status(404).json({ error: "Baho topilmadi" });
    return;
  }

  if (role !== "admin" && (existing as { teacher_login: string }).teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu bahoni o'chirish uchun ruxsat yo'q" });
    return;
  }

  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: "Bahoni o'chirishda xatolik" });
    return;
  }
  res.json({ ok: true });
});

export default router;
