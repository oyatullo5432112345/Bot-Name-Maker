import { query, queryOne } from "../lib/db.js";
import type { Role } from "./roles.js";

export interface SchoolClass {
  id: string;
  name: string;
  teacher_id: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  telegram_id: number | null;
  full_name: string;
  role: Role;
  class_id: string | null;
  login: string;
  password: string;
  created_at: string;
}

export interface StaffWithClass extends Staff {
  class_name?: string;
}

// ─── SINFLAR (classes) ───────────────────────────────────────────────────────

export async function createClass(name: string): Promise<SchoolClass | null> {
  return queryOne<SchoolClass>(
    "INSERT INTO classes (name) VALUES ($1) RETURNING *", [name]
  );
}

export async function getAllClasses(): Promise<SchoolClass[]> {
  return query<SchoolClass>("SELECT * FROM classes ORDER BY name");
}

export async function getClassById(id: string): Promise<SchoolClass | null> {
  return queryOne<SchoolClass>("SELECT * FROM classes WHERE id = $1", [id]);
}

export async function getClassByName(name: string): Promise<SchoolClass | null> {
  return queryOne<SchoolClass>("SELECT * FROM classes WHERE name = $1", [name]);
}

export async function deleteClass(id: string): Promise<boolean> {
  try {
    await query("DELETE FROM classes WHERE id = $1", [id]);
    return true;
  } catch {
    return false;
  }
}

export async function assignTeacher(classId: string, staffId: string): Promise<boolean> {
  try {
    await query("UPDATE staff SET class_id = NULL WHERE class_id = $1 AND role = 'teacher'", [classId]);
    await query("UPDATE staff SET class_id = $1 WHERE id = $2", [classId, staffId]);
    await query("UPDATE classes SET teacher_id = $1 WHERE id = $2", [staffId, classId]);
    return true;
  } catch {
    return false;
  }
}

// ─── XODIMLAR (staff) ────────────────────────────────────────────────────────

export async function createStaff(input: {
  full_name: string;
  role: Role;
  class_id?: string | null;
}): Promise<Staff | null> {
  const login = `staff_${Date.now()}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();

  return queryOne<Staff>(
    `INSERT INTO staff (full_name, role, class_id, login, password, telegram_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.full_name, input.role, input.class_id ?? null, login, password, null]
  );
}

export async function getStaffByTelegramId(telegramId: number): Promise<Staff | null> {
  return queryOne<Staff>("SELECT * FROM staff WHERE telegram_id = $1", [telegramId]);
}

export async function getStaffByLogin(login: string): Promise<Staff | null> {
  return queryOne<Staff>("SELECT * FROM staff WHERE login = $1", [login]);
}

export async function getAllStaff(): Promise<Staff[]> {
  return query<Staff>("SELECT * FROM staff ORDER BY role");
}

export async function getTeachers(): Promise<Staff[]> {
  return query<Staff>("SELECT * FROM staff WHERE role = 'teacher' ORDER BY full_name");
}

export async function updateStaff(
  id: string,
  updates: Partial<Omit<Staff, "id" | "created_at">>
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return false;
  values.push(id);

  try {
    await query(`UPDATE staff SET ${setClauses.join(", ")} WHERE id = $${idx}`, values);
    return true;
  } catch {
    return false;
  }
}

export async function linkStaffTelegram(staffId: string, telegramId: number): Promise<boolean> {
  try {
    await query("UPDATE staff SET telegram_id = $1 WHERE id = $2", [telegramId, staffId]);
    return true;
  } catch {
    return false;
  }
}

export async function deleteStaff(id: string): Promise<boolean> {
  try {
    await query("DELETE FROM staff WHERE id = $1", [id]);
    return true;
  } catch {
    return false;
  }
}

export async function getStaffByRole(role: Role): Promise<Staff[]> {
  return query<Staff>("SELECT * FROM staff WHERE role = $1", [role]);
}
