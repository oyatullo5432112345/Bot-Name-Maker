import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";

const router: IRouter = Router();

// GET /api/teacher-subjects
router.get("/teacher-subjects", async (req, res): Promise<void> => {
  const class_id = req.query["class_id"] as string | undefined;
  const teacher_id = req.query["teacher_id"] as string | undefined;

  let sql = "SELECT id, teacher_id, class_id, subject, created_at FROM teacher_subjects";
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (class_id) { conditions.push(`class_id = $${params.length + 1}`); params.push(class_id); }
  if (teacher_id) { conditions.push(`teacher_id = $${params.length + 1}`); params.push(teacher_id); }

  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY subject";

  try {
    const data = await query(sql, params);

    const enriched = await Promise.all(
      data.map(async (row: Record<string, unknown>) => {
        const [staff, cls] = await Promise.all([
          queryOne<{ full_name: string; role: string }>(
            "SELECT full_name, role FROM staff WHERE id = $1", [row["teacher_id"]]
          ),
          queryOne<{ name: string }>(
            "SELECT name FROM classes WHERE id = $1", [row["class_id"]]
          ),
        ]);
        return {
          ...row,
          teacher_name: staff?.full_name ?? null,
          teacher_role: staff?.role ?? null,
          class_name: cls?.name ?? null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/teacher-subjects
router.post("/teacher-subjects", async (req, res): Promise<void> => {
  const { teacher_id, class_id, subject } = req.body as {
    teacher_id?: string; class_id?: string; subject?: string;
  };

  if (!teacher_id || !class_id || !subject?.trim()) {
    res.status(400).json({ error: "teacher_id, class_id va subject kerak" });
    return;
  }

  try {
    const data = await queryOne(
      `INSERT INTO teacher_subjects (teacher_id, class_id, subject)
       VALUES ($1, $2, $3) RETURNING *`,
      [teacher_id, class_id, subject.trim()]
    );
    res.status(201).json(data);
  } catch (err) {
    const e = err as { code?: string; message: string };
    if (e.code === "23505") {
      res.status(409).json({ error: "Bu o'qituvchi bu sinfga bu fandan allaqachon biriktirilgan" });
      return;
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/teacher-subjects/:id
router.delete("/teacher-subjects/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    await query("DELETE FROM teacher_subjects WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
