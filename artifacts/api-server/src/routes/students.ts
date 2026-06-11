import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import {
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateStudentCredentials(name: string): { login: string; password: string } {
  const parts = name.trim().toLowerCase().split(" ");
  const base = parts[0] ?? "user";
  const num = Math.floor(100 + Math.random() * 900);
  const login = `${base}${num}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  return { login, password };
}

// GET /api/students
router.get("/students", async (req, res): Promise<void> => {
  const qp = ListStudentsQueryParams.safeParse(req.query);
  try {
    let rows;
    if (qp.success && qp.data.class_name) {
      rows = await query(
        "SELECT * FROM users WHERE class_name = $1 ORDER BY registration_date DESC",
        [qp.data.class_name]
      );
    } else {
      rows = await query("SELECT * FROM users ORDER BY registration_date DESC");
    }
    res.json(ListStudentsResponse.parse(rows));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/students/bulk
router.post("/students/bulk", async (req, res): Promise<void> => {
  const { students } = req.body as { students: { full_name: string; phone_number?: string; class_name: string }[] };
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "students massivi bo'sh" });
    return;
  }

  const created: { full_name: string; login: string; password: string; class_name: string }[] = [];
  const errors: { full_name: string; error: string }[] = [];

  for (const s of students) {
    const parts = (s.full_name ?? "").trim().toLowerCase().split(" ");
    const base = parts[0] ?? "user";
    const num = Math.floor(100 + Math.random() * 900);
    const login = `${base}${num}`;
    const password = Math.floor(10000 + Math.random() * 90000).toString();
    const telegram_id = Date.now() + Math.floor(Math.random() * 10000);
    const registration_date = new Date().toISOString();
    const phone_number = s.phone_number || "";

    try {
      await query(
        `INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, registration_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [telegram_id, s.full_name, phone_number, s.class_name, login, password, registration_date]
      );
      created.push({ full_name: s.full_name, login, password, class_name: s.class_name });
    } catch (err) {
      errors.push({ full_name: s.full_name, error: (err as Error).message });
    }
  }

  res.status(201).json({ created, errors });
});

// POST /api/students
router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { full_name, phone_number, class_name } = parsed.data;
  const { login, password } = generateStudentCredentials(full_name);
  const telegram_id = Date.now();
  const registration_date = new Date().toISOString();

  try {
    const data = await queryOne(
      `INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, registration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [telegram_id, full_name, phone_number, class_name, login, password, registration_date]
    );
    res.status(201).json(GetStudentResponse.parse(data));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/students/:id
router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const data = await queryOne("SELECT * FROM users WHERE telegram_id = $1", [params.data.id]);
  if (!data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }
  res.json(GetStudentResponse.parse(data));
});

// PATCH /api/students/:id
router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateStudentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.data.full_name != null) { setClauses.push(`full_name = $${idx++}`); values.push(body.data.full_name); }
  if (body.data.phone_number != null) { setClauses.push(`phone_number = $${idx++}`); values.push(body.data.phone_number); }
  if (body.data.class_name != null) { setClauses.push(`class_name = $${idx++}`); values.push(body.data.class_name); }
  if (body.data.password != null) { setClauses.push(`password = $${idx++}`); values.push(body.data.password); }

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Yangilanadigan maydon yo'q" });
    return;
  }

  values.push(params.data.id);
  const data = await queryOne(
    `UPDATE users SET ${setClauses.join(", ")} WHERE telegram_id = $${idx} RETURNING *`,
    values
  );

  if (!data) {
    res.status(404).json({ error: "O'quvchi topilmadi" });
    return;
  }
  res.json(UpdateStudentResponse.parse(data));
});

// DELETE /api/students/:id
router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await query("DELETE FROM users WHERE telegram_id = $1", [params.data.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
