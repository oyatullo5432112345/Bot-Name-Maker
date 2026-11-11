// Ommaviy qo'shish: tahlil (preview) va yaratish (commit).
// Faqat 5–11 sinflar. Mavjud sinf va o'quvchilar takror qo'shilmaydi.
// Maktab aniq tanlangan bo'lishi shart (fallback yo'q) — boshqa maktabga aralashmasin.

import { Router, type IRouter, type Request } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser, hashPassword, schoolOf } from "./auth.js";
import { genUniqueLoginId } from "./auth-login.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const MIN_GRADE = 5;
const MAX_GRADE = 11;
const MAX_ROWS = 1000;
const MAKTAB_REQUIRED = "Maktab tanlanmagan. Admin: avval Maktablar bo'limida maktabni 'ko'rish' rejimiga o'tkazing";

interface InRow {
  class_name?: unknown;
  full_name?: unknown;
  birth_date?: unknown;
  gender?: unknown;
}

export interface Analyzed {
  index: number;
  class_name: string;
  full_name: string;
  birth_date: string;
  gender: string;
  status: "new" | "exists" | "rejected";
  reason: string;
}

function authAs(req: Request): Record<string, unknown> | null {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !MANAGE.includes(String(u["role"]))) return null;
  return u;
}

// Solishtirish kaliti: katta harf, apostrof va ortiqcha bo'shliqlar farq qilmaydi
export function nameKey(s: string): string {
  return s.toUpperCase().replace(/['`ʻʼ’‘]/g, "").replace(/\s+/g, " ").trim();
}

function gradeOf(cls: string): number | null {
  const m = /^(\d{1,2})-/.exec(cls);
  return m ? Number(m[1]) : null;
}

function readRows(body: unknown): InRow[] | null {
  const rows = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  return rows as InRow[];
}

function countOf(rows: Analyzed[]) {
  return {
    new: rows.filter((r) => r.status === "new").length,
    exists: rows.filter((r) => r.status === "exists").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };
}

// Qatorlarni tahlil qiladi: yangi / mavjud / rad etilgan
async function analyze(input: InRow[], mid: number): Promise<{ rows: Analyzed[]; newClasses: string[] }> {
  const students = await query<{ class_name: string; full_name: string }>(
    "SELECT class_name, full_name FROM users WHERE maktab_id = $1",
    [mid],
  );
  const existingStudents = new Set(students.map((s) => `${s.class_name}|${nameKey(s.full_name)}`));

  const classes = await query<{ name: string }>("SELECT name FROM classes WHERE maktab_id = $1", [mid]);
  const existingClasses = new Set(classes.map((c) => c.name));

  const seen = new Set<string>();
  const newClasses = new Set<string>();

  const rows = input.map((r, index): Analyzed => {
    const cls = String(r.class_name ?? "").trim();
    const name = String(r.full_name ?? "").replace(/\s+/g, " ").trim();
    const base = {
      index,
      class_name: cls,
      full_name: name,
      birth_date: String(r.birth_date ?? ""),
      gender: String(r.gender ?? ""),
    };

    if (!cls || !name) return { ...base, status: "rejected", reason: "Sinf yoki ism bo'sh" };

    const g = gradeOf(cls);
    if (g === null || g < MIN_GRADE || g > MAX_GRADE) {
      return { ...base, status: "rejected", reason: `Faqat ${MIN_GRADE}–${MAX_GRADE} sinflar qabul qilinadi` };
    }

    const key = `${cls}|${nameKey(name)}`;
    if (existingStudents.has(key)) return { ...base, status: "exists", reason: "Bu o'quvchi sinfda allaqachon bor" };
    if (seen.has(key)) return { ...base, status: "exists", reason: "Fayl ichida takrorlangan" };
    seen.add(key);

    if (!existingClasses.has(cls)) {
      newClasses.add(cls);
      return { ...base, status: "new", reason: "Yangi sinf ochiladi" };
    }
    return { ...base, status: "new", reason: "" };
  });

  return { rows, newClasses: Array.from(newClasses).sort() };
}

// Login: ismdan + tasodifiy raqam, users/staff ichida band bo'lmasin
async function makeLogin(fullName: string): Promise<string> {
  const first = (fullName.trim().split(/\s+/)[0] ?? "user").toLowerCase().replace(/[^a-z]/g, "") || "user";
  let login = `${first}${Math.floor(100 + Math.random() * 900)}`;
  for (let i = 0; i < 25; i++) {
    const taken = await queryOne(
      "SELECT 1 AS x FROM users WHERE LOWER(login) = LOWER($1) UNION SELECT 1 FROM staff WHERE LOWER(login) = LOWER($1)",
      [login],
    );
    if (!taken) return login;
    login = `${first}${Math.floor(100 + Math.random() * 900)}`;
  }
  return `${first}${Date.now()}`;
}

// POST /api/bulk/preview { rows } — faqat tahlil, hech narsa yozilmaydi
router.post("/bulk/preview", async (req, res): Promise<void> => {
  const u = authAs(req);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = readRows(req.body);
  if (!rows) { res.status(400).json({ error: `Qatorlar bo'sh yoki ${MAX_ROWS} tadan oshmasin` }); return; }
  try {
    const mid = schoolOf(u);
    if (mid === null) { res.status(400).json({ error: MAKTAB_REQUIRED }); return; }
    const { rows: out, newClasses } = await analyze(rows, mid);
    res.json({ rows: out, new_classes: newClasses, counts: countOf(out) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/bulk/commit { rows } — qayta tahlil qilib, faqat yangilarini yaratadi
router.post("/bulk/commit", async (req, res): Promise<void> => {
  const u = authAs(req);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = readRows(req.body);
  if (!rows) { res.status(400).json({ error: `Qatorlar bo'sh yoki ${MAX_ROWS} tadan oshmasin` }); return; }
  try {
    const mid = schoolOf(u);
    if (mid === null) { res.status(400).json({ error: MAKTAB_REQUIRED }); return; }
    const { rows: analyzed } = await analyze(rows, mid);
    const toCreate = analyzed.filter((a) => a.status === "new");

    // Yangi sinflarni ochish (mavjudi o'tkazib yuboriladi)
    const classNames = Array.from(new Set(toCreate.map((a) => a.class_name)));
    const classes_created: string[] = [];
    for (const cn of classNames) {
      const r = await queryOne<{ name: string }>(
        "INSERT INTO classes (name, maktab_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (maktab_id, name) DO NOTHING RETURNING name",
        [cn, mid, new Date().toISOString()],
      );
      if (r) classes_created.push(cn);
    }

    // O'quvchilarni yaratish
    const created: { full_name: string; class_name: string; login: string; password: string; login_id: string }[] = [];
    const errors: { full_name: string; error: string }[] = [];
    for (let i = 0; i < toCreate.length; i++) {
      const a = toCreate[i]!;
      try {
        const login = await makeLogin(a.full_name);
        const password = String(Math.floor(10000 + Math.random() * 90000));
        const passwordHash = await hashPassword(password);
        const login_id = await genUniqueLoginId(mid);
        await query(
          `INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, login_id, maktab_id, registration_date)
           VALUES ($1, $2, '', $3, $4, $5, $6, $7, $8)`,
          [Date.now() + i, a.full_name, a.class_name, login, passwordHash, login_id, mid, new Date().toISOString()],
        );
        created.push({ full_name: a.full_name, class_name: a.class_name, login, password, login_id });
      } catch (err) {
        errors.push({ full_name: a.full_name, error: (err as Error).message });
      }
    }

    res.status(201).json({
      classes_created,
      created,
      errors,
      skipped: analyzed.filter((a) => a.status !== "new"),
      counts: countOf(analyzed),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
