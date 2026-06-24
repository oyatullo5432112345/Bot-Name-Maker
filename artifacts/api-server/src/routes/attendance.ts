import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, getAuthUser } from "./auth.js";

const router: IRouter = Router();

// GET /api/attendance?class_id=&date= — sinfning bir kunlik davomati
router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = getAuthUser(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

    const { class_id, date, student_login } = req.query as Record<string, string>;

    if (student_login) {
      const rows = await query(
        `SELECT date, status, note, teacher_login
         FROM attendance
         WHERE student_login = $1
         ORDER BY date DESC
         LIMIT 90`,
        [student_login]
      );
      res.json(rows);
      return;
    }

    if (!class_id || !date) {
      res.status(400).json({ error: "class_id va date kerak" });
      return;
    }

    const rows = await query(
      `SELECT id, student_login, student_name, status, note, teacher_login
       FROM attendance
       WHERE class_id = $1 AND date = $2
       ORDER BY student_name`,
      [class_id, date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/attendance/stats — o'quvchining oy bo'yicha davomati
router.get("/attendance/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = getAuthUser(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

    const { class_id, month, year } = req.query as Record<string, string>;
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();

    let rows;
    if (class_id) {
      rows = await query(
        `SELECT
           student_login, student_name,
           COUNT(*) FILTER (WHERE status = 'present') AS present_count,
           COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
           COUNT(*) FILTER (WHERE status = 'late') AS late_count,
           COUNT(*) FILTER (WHERE status = 'excused') AS excused_count,
           COUNT(*) AS total_days
         FROM attendance
         WHERE class_id = $1
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3
         GROUP BY student_login, student_name
         ORDER BY student_name`,
        [class_id, m, y]
      );
    } else {
      const login = user.login;
      rows = await query(
        `SELECT
           EXTRACT(MONTH FROM date)::int AS month,
           EXTRACT(YEAR FROM date)::int AS year,
           COUNT(*) FILTER (WHERE status = 'present') AS present_count,
           COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
           COUNT(*) AS total_days
         FROM attendance
         WHERE student_login = $1
         GROUP BY month, year
         ORDER BY year DESC, month DESC
         LIMIT 12`,
        [login]
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/attendance — davomat saqlash (batch upsert)
router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = getAuthUser(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

    const allowed = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];
    if (!allowed.includes(user.role)) {
      res.status(403).json({ error: "Davomat kiritish uchun ruxsat yo'q" });
      return;
    }

    const { class_id, class_name, date, records } = req.body as {
      class_id: string;
      class_name: string;
      date: string;
      records: Array<{ student_login: string; student_name: string; status: string; note?: string }>;
    };

    if (!class_id || !date || !Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: "class_id, date va records kerak" });
      return;
    }

    for (const rec of records) {
      await query(
        `INSERT INTO attendance (class_id, class_name, student_login, student_name, date, status, note, teacher_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_login, date)
         DO UPDATE SET status = $6, note = $7, teacher_login = $8`,
        [class_id, class_name, rec.student_login, rec.student_name, date, rec.status || "present", rec.note || "", user.login]
      );
    }

    res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
