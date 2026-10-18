// Faollik analitikasi — foydalanuvchilar saytdan qanchalik foydalanayotgani.
//   • Maktab direktori (va rahbariyat) — faqat O'Z maktabi (sinf + foydalanuvchi darajasida).
//   • Super-admin (tuman admini) — hammani: tuman → maktab → sinf → foydalanuvchi.
// Kuzatuv yengil: har autentifikatsiyalangan so'rovda (foydalanuvchiga 2 daqiqada bir marta)
// user_activity (oxirgi ko'rinish, jami) va user_activity_daily (kunlik) yangilanadi.
// Jonli davomat (face_checkins) va boshqa tizimlarga TEGMAYDI — faqat qo'shimcha yozuv.

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { query } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { uzDateStr } from "../lib/tg-shared.js";
import { logger } from "../lib/logger.js";

const ACTIVITY_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_activity (
  login      TEXT PRIMARY KEY,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hits       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_activity_daily (
  login TEXT NOT NULL,
  date  DATE NOT NULL,
  hits  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (login, date)
);
CREATE INDEX IF NOT EXISTS idx_uad_date ON user_activity_daily(date);
`;

void query(ACTIVITY_SCHEMA)
  .then(() => logger.info("Faollik analitikasi jadvallari tayyor ✅"))
  .catch((err) => logger.error({ err }, "user_activity sxemasini yaratishda xato"));

// ─── Kuzatuv (middleware) ─────────────────────────────────────────────────────
// Har bir foydalanuvchiga 2 daqiqada bir marta yoziladi (bazaga ortiqcha yuk bo'lmasin).
const THROTTLE_MS = 120_000;
const lastWrite = new Map<string, number>();

async function record(login: string, date: string): Promise<void> {
  await query(
    `INSERT INTO user_activity (login, hits) VALUES ($1, 1)
     ON CONFLICT (login) DO UPDATE SET last_seen = NOW(), hits = user_activity.hits + 1`,
    [login]
  ).catch(() => {});
  await query(
    `INSERT INTO user_activity_daily (login, date, hits) VALUES ($1, $2::date, 1)
     ON CONFLICT (login, date) DO UPDATE SET hits = user_activity_daily.hits + 1`,
    [login, date]
  ).catch(() => {});
}

/** Barcha API so'rovlariga ulanadi — autentifikatsiyalangan foydalanuvchining faolligini yozadi (throttled, fire-and-forget). */
export function activityMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const u = getAuthUser(req.headers.authorization);
    const login = u?.["login"];
    if (typeof login === "string" && login) {
      const now = Date.now();
      const prev = lastWrite.get(login) ?? 0;
      if (now - prev > THROTTLE_MS) {
        lastWrite.set(login, now);
        void record(login, uzDateStr());
      }
    }
  } catch { /* kuzatuv hech qachon so'rovni buzmaydi */ }
  next();
}

// ─── O'qish (analitika) ───────────────────────────────────────────────────────
const VIEW_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

interface PersonRow {
  login: string;
  full_name: string;
  role: string;
  class_name: string;
  maktab_id: number | null;
  maktab_nom: string | null;
  tuman: string | null;
  last_seen_txt: string;
  ago_sec: string;
  hits: number;
  d7: number;
  d30: number;
  today: boolean;
}

const router: IRouter = Router();

// GET /api/analytics/activity
//   Super-admin → barcha faol foydalanuvchilar (tuman/maktab/sinf bo'yicha guruhlash frontendda).
//   Direktor/rahbariyat → faqat o'z maktabi.
// Javob: { scope, people: [...], registered: [{maktab_id, class_name, total}] }
router.get("/analytics/activity", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !VIEW_ROLES.includes(String(u["role"]))) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const mid = schoolOf(u); // admin → null (hammasi), aks holda o'z maktabi
  try {
    const people = await query<PersonRow>(
      `WITH pa AS (
         SELECT a.login, a.last_seen, a.hits,
                COALESCE(u.full_name, s.full_name, a.login) AS full_name,
                COALESCE(u.role, s.role, '') AS role,
                COALESCE(NULLIF(u.class_name, ''), '') AS class_name,
                COALESCE(u.maktab_id, s.maktab_id) AS maktab_id
           FROM user_activity a
           LEFT JOIN users u ON u.login = a.login
           LEFT JOIN staff s ON s.login = a.login
       )
       SELECT pa.login, pa.full_name, pa.role, pa.class_name, pa.maktab_id,
              m.nom AS maktab_nom, m.tuman AS tuman,
              to_char(pa.last_seen AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD HH24:MI') AS last_seen_txt,
              (EXTRACT(EPOCH FROM (NOW() - pa.last_seen)))::bigint AS ago_sec,
              pa.hits,
              (SELECT COUNT(*)::int FROM user_activity_daily d
                 WHERE d.login = pa.login AND d.date >= (NOW() AT TIME ZONE 'Asia/Tashkent')::date - 6) AS d7,
              (SELECT COUNT(*)::int FROM user_activity_daily d
                 WHERE d.login = pa.login AND d.date >= (NOW() AT TIME ZONE 'Asia/Tashkent')::date - 29) AS d30,
              EXISTS(SELECT 1 FROM user_activity_daily d
                 WHERE d.login = pa.login AND d.date = (NOW() AT TIME ZONE 'Asia/Tashkent')::date) AS today
         FROM pa
         LEFT JOIN maktablar m ON m.id = pa.maktab_id
        WHERE ($1::int IS NULL OR pa.maktab_id = $1)
        ORDER BY pa.last_seen DESC`,
      [mid]
    );

    // Ro'yxatga olingan o'quvchilar soni (maxraj uchun: "20/45 faol")
    const registered = await query<{ maktab_id: number | null; class_name: string; total: number }>(
      `SELECT maktab_id, COALESCE(NULLIF(class_name, ''), '') AS class_name, COUNT(*)::int AS total
         FROM users
        WHERE ($1::int IS NULL OR maktab_id = $1)
        GROUP BY maktab_id, class_name`,
      [mid]
    );

    res.setHeader("Cache-Control", "no-store");
    res.json({ scope: mid === null ? "tuman" : "maktab", maktab_id: mid, people, registered });
  } catch (err) {
    logger.error({ err }, "analytics/activity");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
