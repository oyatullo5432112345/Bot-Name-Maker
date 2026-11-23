// Face ID — doimiy arxiv va kunlik hisobot.
// Mustaqil router: faceid.ts ga TEGILMAYDI.
// face_checkins har yozilganda (INSERT/UPDATE) trigger uni face_checkins_arxiv ga nusxalaydi.
// Arxivdan hech narsa o'chirilmaydi: jonli jadvaldan o'chirish arxivga ta'sir qilmaydi.

import { Router, type IRouter, type Request } from "express";
import { query } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { uzDateStr } from "../lib/tg-shared.js";

const router: IRouter = Router();
const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];

type AuthUser = Record<string, unknown> & { role: string; login: string };

function authAs(req: Request): AuthUser | null {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u || !MANAGE.includes(String(u.role))) return null;
  return u;
}

const COLS = `student_login, student_name, class_name, date, checked_at, status, distance, device,
  left_at, left_early, excused, excuse_reason, excused_by, truant, club, maktab_id`;

// Arxiv jadvali, backfill va trigger — bir marta yaratiladi
async function initArchive(): Promise<void> {
  await query(`CREATE TABLE IF NOT EXISTS face_checkins_arxiv (
    student_login TEXT NOT NULL,
    student_name  TEXT NOT NULL DEFAULT '',
    class_name    TEXT NOT NULL DEFAULT '',
    date          DATE NOT NULL,
    checked_at    TIMESTAMPTZ,
    status        TEXT NOT NULL DEFAULT 'present',
    distance      REAL,
    device        TEXT NOT NULL DEFAULT '',
    left_at       TIMESTAMPTZ,
    left_early    BOOLEAN NOT NULL DEFAULT FALSE,
    excused       BOOLEAN NOT NULL DEFAULT FALSE,
    excuse_reason TEXT NOT NULL DEFAULT '',
    excused_by    TEXT NOT NULL DEFAULT '',
    truant        BOOLEAN NOT NULL DEFAULT FALSE,
    club          BOOLEAN NOT NULL DEFAULT FALSE,
    maktab_id     INT NOT NULL DEFAULT 3,
    archived_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_login, date)
  )`);
  // Mavjud yozuvlarni bir marta arxivga ko'chirish (qayta ishga tushganda takrorlanmaydi)
  await query(`INSERT INTO face_checkins_arxiv (${COLS})
    SELECT ${COLS} FROM face_checkins
    ON CONFLICT (student_login, date) DO NOTHING`);
  await query(`CREATE OR REPLACE FUNCTION face_checkins_to_arxiv() RETURNS trigger AS $fn$
  BEGIN
    INSERT INTO face_checkins_arxiv (${COLS}) VALUES (
      NEW.student_login, NEW.student_name, NEW.class_name, NEW.date, NEW.checked_at, NEW.status,
      NEW.distance, NEW.device, NEW.left_at, NEW.left_early, NEW.excused, NEW.excuse_reason,
      NEW.excused_by, NEW.truant, NEW.club, NEW.maktab_id)
    ON CONFLICT (student_login, date) DO UPDATE SET
      student_name = EXCLUDED.student_name, class_name = EXCLUDED.class_name,
      checked_at = EXCLUDED.checked_at, status = EXCLUDED.status, distance = EXCLUDED.distance,
      device = EXCLUDED.device, left_at = EXCLUDED.left_at, left_early = EXCLUDED.left_early,
      excused = EXCLUDED.excused, excuse_reason = EXCLUDED.excuse_reason,
      excused_by = EXCLUDED.excused_by, truant = EXCLUDED.truant, club = EXCLUDED.club,
      maktab_id = EXCLUDED.maktab_id, archived_at = NOW();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql`);
  await query("DROP TRIGGER IF EXISTS trg_face_checkins_arxiv ON face_checkins");
  await query(`CREATE TRIGGER trg_face_checkins_arxiv AFTER INSERT OR UPDATE ON face_checkins
    FOR EACH ROW EXECUTE FUNCTION face_checkins_to_arxiv()`);
}

