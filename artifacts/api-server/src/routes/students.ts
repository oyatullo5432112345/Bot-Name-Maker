import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import {
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// O'quvchi login/parol yaratish
function generateStudentCredentials(name: string): { login: string; password: string } {
  const parts = name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "user";
  const num = Math.floor(100 + Math.random() * 900);
  const login = `${base}${num}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  return { login, password };
}

// GET /api/students
router.get("/students", async (req, res): Promise<void> => {
  const qp = ListStudentsQueryParams.safeParse(req.query);
  let query = supabase.from("users").select("*").order("registration_date", { ascending: false });

  if (qp.success && qp.data.class_name) {
    query = supabase
      .from("users")
      .select("*")
      .eq("class_name", qp.data.class_name)
      .order("registration_date", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(ListStudentsResponse.parse(data ?? []));
});

// POST /api/students
router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { full_name, phone_number, class_name } = parsed.data;
  const { login, password } = generateStudentCredentials(full_name);

  const telegram_id = Date.now(); // Veb orqali qo'shilganda telegram_id yo'q — time-based
  const registration_date = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .insert([{ telegram_id, full_name, phone_number, class_name, login, password, registration_date }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(GetStudentResponse.parse(data));
});

// GET /api/students/:id
router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", params.data.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }

  res.json(GetStudentResponse.parse(data));
});

// PATCH /api/students/:id
router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateStudentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.full_name != null) updates.full_name = body.data.full_name;
  if (body.data.phone_number != null) updates.phone_number = body.data.phone_number;
  if (body.data.class_name != null) updates.class_name = body.data.class_name;
  if (body.data.password != null) updates.password = body.data.password;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("telegram_id", params.data.id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }

  res.json(UpdateStudentResponse.parse(data));
});

// DELETE /api/students/:id
router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("telegram_id", params.data.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.sendStatus(204);
});

export default router;
