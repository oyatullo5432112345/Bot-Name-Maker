// Har maktabning o'z dars vaqtlari (1–8 dars: boshlanish — tugash).
// O'qish: barcha kirgan foydalanuvchi. Tahrirlash: admin, direktor, zavuch, MMTB (faqat o'z maktabi).

import { Router, type IRouter } from "express";
import { query } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";

const router: IRouter = Router();

const EDIT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

void query(`
  CREATE TABLE IF NOT EXISTS maktab_periods (
    maktab_id  INT NOT NULL,
    period     SMALLINT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    PRIMARY KEY (maktab_id, period)
  );
`).catch(() => { /* migratsiya */ });

// GET /api/maktab-periods — shu maktabning saqlangan dars vaqtlari (bo'lmasa ro'yxat bo'sh)
router.get("/maktab-periods", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const mid = schoolOf(u) ?? 3;
  try {
    const rows = await query<{ period: number; start_time: string; end_time: string }>(
      "SELECT period, start_time, end_time FROM maktab_periods WHERE maktab_id = $1 ORDER BY period",
      [mid],
    );
    res.json({ periods: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/maktab-periods { periods: [{ period, start, end }] }
router.put("/maktab-periods", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !EDIT_ROLES.includes(String(u["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(u);
  if (mid === null) { res.status(400).json({ error: "Maktab tanlanmagan. Admin: avval maktabni 'ko'rish' rejimiga o'tkazing" }); return; }

  const list = (req.body as { periods?: unknown })?.periods;
  if (!Array.isArray(list) || list.length === 0 || list.length > 8) {
    res.status(400).json({ error: "periods massivi 1–8 ta bo'lsin" }); return;
  }
  const items: { period: number; start: string; end: string }[] = [];
  for (const it of list as { period?: unknown; start?: unknown; end?: unknown }[]) {
    const period = Number(it.period);
    const start = String(it.start ?? "");
    const end = String(it.end ?? "");
    if (!Number.isInteger(period) || period < 1 || period > 8) { res.status(400).json({ error: "Dars raqami 1–8 bo'lsin" }); return; }
    if (!HM.test(start) || !HM.test(end)) { res.status(400).json({ error: `Vaqt HH:MM formatida bo'lsin (${period}-dars)` }); return; }
    if (start >= end) { res.status(400).json({ error: `${period}-darsda boshlanish tugashdan oldin bo'lishi kerak` }); return; }
    items.push({ period, start, end });
  }

  try {
    for (const it of items) {
      await query(
        `INSERT INTO maktab_periods (maktab_id, period, start_time, end_time) VALUES ($1, $2, $3, $4)
         ON CONFLICT (maktab_id, period) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time`,
        [mid, it.period, it.start, it.end],
      );
    }
    res.json({ ok: true, saved: items.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
