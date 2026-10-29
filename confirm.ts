// Oylik "Tasdiqlash" — foydalanuvchi bosh sahifada o'zi ekanligini oyiga bir marta tasdiqlaydi.
//   • POST /api/confirm            — joriy oy uchun tasdiqlash (oyiga bir marta)
//   • GET  /api/confirm/status     — bu oy tasdiqlanganmi
//   • GET  /api/analytics/confirm  — rahbariyat: har maktab bo'yicha jami / bu oy tasdiqlagan (+ belgilari)
// Mavjud user_activity jadvallariga TEGMAYDI — alohida jadval.

import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { uzDateStr } from "../lib/tg-shared.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const CONFIRM_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_confirm_monthly (
  login        TEXT NOT NULL,
  period       TEXT NOT NULL,
  maktab_id    INT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (login, period)
);
CREATE INDEX IF NOT EXISTS idx_ucm_period_maktab ON user_confirm_monthly(period, maktab_id);
`;

void query(CONFIRM_SCHEMA)
  .then(() => logger.info("Tasdiqlash jadvali tayyor ✅"))
  .catch((err) => logger.error({ err }, "user_confirm_monthly sxemasini yaratishda xato"));

/** Joriy oy, masalan "2026-10" (Toshkent vaqti bo'yicha) */
const currentPeriod = (): string => uzDateStr().slice(0, 7);

const VIEW_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

// POST /api/confirm — joriy oy uchun tasdiqlash
router.post("/confirm", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  const login = typeof u?.["login"] === "string" ? (u["login"] as string) : "";
  if (!u || !login) { res.status(401).json({ error: "Avval tizimga kiring" }); return; }
  try {
    // Maktabni bazadan olamiz (users yoki staff); topilmasa tokendagisi
    const row = await queryOne<{ maktab_id: number | null }>(
      `SELECT COALESCE(
         (SELECT maktab_id FROM users WHERE login = $1),
         (SELECT maktab_id FROM staff WHERE login = $1)
       ) AS maktab_id`,
      [login]
    );
    const maktab = row?.maktab_id ?? schoolOf(u) ?? null;
    await query(
      `INSERT INTO user_confirm_monthly (login, period, maktab_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (login, period) DO NOTHING`,
      [login, currentPeriod(), maktab]
    );
    res.json({ ok: true, confirmed: true, period: currentPeriod() });
  } catch (err) {
    logger.error({ err }, "tasdiqlashda xato");
    res.status(500).json({ error: "Tasdiqlashda xatolik" });
  }
});

// GET /api/confirm/status — bu oy tasdiqlanganmi
router.get("/confirm/status", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  const login = typeof u?.["login"] === "string" ? (u["login"] as string) : "";
  if (!u || !login) { res.status(401).json({ error: "Avval tizimga kiring" }); return; }
  const row = await queryOne<{ ok: number }>(
    `SELECT 1 AS ok FROM user_confirm_monthly WHERE login = $1 AND period = $2`,
    [login, currentPeriod()]
  ).catch(() => null);
  res.json({ confirmed: !!row });
});

// GET /api/analytics/confirm — maktab bo'yicha: jami odam va bu oy tasdiqlaganlar
router.get("/analytics/confirm", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !VIEW_ROLES.includes(String(u["role"]))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const mid = schoolOf(u); // admin → null (hammasi), aks holda o'z maktabi
  try {
    const [totals, confirmed, schools] = await Promise.all([
      query<{ maktab_id: number | null; total: number }>(
        `SELECT maktab_id, COUNT(*)::int AS total FROM (
           SELECT login, maktab_id FROM users
           UNION ALL
           SELECT login, maktab_id FROM staff
         ) p GROUP BY maktab_id`
      ),
      query<{ maktab_id: number | null; confirmed: number }>(
        `SELECT maktab_id, COUNT(*)::int AS confirmed
           FROM user_confirm_monthly WHERE period = $1
          GROUP BY maktab_id`,
        [currentPeriod()]
      ),
      query<{ id: number; nom: string }>(
        `SELECT id, nom FROM maktablar WHERE deleted_at IS NULL ORDER BY id`
      ),
    ]);

    const totalBy = new Map(totals.map((r) => [r.maktab_id, r.total]));
    const confBy = new Map(confirmed.map((r) => [r.maktab_id, r.confirmed]));

    const out = schools
      .filter((s) => mid === null || s.id === mid)
      .map((s) => ({
        maktab_id: s.id,
        nom: s.nom || `${s.id}-maktab`,
        total: totalBy.get(s.id) ?? 0,
        confirmed: confBy.get(s.id) ?? 0,
      }));

    res.json({ period: currentPeriod(), schools: out });
  } catch (err) {
    logger.error({ err }, "tasdiqlash analitikasi xato");
    res.status(500).json({ error: "Xatolik" });
  }
});

export default router;
