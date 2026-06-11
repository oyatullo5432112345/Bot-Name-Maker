import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

export const DAY_NAMES: Record<number, string> = {
  1: "Dushanba", 2: "Seshanba", 3: "Chorshanba",
  4: "Payshanba", 5: "Juma", 6: "Shanba",
};

export const PERIOD_TIMES: Record<number, string> = {
  1: "08:00 - 08:45", 2: "08:55 - 09:40", 3: "09:50 - 10:35",
  4: "10:55 - 11:40", 5: "11:50 - 12:35", 6: "12:45 - 13:30",
  7: "13:40 - 14:25", 8: "14:35 - 15:20",
};

async function enrichEntry(entry: {
  id: string; class_id: string; day_of_week: number;
  period: number; subject: string; teacher_id: string | null; created_at: string;
}) {
  let teacher_name: string | null = null;
  let class_name: string | null = null;

  if (entry.teacher_id) {
    const staff = await queryOne<{ full_name: string }>(
      "SELECT full_name FROM staff WHERE id = $1", [entry.teacher_id]
    );
    teacher_name = staff?.full_name ?? null;
  }

  const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [entry.class_id]);
  class_name = cls?.name ?? null;

  return {
    ...entry,
    teacher_name,
    class_name,
    day_name: DAY_NAMES[entry.day_of_week] ?? "",
    period_time: PERIOD_TIMES[entry.period] ?? "",
  };
}

// GET /api/timetable
router.get("/timetable", requireAuth, async (req, res): Promise<void> => {
  const class_id = req.query["class_id"] as string | undefined;
  const teacher_id = req.query["teacher_id"] as string | undefined;

  try {
    let sql = "SELECT * FROM timetable";
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (class_id) { conditions.push(`class_id = $${params.length + 1}`); params.push(class_id); }
    if (teacher_id) { conditions.push(`teacher_id = $${params.length + 1}`); params.push(teacher_id); }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY day_of_week, period";

    const data = await query(sql, params);
    const enriched = await Promise.all((data).map(enrichEntry));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/timetable
router.post("/timetable", requireAuth, async (req, res): Promise<void> => {
  const { class_id, day_of_week, period, subject, teacher_id } = req.body as {
    class_id?: string; day_of_week?: number; period?: number;
    subject?: string; teacher_id?: string | null;
  };

  if (!class_id || !day_of_week || !period || !subject?.trim()) {
    res.status(400).json({ error: "class_id, day_of_week, period va subject kerak" });
    return;
  }
  if (day_of_week < 1 || day_of_week > 6 || period < 1 || period > 8) {
    res.status(400).json({ error: "Noto'g'ri kun yoki dars raqami" });
    return;
  }

  try {
    const data = await queryOne<{
      id: string; class_id: string; day_of_week: number;
      period: number; subject: string; teacher_id: string | null; created_at: string;
    }>(
      `INSERT INTO timetable (class_id, day_of_week, period, subject, teacher_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (class_id, day_of_week, period)
       DO UPDATE SET subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id
       RETURNING *`,
      [class_id, day_of_week, period, subject.trim(), teacher_id ?? null]
    );

    const enriched = await enrichEntry(data!);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/timetable/:id
router.put("/timetable/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { subject, teacher_id } = req.body as { subject?: string; teacher_id?: string | null };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (subject?.trim()) { setClauses.push(`subject = $${idx++}`); values.push(subject.trim()); }
  if (teacher_id !== undefined) { setClauses.push(`teacher_id = $${idx++}`); values.push(teacher_id); }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }

  values.push(id);
  const data = await queryOne<{
    id: string; class_id: string; day_of_week: number;
    period: number; subject: string; teacher_id: string | null; created_at: string;
  }>(
    `UPDATE timetable SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (!data) {
    res.status(404).json({ error: "Yozuv topilmadi" });
    return;
  }

  const enriched = await enrichEntry(data);
  res.json(enriched);
});

// DELETE /api/timetable/:id
router.delete("/timetable/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    await query("DELETE FROM timetable WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
