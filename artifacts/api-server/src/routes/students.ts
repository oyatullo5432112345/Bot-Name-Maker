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
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

const SELECT_FIELDS = "telegram_id, full_name, phone_number, class_name, login, registration_date";

function generateStudentCredentials(name: string): { login: string; password: string } {
  const parts = name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "user";
  const num = Math.floor(100 + Math.random() * 900);
  return {
    login: `${base}${num}`,
    password: Math.floor(100000 + Math.random() * 900000).toString(),
  };
}

// GET /api/students
router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const qp = ListStudentsQueryParams.safeParse(req.query);
  try {
    let q = supabase
      .from("users")
      .select(SELECT_FIELDS)
      .order("registration_date", { ascending: false });

    if (qp.success && qp.data.class_name) {
      q = q.eq("class_name", qp.data.class_name);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json(ListStudentsResponse.parse(data ?? []));
  } catch (err) {
    res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
  }
});

// POST /api/students/bulk
router.post("/students/bulk", requireAuth, async (req, res): Promise<void> => {
  const { students } = req.body as { students: { full_name: string; phone_number?: string; class_name: string }[] };
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "students massivi bo'sh" });
    return;
  }

  const created: { full_name: string; login: string; password: string; class_name: string }[] = [];
  const errors: { full_name: string; error: string }[] = [];

  for (const s of students) {
    const parts = (s.full_name ?? "").trim().toLowerCase().split(" ");
    const base = parts[0] ?? "user";
    const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const password = Math.floor(10000 + Math.random() * 90000).toString();
    const telegram_id = Date.now() + Math.floor(Math.random() * 10000);

    const { error } = await supabase.from("users").insert({
      telegram_id,
      full_name: s.full_name,
      phone_number: s.phone_number || "",
      class_name: s.class_name,
      login,
      password,
      registration_date: new Date().toISOString(),
    });

    if (error) {
      errors.push({ full_name: s.full_name, error: "Qo'shishda xatolik" });
    } else {
      created.push({ full_name: s.full_name, login, password, class_name: s.class_name });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/students
router.post("/students", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { full_name, phone_number, class_name } = parsed.data;
  const { login, password } = generateStudentCredentials(full_name);

  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: Date.now(),
      full_name,
      phone_number,
      class_name,
      login,
      password,
      registration_date: new Date().toISOString(),
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(GetStudentResponse.parse(data));
});

// GET /api/students/:id
router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select(SELECT_FIELDS)
    .eq("telegram_id", params.data.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }
  res.json(GetStudentResponse.parse(data));
});

// PATCH /api/students/:id
router.patch("/students/:id", requireAuth, async (req, res): Promise<void> => {
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
  if (body.data.full_name != null) updates["full_name"] = body.data.full_name;
  if (body.data.phone_number != null) updates["phone_number"] = body.data.phone_number;
  if (body.data.class_name != null) updates["class_name"] = body.data.class_name;
  if (body.data.password != null) updates["password"] = body.data.password;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("telegram_id", params.data.id)
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }
  res.json(UpdateStudentResponse.parse(data));
});

// DELETE /api/students/:id
router.delete("/students/:id", requireAuth, async (req, res): Promise<void> => {
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
