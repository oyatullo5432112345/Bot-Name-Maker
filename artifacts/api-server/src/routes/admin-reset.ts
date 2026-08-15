import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

function requireAdmin(authHeader: string | undefined) {
  const user = getAuthUser(authHeader);
  if (!user || user["role"] !== "admin") return null;
  return user;
}

// Har bir toifa uchun: nechta yozuv borligini hisoblab beradi (tasdiqlash oynasida ko'rsatish uchun)
router.get("/admin/reset/counts", async (req, res): Promise<void> => {
  const user = requireAdmin(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Faqat admin uchun" }); return; }

  const [codes, classes, boardGames, wheelGames, staff, monitoringTests] = await Promise.all([
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM registration_codes"),
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM classes"),
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM board_games"),
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM wheel_games"),
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM staff WHERE role != 'admin'"),
    queryOne<{ c: string }>("SELECT COUNT(*)::text AS c FROM monitoring_tests"),
  ]);

  res.json({
    mahfiy_kodlar: Number(codes?.c ?? 0),
    sinflar: Number(classes?.c ?? 0),
    oyinlar: Number(boardGames?.c ?? 0) + Number(wheelGames?.c ?? 0),
    xodimlar: Number(staff?.c ?? 0),
    monitoring: Number(monitoringTests?.c ?? 0),
  });
});

// POST /api/admin/reset/:category — tanlangan toifani butunlay tozalaydi (faqat sinov uchun!)
router.post("/admin/reset/:category", async (req, res): Promise<void> => {
  const user = requireAdmin(req.headers.authorization);
  if (!user) { res.status(403).json({ error: "Faqat admin uchun" }); return; }

  const category = req.params["category"];
  try {
    switch (category) {
      case "mahfiy_kodlar":
        await query("DELETE FROM registration_codes");
        break;
      case "sinflar":
        await query("UPDATE staff SET class_id = NULL");
        await query("DELETE FROM classes");
        break;
      case "oyinlar":
        await query("DELETE FROM board_cells");
        await query("DELETE FROM board_games");
        await query("DELETE FROM wheel_games");
        break;
      case "xodimlar":
        await query("DELETE FROM staff WHERE role != 'admin'");
        break;
      case "monitoring":
        await query("DELETE FROM monitoring_attempts");
        await query("DELETE FROM monitoring_questions");
        await query("DELETE FROM monitoring_tests");
        break;
      default:
        res.status(400).json({ error: "Noma'lum toifa" });
        return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Xatolik yuz berdi" });
  }
});

export default router;
