import { Router, type IRouter } from "express";
import { query, queryCount } from "../lib/db.js";
import { GetDashboardStatsResponse, GetMyClassResponse } from "@workspace/api-zod";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

function getDaysUntilSeptember(): number {
  const today = new Date();
  const target = new Date("2026-09-05");
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// GET /api/dashboard/stats
router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  try {
    const [total_students, total_classes, total_staff, classRows] = await Promise.all([
      queryCount("SELECT COUNT(*) FROM users"),
      queryCount("SELECT COUNT(*) FROM classes"),
      queryCount("SELECT COUNT(*) FROM staff"),
      query<{ class_name: string }>("SELECT class_name FROM users"),
    ]);

    const classCounts: Record<string, number> = {};
    for (const row of classRows) {
      classCounts[row.class_name] = (classCounts[row.class_name] ?? 0) + 1;
    }

    const students_by_class = Object.entries(classCounts)
      .map(([class_name, count]) => ({ class_name, count }))
      .sort((a, b) => a.class_name.localeCompare(b.class_name));

    res.json(GetDashboardStatsResponse.parse({
      total_students,
      total_classes,
      total_staff,
      days_until_launch: getDaysUntilSeptember(),
      students_by_class,
    }));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/dashboard/my-class
router.get("/dashboard/my-class", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    return;
  }

  const class_name = user["class_name"] as string | null;
  const class_id = user["class_id"] as string | null;

  if (!class_name) {
    res.json(GetMyClassResponse.parse({ class_name: "", class_id: null, students: [] }));
    return;
  }

  try {
    const students = await query("SELECT * FROM users WHERE class_name = $1 ORDER BY full_name", [class_name]);
    res.json(GetMyClassResponse.parse({ class_name, class_id, students }));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
