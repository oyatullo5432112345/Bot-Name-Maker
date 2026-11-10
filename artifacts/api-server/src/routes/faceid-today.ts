// Face ID — bugungi davomat ro'yxati va arxiv (qo'lda to'g'rilash uchun).
// Mustaqil router: mavjud faceid.ts ga tegilmaydi.

import { Router, type IRouter, type Request } from "express";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { uzDateStr } from "../lib/tg-shared.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const ENROLL = [...MANAGE, "sinf_rahbari", "boshlangich_oqituvchi"];
const STAFF_GROUP = "Xodimlar";

type AuthUser = Record<string, unknown> & {
  role: string;
  login: string;
  class_name?: string | null;
  full_name?: string;
};

function authAs(req: Request, roles: string[]): AuthUser | null {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u || !roles.includes(String(u.role))) return null;
  return u;
}

function canTouchClass(u: AuthUser, className: string): boolean {
  if (MANAGE.includes(u.role)) return true;
  return !!u.class_name && u.class_name === className;
}

interface FacePerson {
  login: string;
  full_name: string;
  class_name: string;
  telegram_id: number | null;
  kind: "student" | "staff";
}

async function findPerson(login: string, mid: number | null = null): Promise<FacePerson | null> {
  const u = await queryOne<{ full_name: string; class_name: string; telegram_id: number | null }>(
    "SELECT full_name, class_name, telegram_id FROM users WHERE login = $1 AND ($2::int IS NULL OR maktab_id = $2)",
    [login, mid],
  );
  if (u) return { login, full_name: u.full_name, class_name: u.class_name, telegram_id: u.telegram_id, kind: "student" };
  const s = await queryOne<{ full_name: string; telegram_id: number | null }>(
    "SELECT full_name, telegram_id FROM staff WHERE login = $1 AND ($2::int IS NULL OR maktab_id = $2)",
    [login, mid],
  );
  if (s) return { login, full_name: s.full_name, class_name: STAFF_GROUP, telegram_id: s.telegram_id, kind: "staff" };
  return null;
}

// Arxiv jadvali (idempotent). archived: true = arxivda, false = faol (qo'lda tiklangan).
// Yozuv yo'q bo'lsa — standart: Face ID aniqlagan bo'lsa arxivda, bo'lmasa faolda.
void query(`
  CREATE TABLE IF NOT EXISTS face_today_archive (
    student_login TEXT NOT NULL,
    date          DATE NOT NULL,
    archived      BOOLEAN NOT NULL,
    by_name       TEXT NOT NULL DEFAULT '',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_login, date)
  );
`).catch((err) => logger.error({ err }, "face_today_archive jadvalini yaratishda xato"));

// GET /api/faceid/today-list?class_name= — bir sinf (yoki "Xodimlar") uchun bugungi holat
// Har qator: archived (arxivda bo'lsa true), face_seen (Face ID aniqlagan bo'lsa true)
router.get("/faceid/today-list", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const className = String(req.query["class_name"] ?? "");
  if (!className) { res.status(400).json({ error: "class_name kerak" }); return; }
  if (!canTouchClass(u, className)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }

  const today = uzDateStr();
  const mid = schoolOf(u);
  const isStaff = className === STAFF_GROUP;
  const where = isStaff
    ? (mid !== null ? "WHERE s.maktab_id = $2" : "")
    : (mid !== null ? "WHERE s.class_name = $2 AND s.maktab_id = $3" : "WHERE s.class_name = $2");
  const params: unknown[] = isStaff
    ? (mid !== null ? [today, mid] : [today])
    : (mid !== null ? [today, className, mid] : [today, className]);

  const sql =
    `SELECT s.login, s.full_name,
            to_char(fc.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
            fc.status,
            to_char(fc.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS "left",
            COALESCE(fc.left_early, false) AS early,
            COALESCE(fc.excused, false) AS excused,
            (fc.student_login IS NOT NULL AND fc.device <> 'manual') AS face_seen,
            fta.archived AS archived_override,
            (ch.student_login IS NOT NULL) AS chronic
       FROM ${isStaff ? "staff" : "users"} s
       LEFT JOIN face_checkins fc ON fc.student_login = s.login AND fc.date = $1::date
       LEFT JOIN face_today_archive fta ON fta.student_login = s.login AND fta.date = $1::date
       LEFT JOIN face_chronic ch ON ch.student_login = s.login AND (ch.until IS NULL OR ch.until >= $1::date)
      ${where}
      ORDER BY s.full_name`;

  try {
    const raw = await query<{
      login: string;
      full_name: string;
      arrived: string | null;
      status: string | null;
      left: string | null;
      early: boolean;
      excused: boolean;
      face_seen: boolean;
      archived_override: boolean | null;
      chronic: boolean;
    }>(sql, params);

    const rows = raw.map(({ archived_override, ...r }) => ({
      ...r,
      archived: archived_override ?? r.face_seen,
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: `Bugungi ro'yxatni yuklab bo'lmadi: ${(err as Error).message}` });
  }
});

// POST /api/faceid/today-archive { student_login, archived: true | false | null }
//  true  → arxivga o'tkazadi (faol ro'yxatdan chiqadi)
//  false → arxivdan faol ro'yxatga qaytaradi (tuzatish uchun)
//  null  → standart holatga qaytaradi
router.post("/faceid/today-archive", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const { student_login, archived } = req.body as { student_login?: string; archived?: boolean | null };
  if (!student_login || (archived !== true && archived !== false && archived !== null)) {
    res.status(400).json({ error: "Noto'g'ri so'rov" });
    return;
  }

  try {
    const mid = schoolOf(u);
    const person = await findPerson(student_login, mid);
    if (!person) { res.status(404).json({ error: "Topilmadi" }); return; }
    if (!canTouchClass(u, person.class_name)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }

    const today = uzDateStr();
    const byName = String(u.full_name ?? u.login ?? "").trim();

    if (archived === null) {
      await query("DELETE FROM face_today_archive WHERE student_login = $1 AND date = $2::date", [student_login, today]);
    } else {
      await query(
        `INSERT INTO face_today_archive (student_login, date, archived, by_name, updated_at)
         VALUES ($1, $2::date, $3, $4, NOW())
         ON CONFLICT (student_login, date) DO UPDATE SET
           archived = EXCLUDED.archived, by_name = EXCLUDED.by_name, updated_at = NOW()`,
        [student_login, today, archived, byName],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
