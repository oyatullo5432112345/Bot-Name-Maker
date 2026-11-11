// Dars jadvali ommaviy qo'shish: tahlil (preview) va saqlash (commit).
// Qator: sinf, kun, dars raqami, fan, o'qituvchi. Mavjud dars yangilanadi, takror qo'shilmaydi.

import { Router, type IRouter, type Request } from "express";
import { query } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const MAX_ROWS = 2000;
const DAYS: Record<string, number> = {
  dushanba: 1, seshanba: 2, chorshanba: 3, payshanba: 4, juma: 5, shanba: 6,
};

interface InRow {
  class_name?: unknown;
  day?: unknown;
  period?: unknown;
  subject?: unknown;
  teacher?: unknown;
}

export interface Analyzed {
  index: number;
  class_name: string;
  day: string;
  day_of_week: number | null;
  period: number | null;
  subject: string;
  teacher: string;
  status: "new" | "update" | "warning" | "rejected";
  reason: string;
}

function authAs(req: Request): Record<string, unknown> | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !MANAGE.includes(String(u["role"]))) return null;
  return u;
}

function norm(s: string): string {
  return s.replace(/[`ʻʼ’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function dayOf(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 6) return v;
  const s = norm(String(v ?? ""));
  if (/^[1-6]$/.test(s)) return Number(s);
  return DAYS[s] ?? null;
}

function readRows(body: unknown): InRow[] | null {
  const rows = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  return rows as InRow[];
}

function countOf(rows: Analyzed[]) {
  return {
    new: rows.filter((r) => r.status === "new").length,
    update: rows.filter((r) => r.status === "update").length,
    warning: rows.filter((r) => r.status === "warning").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };
}

async function analyze(input: InRow[], mid: number) {
  const classes = await query<{ id: string; name: string }>(
    "SELECT id, name FROM classes WHERE maktab_id = $1",
    [mid],
  );
  const classByName = new Map(classes.map((c) => [norm(c.name), c]));

  const staff = await query<{ id: string; full_name: string }>(
    "SELECT id, full_name FROM staff WHERE maktab_id = $1",
    [mid],
  );
  const staffByName = new Map(staff.map((s) => [norm(s.full_name), s.id]));

  const existing = await query<{ class_id: string; day_of_week: number; period: number }>(
    "SELECT class_id, day_of_week, period FROM timetable WHERE maktab_id = $1",
    [mid],
  );
  const existingKey = new Set(existing.map((e) => `${e.class_id}|${e.day_of_week}|${e.period}`));

  const seen = new Set<string>();

  const rows = input.map((r, index): Analyzed => {
    const cls = String(r.class_name ?? "").trim();
    const dayRaw = String(r.day ?? "").trim();
    const day = dayOf(r.day);
    const periodNum = Number(r.period);
    const period = Number.isInteger(periodNum) ? periodNum : null;
    const subject = String(r.subject ?? "").replace(/\s+/g, " ").trim();
    const teacher = String(r.teacher ?? "").replace(/\s+/g, " ").trim();
    const base = { index, class_name: cls, day: dayRaw, day_of_week: day, period, subject, teacher };

    const c = classByName.get(norm(cls));
    if (!c) return { ...base, status: "rejected", reason: `Sinf topilmadi: "${cls}"` };
    if (day === null) return { ...base, status: "rejected", reason: "Kun noto'g'ri" };
    if (period === null || period < 1 || period > 8) {
      return { ...base, status: "rejected", reason: "Dars raqami 1–8 oralig'ida bo'lishi kerak" };
    }
    if (!subject) return { ...base, status: "rejected", reason: "Fan nomi bo'sh" };

    const key = `${c.id}|${day}|${period}`;
    if (seen.has(key)) return { ...base, status: "rejected", reason: "Fayl ichida takror" };
    seen.add(key);

    if (teacher && !staffByName.has(norm(teacher))) {
      return {
        ...base,
        status: "warning",
        reason: `O'qituvchi tizimda topilmadi: "${teacher}". Dars o'qituvchisiz saqlanadi`,
      };
    }
    if (existingKey.has(key)) {
      return { ...base, status: "update", reason: "Mavjud dars yangilanadi" };
    }
    return { ...base, status: "new", reason: "" };
  });

  return { rows, classByName, staffByName };
}

// POST /api/timetable/bulk/preview { rows } — faqat tahlil, hech narsa yozilmaydi
router.post("/timetable/bulk/preview", async (req, res): Promise<void> => {
  const u = authAs(req);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = readRows(req.body);
  if (!rows) { res.status(400).json({ error: `Qatorlar bo'sh yoki ${MAX_ROWS} tadan oshmasin` }); return; }
  try {
    const mid = schoolOf(u);
    if (mid === null) { res.status(400).json({ error: "Maktab tanlanmagan. Admin: avval Maktablar bo'limida maktabni 'ko'rish' rejimiga o'tkazing" }); return; }
    const { rows: out } = await analyze(rows, mid);
    res.json({ rows: out, counts: countOf(out) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/timetable/bulk/commit { rows } — qayta tahlil qilib, to'g'rilarini saqlaydi
router.post("/timetable/bulk/commit", async (req, res): Promise<void> => {
  const u = authAs(req);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = readRows(req.body);
  if (!rows) { res.status(400).json({ error: `Qatorlar bo'sh yoki ${MAX_ROWS} tadan oshmasin` }); return; }
  try {
    const mid = schoolOf(u);
    if (mid === null) { res.status(400).json({ error: "Maktab tanlanmagan. Admin: avval Maktablar bo'limida maktabni 'ko'rish' rejimiga o'tkazing" }); return; }
    const { rows: analyzed, classByName, staffByName } = await analyze(rows, mid);
    const ok = analyzed.filter((a) => a.status !== "rejected");

    const errors: { index: number; error: string }[] = [];
    let saved = 0;
    for (const a of ok) {
      try {
        const c = classByName.get(norm(a.class_name));
        if (!c) continue;
        const teacherId = a.teacher ? staffByName.get(norm(a.teacher)) ?? null : null;
        await query(
          `INSERT INTO timetable (class_id, day_of_week, period, subject, teacher_id, maktab_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (class_id, day_of_week, period)
           DO UPDATE SET subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id, maktab_id = EXCLUDED.maktab_id`,
          [c.id, a.day_of_week, a.period, a.subject, teacherId, mid],
        );
        saved++;
      } catch (err) {
        errors.push({ index: a.index, error: (err as Error).message });
      }
    }

    res.status(201).json({
      saved,
      errors,
      skipped: analyzed.filter((a) => a.status === "rejected"),
      counts: countOf(analyzed),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
