import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

const ADMIN_ROLES = ["admin", "mudir"];

function isAdminRole(role: string) {
  return ADMIN_ROLES.includes(role);
}

// ─── MAKTABLAR ────────────────────────────────────────────────────────────────

// GET /api/olimpiada/maktablar
router.get("/olimpiada/maktablar", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("olimpiada_maktablar")
    .select("*")
    .order("jami_ball", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

// POST /api/olimpiada/maktablar
router.post("/olimpiada/maktablar", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { nomi, tuman, yil } = req.body as { nomi?: string; tuman?: string; yil?: number };
  if (!nomi || nomi.trim().length < 2) {
    res.status(400).json({ error: "Maktab nomini kiriting" });
    return;
  }

  const { data, error } = await supabase
    .from("olimpiada_maktablar")
    .insert([{ nomi: nomi.trim(), tuman: tuman?.trim() ?? "", jami_ball: 0, yil: yil ?? new Date().getFullYear() }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// PATCH /api/olimpiada/maktablar/:id
router.patch("/olimpiada/maktablar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params;
  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;
  if (body.nomi) updates.nomi = String(body.nomi).trim();
  if (body.tuman !== undefined) updates.tuman = String(body.tuman).trim();
  if (body.yil) updates.yil = Number(body.yil);

  const { data, error } = await supabase
    .from("olimpiada_maktablar")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Maktab topilmadi" });
    return;
  }
  res.json(data);
});

// DELETE /api/olimpiada/maktablar/:id
router.delete("/olimpiada/maktablar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params;
  await supabase.from("olimpiada_ishtirokchilar").delete().eq("maktab_id", id);
  const { error } = await supabase.from("olimpiada_maktablar").delete().eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.sendStatus(204);
});

// ─── ISHTIROKCHILAR ───────────────────────────────────────────────────────────

// GET /api/olimpiada/ishtirokchilar
router.get("/olimpiada/ishtirokchilar", async (req, res): Promise<void> => {
  const maktab_id = req.query["maktab_id"] as string | undefined;

  let query = supabase
    .from("olimpiada_ishtirokchilar")
    .select("*")
    .order("ball", { ascending: false });

  if (maktab_id) query = query.eq("maktab_id", maktab_id);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

// POST /api/olimpiada/ishtirokchilar
router.post("/olimpiada/ishtirokchilar", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { maktab_id, maktab_nomi, ism, fan, ball, orin, yil } = req.body as {
    maktab_id?: string;
    maktab_nomi?: string;
    ism?: string;
    fan?: string;
    ball?: number;
    orin?: number;
    yil?: number;
  };

  if (!maktab_id) { res.status(400).json({ error: "Maktab tanlanmagan" }); return; }
  if (!ism || ism.trim().length < 2) { res.status(400).json({ error: "Ishtirokchi ismini kiriting" }); return; }
  if (!fan || fan.trim().length < 1) { res.status(400).json({ error: "Fanni kiriting" }); return; }
  if (ball === undefined || isNaN(Number(ball))) { res.status(400).json({ error: "Ball kiriting" }); return; }

  const { data, error } = await supabase
    .from("olimpiada_ishtirokchilar")
    .insert([{
      maktab_id,
      maktab_nomi: maktab_nomi?.trim() ?? "",
      ism: ism.trim(),
      fan: fan.trim(),
      ball: Number(ball),
      orin: orin ? Number(orin) : null,
      yil: yil ?? new Date().getFullYear(),
    }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Maktab jami ballini yangilash
  await recalcMaktabBall(maktab_id);

  res.status(201).json(data);
});

// PATCH /api/olimpiada/ishtirokchilar/:id
router.patch("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (body.ism) updates.ism = String(body.ism).trim();
  if (body.fan) updates.fan = String(body.fan).trim();
  if (body.ball !== undefined) updates.ball = Number(body.ball);
  if (body.orin !== undefined) updates.orin = body.orin ? Number(body.orin) : null;

  const { data, error } = await supabase
    .from("olimpiada_ishtirokchilar")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Ishtirokchi topilmadi" });
    return;
  }

  await recalcMaktabBall((data as { maktab_id: string }).maktab_id);
  res.json(data);
});

// DELETE /api/olimpiada/ishtirokchilar/:id
router.delete("/olimpiada/ishtirokchilar/:id", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !isAdminRole(String(user.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { id } = req.params;
  const { data: existing } = await supabase
    .from("olimpiada_ishtirokchilar")
    .select("maktab_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("olimpiada_ishtirokchilar").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (existing) await recalcMaktabBall((existing as { maktab_id: string }).maktab_id);
  res.sendStatus(204);
});

// ─── Yordamchi: maktab jami ballini qayta hisoblash ───────────────────────────
async function recalcMaktabBall(maktab_id: string) {
  const { data } = await supabase
    .from("olimpiada_ishtirokchilar")
    .select("ball")
    .eq("maktab_id", maktab_id);

  const jami_ball = ((data ?? []) as { ball: number }[]).reduce((sum, r) => sum + (r.ball || 0), 0);
  await supabase.from("olimpiada_maktablar").update({ jami_ball }).eq("id", maktab_id);
}

export default router;
