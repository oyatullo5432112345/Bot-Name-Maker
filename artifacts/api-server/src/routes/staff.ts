import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import { query } from "../lib/db.js";
import {
  ListStaffResponse,
  CreateStaffBody,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  DeleteStaffParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

function generateStaffCredentials(name: string): { login: string; password: string } {
  const parts = name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "staff";
  return {
    login: `${base}${Math.floor(100 + Math.random() * 900)}`,
    password: Math.floor(100000 + Math.random() * 900000).toString(),
  };
}

const SELECT_FIELDS = "id, full_name, role, class_id, login, telegram_id, created_at, subjects, can_teach";

async function enrichStaff(staff: {
  id: string; full_name: string; role: string; class_id?: string | null;
  login: string; telegram_id?: number | null;
  created_at?: string | null; subjects?: string[] | null; can_teach?: boolean | null;
}) {
  let class_name: string | null = null;
  if (staff.class_id) {
    const { data } = await supabase
      .from("classes")
      .select("name")
      .eq("id", staff.class_id)
      .single();
    class_name = (data as { name: string } | null)?.name ?? null;
  }
  return { ...staff, class_name, subjects: staff.subjects ?? [], can_teach: staff.can_teach ?? false };
}

// GET /api/staff/:id
router.get("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("staff")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }
  const enriched = await enrichStaff(data as Parameters<typeof enrichStaff>[0]);
  res.json(enriched);
});

// GET /api/staff
router.get("/staff", requireAuth, async (_req, res): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("staff")
      .select(SELECT_FIELDS)
      .order("full_name");

    if (error) throw error;
    const enriched = await Promise.all((data ?? []).map(d => enrichStaff(d as Parameters<typeof enrichStaff>[0])));
    res.json(ListStaffResponse.parse(enriched));
  } catch (err) {
    res.status(500).json({ error: "Ma'lumotlarni olishda xatolik" });
  }
});

// POST /api/staff/bulk
router.post("/staff/bulk", requireAuth, async (req, res): Promise<void> => {
  const { staff: items } = req.body as {
    staff: { full_name: string; role: string; subjects?: string[]; can_teach?: boolean }[];
  };
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "staff massivi bo'sh" });
    return;
  }

  const created: { full_name: string; login: string; password: string; role: string }[] = [];
  const errors: { full_name: string; error: string }[] = [];

  for (const s of items) {
    const parts = (s.full_name ?? "").trim().toLowerCase().split(" ");
    const base = parts[0] ?? "staff";
    const login = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const password = Math.floor(10000 + Math.random() * 90000).toString();
    const can_teach = s.can_teach ?? (s.role === "teacher" || s.role === "sinf_rahbari");

    const { error } = await supabase.from("staff").insert({
      full_name: s.full_name,
      role: s.role,
      login,
      password,
      telegram_id: null,
      subjects: s.subjects ?? [],
      can_teach,
    });

    if (error) {
      errors.push({ full_name: s.full_name, error: error.message });
    } else {
      created.push({ full_name: s.full_name, login, password, role: s.role });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/staff
router.post("/staff", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { login, password } = generateStaffCredentials(parsed.data.full_name);

  const { data, error } = await supabase
    .from("staff")
    .insert({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      class_id: parsed.data.class_id ?? null,
      login,
      password,
      telegram_id: null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const enriched = await enrichStaff(data as Parameters<typeof enrichStaff>[0]);
  res.status(201).json(enriched);
});

// PATCH /api/staff/:id
router.patch("/staff/:id", requireAuth, async (req, res): Promise<void> => {
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

  const raw = body.data as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (raw["full_name"] != null) updates["full_name"] = raw["full_name"];
  if (raw["role"] != null) updates["role"] = raw["role"];
  if (raw["class_id"] !== undefined) updates["class_id"] = raw["class_id"];
  if (raw["login"] != null) updates["login"] = raw["login"];
  if (raw["password"] != null) updates["password"] = raw["password"];
  if (raw["can_teach"] !== undefined) updates["can_teach"] = raw["can_teach"];
  if (raw["subjects"] !== undefined) updates["subjects"] = raw["subjects"];

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }

  const { data, error } = await supabase
    .from("staff")
    .update(updates)
    .eq("id", params.data.id)
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }

  const enriched = await enrichStaff(data as Parameters<typeof enrichStaff>[0]);
  res.json(UpdateStaffResponse.parse(enriched));
});

// DELETE /api/staff/:id
router.delete("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    // Cascade clean up in local PostgreSQL for relations not in Supabase
    await Promise.allSettled([
      query("DELETE FROM teacher_subjects WHERE teacher_id = $1", [params.data.id]),
      query("UPDATE timetable SET teacher_id = NULL WHERE teacher_id = $1", [params.data.id]),
    ]);

    // Remove class assignment in Supabase
    await supabase.from("classes").update({ teacher_id: null }).eq("teacher_id", params.data.id);

    // Delete staff from Supabase
    const { error } = await supabase.from("staff").delete().eq("id", params.data.id);
    if (error) throw error;

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
