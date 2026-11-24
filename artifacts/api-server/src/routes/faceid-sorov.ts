// Face ID — sababli kelmaslik (1 kun oldindan) va dars vaqtida ketish so'rovi.
// Ruxsat so'rovi tasdiqlanmaguncha ketish hisoblanmaydi. Tasdiqlovchi: director, zavuch, zam_direktor (MMTB).
import { Router, type IRouter, type Request } from "express";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { uzDateStr } from "../lib/tg-shared.js";
import { MANAGE, CLASS_ROLES } from "./faceid-hisobot.js";

const router: IRouter = Router();
const APPROVERS = ["director", "zavuch", "zam_direktor"];

type AuthUser = Record<string, unknown> & { role: string; login: string; full_name?: string };

function authAny(req: Request, roles: string[]): AuthUser | null {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u || !roles.includes(String(u.role))) return null;
  return u;
}

function addDays(d: string, n: number): string {
  const t = new Date(d + "T00:00:00");
  t.setDate(t.getDate() + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// O'quvchi shu foydalanuvchining sinfida va shu maktabda ekanini tekshiradi
async function studentFor(u: AuthUser, login: string, mid: number) {
  const st = await queryOne<{ full_name: string; class_name: string }>(
    "SELECT full_name, class_name FROM users WHERE login = $1 AND maktab_id = $2",
    [login, mid]
  );
  if (!st) return { error: "O'quvchi topilmadi", code: 404 } as const;
  if (!MANAGE.includes(String(u.role)) && String(u["class_name"] ?? "") !== st.class_name) {
    return { error: "Bu o'quvchi sizning sinfingizda emas", code: 403 } as const;
  }
  return { st } as const;
}

// POST /api/faceid/absence-notice — {student_login, date?, reason}  (bugun yoki ertaga)
router.post("/faceid/absence-notice", async (req, res): Promise<void> => {
  const u = authAny(req, [...MANAGE, ...CLASS_ROLES]);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { student_login, date, reason } = (req.body ?? {}) as { student_login?: string; date?: string; reason?: string };
  const mid = schoolOf(u) ?? 3;
  const today = uzDateStr();
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : addDays(today, 1);
  if (d !== today && d !== addDays(today, 1)) {
    res.status(400).json({ error: "Sababli belgilash faqat bugun yoki ertaga uchun" }); return;
  }
  const r = String(reason ?? "").trim().slice(0, 300);
  if (!student_login || !r) { res.status(400).json({ error: "O'quvchi va sabab kerak" }); return; }
  const chk = await studentFor(u, student_login, mid);
  if ("error" in chk) { res.status(chk.code).json({ error: chk.error }); return; }
  try {
    await query(
      `INSERT INTO absence_notices (student_login, date, reason, created_by, maktab_id)
       VALUES ($1, $2::date, $3, $4, $5)
       ON CONFLICT (student_login, date) DO UPDATE SET reason = EXCLUDED.reason, created_by = EXCLUDED.created_by`,
      [student_login, d, r, String(u.full_name ?? u.login), mid]
    );
    res.json({ ok: true, date: d });
  } catch (err) {
    logger.error({ err }, "absence-notice");
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/faceid/exit-request — {student_login, leave_time HH:MM, reason} (faqat bugun)
router.post("/faceid/exit-request", async (req, res): Promise<void> => {
  const u = authAny(req, [...MANAGE, ...CLASS_ROLES]);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { student_login, leave_time, reason } = (req.body ?? {}) as { student_login?: string; leave_time?: string; reason?: string };
  const mid = schoolOf(u) ?? 3;
  const r = String(reason ?? "").trim().slice(0, 300);
  if (!student_login || !r || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(leave_time ?? ""))) {
    res.status(400).json({ error: "O'quvchi, ketish vaqti (HH:MM) va sabab kerak" }); return;
  }
  const chk = await studentFor(u, student_login, mid);
  if ("error" in chk) { res.status(chk.code).json({ error: chk.error }); return; }
  try {
    await query(
      `INSERT INTO exit_requests (student_login, student_name, class_name, date, leave_time, reason, requested_by, maktab_id)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)`,
      [student_login, chk.st.full_name, chk.st.class_name, uzDateStr(), leave_time, r,
       String(u.full_name ?? u.login), mid]
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "exit-request");
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/faceid/exit-requests?date=YYYY-MM-DD — ro'yxat (tasdiqlovchi: hammasi; sinf rahbari: o'z sinfi)
router.get("/faceid/exit-requests", async (req, res): Promise<void> => {
  const u = authAny(req, [...APPROVERS, ...MANAGE, ...CLASS_ROLES]);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const q = String(req.query["date"] ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : uzDateStr();
  const mid = schoolOf(u) ?? 3;
  const onlyClass = MANAGE.includes(String(u.role)) || APPROVERS.includes(String(u.role)) ? null : String(u["class_name"] ?? "");
  try {
    const rows = await query(
      `SELECT id, student_login, student_name, class_name, to_char(date, 'YYYY-MM-DD') AS date,
              leave_time, reason, requested_by, status, decided_by,
              to_char(decided_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS decided_time
         FROM exit_requests
        WHERE maktab_id = $1 AND date = $2::date AND ($3::text IS NULL OR class_name = $3)
        ORDER BY created_at DESC`,
      [mid, date, onlyClass]
    );
    res.json({ date, can_decide: APPROVERS.includes(String(u.role)), requests: rows });
  } catch (err) {
    logger.error({ err }, "exit-requests");
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/faceid/exit-request/:id/decide — {approve: boolean}  (faqat tasdiqlovchilar)
router.post("/faceid/exit-request/:id/decide", async (req, res): Promise<void> => {
  const u = authAny(req, APPROVERS);
  if (!u) { res.status(403).json({ error: "Faqat direktor, zavuch yoki MMTB tasdiqlaydi" }); return; }
  const id = Number(req.params["id"]);
  const approve = Boolean((req.body ?? {}).approve);
  const mid = schoolOf(u) ?? 3;
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }
  try {
    const rows = await query(
      `UPDATE exit_requests SET status = $1, decided_by = $2, decided_at = NOW()
        WHERE id = $3 AND maktab_id = $4 AND status = 'pending' RETURNING id`,
      [approve ? "approved" : "rejected", String(u.full_name ?? u.login), id, mid]
    );
    if (rows.length === 0) { res.status(404).json({ error: "So'rov topilmadi yoki allaqachon qaror qilingan" }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "exit-request decide");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
