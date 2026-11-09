import { Router, type IRouter } from "express";
import { query } from "../lib/db.js";

const router: IRouter = Router();

// GET /api/maktablar/public — barcha faol maktablar (login sahifasi uchun)
router.get("/maktablar/public", async (_req, res): Promise<void> => {
  try {
    const rows = await query<{ id: number; nom: string }>(
      "SELECT id, nom FROM maktablar WHERE deleted_at IS NULL AND is_active = TRUE ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/classes/public?maktab_id= — sinflar ro'yxati
router.get("/classes/public", async (req, res): Promise<void> => {
  const mid = Number(req.query["maktab_id"]);
  if (!Number.isInteger(mid)) { res.status(400).json({ error: "maktab_id kerak" }); return; }
  try {
    const rows = await query<{ class_name: string }>(
      "SELECT DISTINCT name AS class_name FROM classes WHERE maktab_id = $1 AND name <> '' ORDER BY name",
      [mid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/students/public?maktab_id=&class_name= — o'quvchilar ro'yxati
router.get("/students/public", async (req, res): Promise<void> => {
  const mid = Number(req.query["maktab_id"]);
  const cn = String(req.query["class_name"] ?? "").trim();
  if (!Number.isInteger(mid) || !cn) {
    res.status(400).json({ error: "maktab_id va class_name kerak" });
    return;
  }
  try {
    const rows = await query<{ login: string; full_name: string }>(
      "SELECT login, full_name FROM users WHERE maktab_id = $1 AND class_name = $2 ORDER BY full_name",
      [mid, cn]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