// faceid.ts jadvalni yaratib bo'lishini kutamiz (20 marta, har 1.5 soniyada)
(async () => {
  for (let i = 0; i < 20; i++) {
    try { await initArchive(); return; }
    catch (err) {
      if (i === 19) logger.error({ err }, "face_checkins_arxiv yaratishda xato");
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
})();

interface HisobotRow {
  login: string;
  full_name: string;
  class_name: string;
  arrived_time: string | null;
  left_time: string | null;
  status: string;
  left_early: boolean;
  excused: boolean;
  excuse_reason: string;
  excused_by: string;
}

// GET /api/faceid/hisobot?date=YYYY-MM-DD — bir kunlik hisobot (arxivdan)
router.get("/faceid/hisobot", async (req, res): Promise<void> => {
  const u = authAs(req);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const q = String(req.query["date"] ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : uzDateStr();
  const mid = schoolOf(u) ?? 3;
  try {
    const rows = await query<HisobotRow>(
      `SELECT u.login, u.full_name, u.class_name,
              to_char(fa.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived_time,
              to_char(fa.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS left_time,
              COALESCE(fa.status, '') AS status,
              COALESCE(fa.left_early, FALSE) AS left_early,
              COALESCE(fa.excused, FALSE) AS excused,
              COALESCE(fa.excuse_reason, '') AS excuse_reason,
              COALESCE(fa.excused_by, '') AS excused_by
         FROM users u
         LEFT JOIN face_checkins_arxiv fa ON fa.student_login = u.login AND fa.date = $1::date
        WHERE u.role = 'student' AND u.maktab_id = $2 AND u.class_name <> ''
        ORDER BY u.class_name, u.full_name`,
      [date, mid]
    );

    const total = rows.length;
    const arrived = rows.filter((r) => r.arrived_time).length;
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
    const classMap = new Map<string, { class_name: string; total: number; arrived: number }>();
    for (const r of rows) {
      const c = classMap.get(r.class_name) ?? { class_name: r.class_name, total: 0, arrived: 0 };
      c.total += 1;
      if (r.arrived_time) c.arrived += 1;
      classMap.set(r.class_name, c);
    }
    res.json({
      date,
      summary: {
        total,
        arrived,
        percent: pct(arrived, total),
        late: rows.filter((r) => r.status === "late").length,
        left: rows.filter((r) => r.left_time).length,
        left_early: rows.filter((r) => r.left_early).length,
        excused_absent: rows.filter((r) => !r.arrived_time && r.excused).length,
        unexcused_absent: rows.filter((r) => !r.arrived_time && !r.excused).length,
      },
      classes: [...classMap.values()].map((c) => ({ ...c, percent: pct(c.arrived, c.total) })),
      students: rows,
    });
  } catch (err) {
    logger.error({ err }, "faceid/hisobot");
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/faceid/oquvchi?login=&from=YYYY-MM-DD&to=YYYY-MM-DD — o'quvchi profili tarixi (arxivdan)
// Faqat yozilgan kunlar hisoblanadi. Boshqaruv — hamma o'quvchi; sinf rahbari — faqat o'z sinfi.
interface ProfileRow {
  date: string;
  arrived_time: string | null;
  left_time: string | null;
  status: string;
  left_early: boolean;
  excused: boolean;
  excuse_reason: string;
  excused_by: string;
}
router.get("/faceid/oquvchi", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  const CLASS_ROLES = ["sinf_rahbari", "boshlangich_oqituvchi"];
  if (!u || ![...MANAGE, ...CLASS_ROLES].includes(String(u.role))) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }
  const login = String(req.query["login"] ?? "");
  if (!login) { res.status(400).json({ error: "login kerak" }); return; }
  const mid = schoolOf(u) ?? 3;
  const today = uzDateStr();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query["from"] ?? "")) ? String(req.query["from"]) : "2000-01-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query["to"] ?? "")) ? String(req.query["to"]) : today;
  try {
    const st = await query<{ full_name: string; class_name: string }>(
      "SELECT full_name, class_name FROM users WHERE login = $1 AND role = 'student' AND maktab_id = $2",
      [login, mid]
    );
    if (!st[0]) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
    if (!MANAGE.includes(String(u.role)) && String(u["class_name"] ?? "") !== st[0].class_name) {
      res.status(403).json({ error: "Bu o'quvchi sizning sinfingizda emas" }); return;
    }
    const rows = await query<ProfileRow>(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date,
              to_char(checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived_time,
              to_char(left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS left_time,
              COALESCE(status, '') AS status,
              COALESCE(left_early, FALSE) AS left_early,
              COALESCE(excused, FALSE) AS excused,
              COALESCE(excuse_reason, '') AS excuse_reason,
              COALESCE(excused_by, '') AS excused_by
         FROM face_checkins_arxiv
        WHERE student_login = $1 AND date >= $2::date AND date <= $3::date
        ORDER BY date DESC`,
      [login, from, to]
    );
    const arrived = rows.filter((r) => r.arrived_time).length;
    // Dars jadvali bo'yicha: har kunning darslar soni (sinf va hafta kuni bo'yicha)
    const lessonRows = await query<{ dow: number; n: number }>(
      `SELECT t.day_of_week AS dow, COUNT(*)::int AS n
         FROM timetable t JOIN classes c ON c.id = t.class_id
        WHERE c.name = $1 AND c.maktab_id = $2
        GROUP BY t.day_of_week`,
      [st[0].class_name, mid]
    );
    const lessonsOn = new Map(lessonRows.map((r) => [Number(r.dow), Number(r.n)]));
    const lessonsFor = (d: string) => lessonsOn.get(new Date(d + "T00:00:00").getDay()) ?? 0;
    const absentRows = rows.filter((r) => !r.arrived_time);
    const hoursMissed = absentRows.reduce((sum, r) => sum + lessonsFor(r.date), 0);
    const hoursExcused = absentRows.filter((r) => r.excused).reduce((sum, r) => sum + lessonsFor(r.date), 0);
    res.json({
      login,
      full_name: st[0].full_name,
      class_name: st[0].class_name,
      from,
      to,
      summary: {
        days: rows.length,
        arrived,
        late: rows.filter((r) => r.status === "late").length,
        left_early: rows.filter((r) => r.left_early).length,
        excused_absent: rows.filter((r) => !r.arrived_time && r.excused).length,
        unexcused_absent: rows.filter((r) => !r.arrived_time && !r.excused).length,
        hours_missed: hoursMissed,
        hours_excused: hoursExcused,
        hours_unexcused: hoursMissed - hoursExcused,
      },
      rows,
    });
  } catch (err) {
    logger.error({ err }, "faceid/oquvchi");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
