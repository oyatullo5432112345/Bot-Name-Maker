import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import {
  ListStaffResponse,
  CreateStaffBody,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  DeleteStaffParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateStaffCredentials(name: string): { login: string; password: string } {
  const parts = name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "staff";
  const num = Math.floor(100 + Math.random() * 900);
  const login = `${base}${num}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  return { login, password };
}

async function enrichStaff(staff: {
  id: string;
  full_name: string;
  role: string;
  class_id?: string | null;
  login: string;
  password: string;
  telegram_id?: number | null;
  created_at?: string | null;
}) {
  let class_name: string | null = null;
  if (staff.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", staff.class_id)
      .single();
    class_name = cls?.name ?? null;
  }
  return { ...staff, class_name };
}

// GET /api/staff
router.get("/staff", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("full_name");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const enriched = await Promise.all((data ?? []).map(enrichStaff));
  res.json(ListStaffResponse.parse(enriched));
});

// POST /api/staff
router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { login, password } = generateStaffCredentials(parsed.data.full_name);

  const { data, error } = await supabase
    .from("staff")
    .insert([{
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      class_id: parsed.data.class_id ?? null,
      login,
      password,
      telegram_id: null,
    }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const enriched = await enrichStaff(data as Parameters<typeof enrichStaff>[0]);
  res.status(201).json(enriched);
});

// PATCH /api/staff/:id
router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateStaffBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.full_name != null) updates.full_name = body.data.full_name;
  if (body.data.role != null) updates.role = body.data.role;
  if (body.data.class_id !== undefined) updates.class_id = body.data.class_id;
  if (body.data.login != null) updates.login = body.data.login;
  if (body.data.password != null) updates.password = body.data.password;

  const { data, error } = await supabase
    .from("staff")
    .update(updates)
    .eq("id", params.data.id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }

  const enriched = await enrichStaff(data as Parameters<typeof enrichStaff>[0]);
  res.json(UpdateStaffResponse.parse(enriched));
});

// DELETE /api/staff/:id
router.delete("/staff/:id", async (req, res): Promise<void> => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", params.data.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.sendStatus(204);
});

export default router;
