import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
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
  const [studentsRes, classesRes, staffRes, studentsByClassRes] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("staff").select("*", { count: "exact", head: true }),
    supabase.from("users").select("class_name"),
  ]);

  // Students by class grouping
  const classCounts: Record<string, number> = {};
  if (studentsByClassRes.data) {
    for (const row of studentsByClassRes.data as { class_name: string }[]) {
      classCounts[row.class_name] = (classCounts[row.class_name] ?? 0) + 1;
    }
  }

  const students_by_class = Object.entries(classCounts)
    .map(([class_name, count]) => ({ class_name, count }))
    .sort((a, b) => a.class_name.localeCompare(b.class_name));

  res.json(
    GetDashboardStatsResponse.parse({
      total_students: studentsRes.count ?? 0,
      total_classes: classesRes.count ?? 0,
      total_staff: staffRes.count ?? 0,
      days_until_launch: getDaysUntilSeptember(),
      students_by_class,
    })
  );
});

// GET /api/dashboard/my-class
router.get("/dashboard/my-class", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    return;
  }

  const class_name = user.class_name as string | null;
  const class_id = user.class_id as string | null;

  if (!class_name) {
    res.json(
      GetMyClassResponse.parse({
        class_name: "",
        class_id: null,
        students: [],
      })
    );
    return;
  }

  const { data: students } = await supabase
    .from("users")
    .select("*")
    .eq("class_name", class_name)
    .order("full_name");

  res.json(
    GetMyClassResponse.parse({
      class_name,
      class_id,
      students: students ?? [],
    })
  );
});

export default router;
