import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";

const router: IRouter = Router();

export const DAY_NAMES: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
};

export const PERIOD_TIMES: Record<number, string> = {
  1: "08:00 - 08:45",
  2: "08:55 - 09:40",
  3: "09:50 - 10:35",
  4: "10:55 - 11:40",
  5: "11:50 - 12:35",
  6: "12:45 - 13:30",
  7: "13:40 - 14:25",
  8: "14:35 - 15:20",
};

async function enrichEntry(entry: {
  id: string;
  class_id: string;
  day_of_week: number;
  period: number;
  subject: string;
  teacher_id: string | null;
  created_at: string;
}) {
  let teacher_name: string | null = null;
  let class_name: string | null = null;

  if (entry.teacher_id) {
    const { data: staff } = await supabase
      .from("staff")
      .select("full_name")
      .eq("id", entry.teacher_id)
      .single();
    teacher_name = staff?.full_name ?? null;
  }

  const { data: cls } = await supabase
    .from("classes")
    .select("name")
    .eq("id", entry.class_id)
    .single();
  class_name = cls?.name ?? null;

  return {
    ...entry,
    teacher_name,
    class_name,
    day_name: DAY_NAMES[entry.day_of_week] ?? "",
    period_time: PERIOD_TIMES[entry.period] ?? "",
  };
}

// GET /api/timetable?class_id=xxx  YOKI  ?teacher_id=xxx
router.get("/timetable", async (req, res): Promise<void> => {
  const class_id = req.query["class_id"] as string | undefined;
  const teacher_id = req.query["teacher_id"] as string | undefined;

  let query = supabase
    .from("timetable")
    .select("*")
    .order("day_of_week")
    .order("period");

  if (class_id) query = query.eq("class_id", class_id);
  if (teacher_id) query = query.eq("teacher_id", teacher_id);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const enriched = await Promise.all((data ?? []).map(enrichEntry));
  res.json(enriched);
});

// POST /api/timetable
router.post("/timetable", async (req, res): Promise<void> => {
  const { class_id, day_of_week, period, subject, teacher_id } = req.body as {
    class_id?: string;
    day_of_week?: number;
    period?: number;
    subject?: string;
    teacher_id?: string | null;
  };

  if (!class_id || !day_of_week || !period || !subject?.trim()) {
    res.status(400).json({ error: "class_id, day_of_week, period va subject kerak" });
    return;
  }
  if (day_of_week < 1 || day_of_week > 6 || period < 1 || period > 8) {
    res.status(400).json({ error: "Noto'g'ri kun yoki dars raqami" });
    return;
  }

  const { data, error } = await supabase
    .from("timetable")
    .upsert(
      [{
        class_id,
        day_of_week,
        period,
        subject: subject.trim(),
        teacher_id: teacher_id ?? null,
      }],
      { onConflict: "class_id,day_of_week,period" }
    )
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const enriched = await enrichEntry(data as Parameters<typeof enrichEntry>[0]);
  res.status(201).json(enriched);
});

// PUT /api/timetable/:id
router.put("/timetable/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { subject, teacher_id } = req.body as {
    subject?: string;
    teacher_id?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (subject?.trim()) updates.subject = subject.trim();
  if (teacher_id !== undefined) updates.teacher_id = teacher_id;

  const { data, error } = await supabase
    .from("timetable")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Yozuv topilmadi" });
    return;
  }

  const enriched = await enrichEntry(data as Parameters<typeof enrichEntry>[0]);
  res.json(enriched);
});

// DELETE /api/timetable/:id
router.delete("/timetable/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { error } = await supabase.from("timetable").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.sendStatus(204);
});

export default router;
