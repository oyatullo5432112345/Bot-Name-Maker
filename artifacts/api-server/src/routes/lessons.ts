import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
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

  let query = supabase
    .from("lessons")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "student" && class_name) {
    query = supabase
      .from("lessons")
      .select("*")
      .eq("class_name", class_name)
      .order("created_at", { ascending: false });
  } else if (role === "teacher" || role === "sinf_rahbari") {
    const login = user["login"] as string;
    query = supabase
      .from("lessons")
      .select("*")
      .eq("teacher_login", login)
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Darsliklarni yuklashda xatolik", details: error.message });
    return;
  }
  res.json(data ?? []);
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

  const { data, error } = await supabase
    .from("lessons")
    .insert([{
      title,
      subject,
      description: description ?? "",
      content: content ?? "",
      class_name,
      teacher_login: user["login"] as string,
      teacher_name: user["full_name"] as string,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Darslik qo'shishda xatolik", details: error?.message });
    return;
  }
  res.status(201).json(data);
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

  const { data: existing } = await supabase
    .from("lessons")
    .select("teacher_login")
    .eq("id", id)
    .single();

  if (!existing) {
    res.status(404).json({ error: "Darslik topilmadi" });
    return;
  }

  if (role !== "admin" && (existing as { teacher_login: string }).teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu darslikni o'zgartirish uchun ruxsat yo'q" });
    return;
  }

  const { data, error } = await supabase
    .from("lessons")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
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

  const { data: existing } = await supabase
    .from("lessons")
    .select("teacher_login")
    .eq("id", id)
    .single();

  if (!existing) {
    res.status(404).json({ error: "Darslik topilmadi" });
    return;
  }

  if (role !== "admin" && (existing as { teacher_login: string }).teacher_login !== (user["login"] as string)) {
    res.status(403).json({ error: "Bu darslikni o'chirish uchun ruxsat yo'q" });
    return;
  }

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: "Darslikni o'chirishda xatolik" });
    return;
  }
  res.json({ ok: true });
});

export default router;
