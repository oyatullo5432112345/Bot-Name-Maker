import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import { getAuthUser } from "./auth.js";

const CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function genCode(): string {
  let c = "";
  for (let i = 0; i < 8; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const c = genCode();
    const { data } = await supabase.from("registration_codes").select("id").eq("code", c).maybeSingle();
    if (!data) return c;
  }
  return genCode();
}

const router: IRouter = Router();

// POST /api/auth/verify-code — mahfiy kodni tekshirish (ommaviy)
router.post("/auth/verify-code", async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) {
    res.status(400).json({ error: "Kod kiritilmagan" });
    return;
  }
  const upperCode = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("registration_codes")
    .select("*")
    .eq("code", upperCode)
    .eq("used", false)
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ error: "Kod topilmadi yoki allaqachon ishlatilgan" });
    return;
  }

  const row = data as {
    id: string; code: string; full_name: string; first_name: string; last_name: string;
    role: string; class_id: string | null; class_name: string | null;
  };

  res.json({
    valid: true,
    id: row.id,
    code: row.code,
    full_name: row.full_name,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    class_id: row.class_id,
    class_name: row.class_name,
  });
});

// GET /api/admin/codes — kodlar ro'yxati (admin)
router.get("/admin/codes", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const { class_id, role } = req.query as Record<string, string>;
  let q = supabase.from("registration_codes").select("*").order("created_at", { ascending: false });
  if (class_id) q = q.eq("class_id", class_id);
  if (role) q = q.eq("role", role);
  const { data, error } = await q;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/admin/codes/generate — ommaviy kod yaratish (admin)
router.post("/admin/codes/generate", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const { names, role = "student", class_id, class_name } = req.body as {
    names: string[]; role?: string; class_id?: string; class_name?: string;
  };
  if (!names?.length) { res.status(400).json({ error: "Ismlar kiritilmagan" }); return; }

  const rows = [];
  for (const raw of names) {
    const full_name = raw.trim();
    if (!full_name) continue;
    const parts = full_name.split(/\s+/);
    const last_name = parts[0] ?? "";
    const first_name = parts.slice(1).join(" ") || last_name;
    const code = await uniqueCode();
    rows.push({ code, full_name, first_name, last_name, role, class_id: class_id || null, class_name: class_name || null });
  }

  if (!rows.length) { res.status(400).json({ error: "Hech qanday ism topilmadi" }); return; }

  const { data, error } = await supabase.from("registration_codes").insert(rows).select();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ generated: data ?? [] });
});

// DELETE /api/admin/codes/:id — kodni o'chirish (admin)
router.delete("/admin/codes/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const { error } = await supabase.from("registration_codes").delete().eq("id", req.params["id"]);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
