import { Router, type IRouter } from "express";
import { query } from "../lib/db.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

// GET /api/reyting/students — top o'quvchilar (haftalik baholar bo'yicha)
router.get("/reyting/students", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rows = await query<{
      student_login: string; student_name: string; class_name: string;
      avg_grade: string; total_grades: string; fives: string;
    }>(
      `SELECT
         student_login,
         student_name,
         class_name,
         ROUND(AVG(grade)::numeric, 2) AS avg_grade,
         COUNT(*) AS total_grades,
         COUNT(*) FILTER (WHERE grade = 5) AS fives
       FROM grades
       WHERE created_at >= $1
       GROUP BY student_login, student_name, class_name
       HAVING COUNT(*) >= 1
       ORDER BY avg_grade DESC, fives DESC
       LIMIT 50`,
      [weekAgo.toISOString()]
    );

    res.json(rows.map((r, i) => ({
      rank: i + 1,
      student_login: r.student_login,
      student_name: r.student_name,
      class_name: r.class_name,
      avg_grade: parseFloat(r.avg_grade),
      total_grades: parseInt(r.total_grades),
      fives: parseInt(r.fives),
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reyting/classes — sinflar reytingi
router.get("/reyting/classes", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rows = await query<{
      class_name: string; avg_grade: string; total_grades: string; fives: string; student_count: string;
    }>(
      `SELECT
         class_name,
         ROUND(AVG(grade)::numeric, 2) AS avg_grade,
         COUNT(*) AS total_grades,
         COUNT(*) FILTER (WHERE grade = 5) AS fives,
         COUNT(DISTINCT student_login) AS student_count
       FROM grades
       WHERE created_at >= $1
       GROUP BY class_name
       HAVING COUNT(*) >= 1
       ORDER BY avg_grade DESC, fives DESC
       LIMIT 30`,
      [weekAgo.toISOString()]
    );

    res.json(rows.map((r, i) => ({
      rank: i + 1,
      class_name: r.class_name,
      avg_grade: parseFloat(r.avg_grade),
      total_grades: parseInt(r.total_grades),
      fives: parseInt(r.fives),
      student_count: parseInt(r.student_count),
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reyting/subjects — fan yulduzi (har fandan eng yuqori ball)
router.get("/reyting/subjects", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const rows = await query<{
      subject: string; student_login: string; student_name: string;
      class_name: string; avg_grade: string; total_grades: string;
    }>(
      `SELECT DISTINCT ON (subject)
         subject, student_login, student_name, class_name,
         ROUND(AVG(grade) OVER (PARTITION BY subject, student_login)::numeric, 2) AS avg_grade,
         COUNT(*) OVER (PARTITION BY subject, student_login) AS total_grades
       FROM grades
       WHERE created_at >= $1
       ORDER BY subject, avg_grade DESC`,
      [monthAgo.toISOString()]
    );

    res.json(rows.map(r => ({
      subject: r.subject,
      student_login: r.student_login,
      student_name: r.student_name,
      class_name: r.class_name,
      avg_grade: parseFloat(r.avg_grade),
      total_grades: parseInt(r.total_grades),
    })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reyting/my — o'quvchining o'z reytingi
router.get("/reyting/my", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") { res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return; }

  const login = user["login"] as string;

  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Monthly grades grouped by month
    const monthly = await query<{ month: string; avg_grade: string; count: string }>(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') AS month,
         ROUND(AVG(grade)::numeric, 2) AS avg_grade,
         COUNT(*) AS count
       FROM grades
       WHERE student_login = $1 AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month
       ORDER BY month ASC`,
      [login]
    );

    // My rank among all students this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rankRows = await query<{ student_login: string; avg_grade: string }>(
      `SELECT student_login, ROUND(AVG(grade)::numeric, 2) AS avg_grade
       FROM grades WHERE created_at >= $1
       GROUP BY student_login
       HAVING COUNT(*) >= 1
       ORDER BY avg_grade DESC`,
      [weekAgo.toISOString()]
    );

    const myRank = rankRows.findIndex(r => r.student_login === login) + 1;

    // Achievements calculation
    const allGrades = await query<{ grade: number; created_at: string }>(
      "SELECT grade, created_at FROM grades WHERE student_login = $1 ORDER BY created_at DESC",
      [login]
    );

    const total5s = allGrades.filter(g => g.grade === 5).length;
    const total = allGrades.length;
    const recentAvg = total > 0
      ? allGrades.slice(0, 10).reduce((s, g) => s + g.grade, 0) / Math.min(10, total)
      : 0;

    res.json({
      monthly: monthly.map(m => ({
        month: m.month,
        avg_grade: parseFloat(m.avg_grade),
        count: parseInt(m.count),
      })),
      rank: myRank || null,
      total_students: rankRows.length,
      total5s,
      total_grades: total,
      recent_avg: Math.round(recentAvg * 10) / 10,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reyting/achievements/:login
router.get("/reyting/achievements/:login", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const { login } = req.params as { login: string };

  try {
    const grades = await query<{ grade: number; subject: string; created_at: string }>(
      "SELECT grade, subject, created_at FROM grades WHERE student_login = $1 ORDER BY created_at ASC",
      [login]
    );

    const attendance = await query<{ status: string; date: string }>(
      "SELECT status, date FROM attendance WHERE student_login = $1 ORDER BY date DESC LIMIT 30",
      [login]
    );

    const total5s = grades.filter(g => g.grade === 5).length;
    const total = grades.length;
    const subjects = new Set(grades.map(g => g.subject)).size;
    const presentDays = attendance.filter(a => a.status === "present").length;

    // Consecutive present days
    let streak = 0;
    const sorted = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const a of sorted) {
      if (a.status === "present") streak++;
      else break;
    }

    const achievements = [
      { id: "first_five",    emoji: "🌟", title: "Birinchi 5",       desc: "Birinchi bor 5 baho oldi",               earned: total5s >= 1 },
      { id: "five_fives",    emoji: "⭐", title: "Besh yulduz",      desc: "5 ta beshlik baho oldi",                 earned: total5s >= 5 },
      { id: "fifty_fives",   emoji: "🏆", title: "50 ta beshlik",    desc: "50 ta beshlik baho oldi",               earned: total5s >= 50 },
      { id: "streak_3",      emoji: "🔥", title: "3 kun ketma-ket",  desc: "3 kun ketma-ket darsga keldi",          earned: streak >= 3 },
      { id: "streak_10",     emoji: "🔥", title: "10 kun ketma-ket", desc: "10 kun ketma-ket darsga keldi",         earned: streak >= 10 },
      { id: "all_subjects",  emoji: "📚", title: "Ko'p qirrali",     desc: "5 ta turli fandan baho oldi",            earned: subjects >= 5 },
      { id: "present_20",    emoji: "✅", title: "Faol o'quvchi",    desc: "Oxirgi 30 kunda 20 kun darsga keldi",   earned: presentDays >= 20 },
      { id: "grade_100",     emoji: "💯", title: "Yuz baho",         desc: "Jami 100 ta baho oldi",                 earned: total >= 100 },
    ];

    res.json({ achievements, streak, total5s, total_grades: total });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/reyting/export — PDF/Excel uchun ma'lumotlar
router.get("/reyting/export", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const role = user["role"] as string;
  if (!["admin", "director", "zam_direktor", "zavuch"].includes(role)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }

  const { type, class_name, month, year } = req.query as Record<string, string>;

  try {
    if (type === "grades") {
      let sql = "SELECT student_name, class_name, subject, grade, teacher_name, TO_CHAR(created_at, 'DD.MM.YYYY') as date FROM grades";
      const params: unknown[] = [];
      const where: string[] = [];
      if (class_name) { where.push(`class_name = $${params.length + 1}`); params.push(class_name); }
      if (month && year) {
        where.push(`EXTRACT(MONTH FROM created_at) = $${params.length + 1}`); params.push(parseInt(month));
        where.push(`EXTRACT(YEAR FROM created_at) = $${params.length + 1}`); params.push(parseInt(year));
      }
      if (where.length) sql += " WHERE " + where.join(" AND ");
      sql += " ORDER BY class_name, student_name, created_at DESC";
      const rows = await query(sql, params);
      res.json({ type: "grades", data: rows });
    } else if (type === "attendance") {
      let sql = "SELECT student_name, class_name, TO_CHAR(date, 'DD.MM.YYYY') as date, status, note FROM attendance";
      const params: unknown[] = [];
      const where: string[] = [];
      if (class_name) { where.push(`class_name = $${params.length + 1}`); params.push(class_name); }
      if (month && year) {
        where.push(`EXTRACT(MONTH FROM date) = $${params.length + 1}`); params.push(parseInt(month));
        where.push(`EXTRACT(YEAR FROM date) = $${params.length + 1}`); params.push(parseInt(year));
      }
      if (where.length) sql += " WHERE " + where.join(" AND ");
      sql += " ORDER BY date DESC, student_name";
      const rows = await query(sql, params);
      res.json({ type: "attendance", data: rows });
    } else if (type === "students") {
      const sql = class_name
        ? "SELECT full_name, class_name, login, phone_number, TO_CHAR(registration_date, 'DD.MM.YYYY') as reg_date FROM users WHERE class_name = $1 ORDER BY class_name, full_name"
        : "SELECT full_name, class_name, login, phone_number, TO_CHAR(registration_date, 'DD.MM.YYYY') as reg_date FROM users ORDER BY class_name, full_name";
      const rows = await query(sql, class_name ? [class_name] : []);
      res.json({ type: "students", data: rows });
    } else {
      res.status(400).json({ error: "type: grades | attendance | students kerak" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/birthdays — bugungi tug'ilgan kunlar
router.get("/birthdays/today", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const staffBdays = await query<{ full_name: string; role: string; birthday: string }>(
      `SELECT full_name, role, birthday FROM staff
       WHERE birthday IS NOT NULL
         AND EXTRACT(MONTH FROM birthday) = $1
         AND EXTRACT(DAY FROM birthday) = $2`,
      [month, day]
    );

    const studentBdays = await query<{ full_name: string; class_name: string; birthday: string }>(
      `SELECT full_name, class_name, birthday FROM users
       WHERE birthday IS NOT NULL
         AND EXTRACT(MONTH FROM birthday) = $1
         AND EXTRACT(DAY FROM birthday) = $2`,
      [month, day]
    );

    const people = [
      ...staffBdays.map(s => ({ full_name: s.full_name, type: "staff" as const, info: s.role })),
      ...studentBdays.map(s => ({ full_name: s.full_name, type: "student" as const, info: s.class_name })),
    ];

    res.json(people);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
