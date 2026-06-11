import { pool, query, queryOne, queryCount } from "../lib/db.js";

export { pool };

export interface User {
  telegram_id: number;
  full_name: string;
  phone_number: string;
  class_name: string;
  login: string;
  password: string;
  registration_date: string;
}

export async function getUserById(telegramId: number): Promise<User | null> {
  return queryOne<User>("SELECT * FROM users WHERE telegram_id = $1", [telegramId]);
}

export async function createUser(user: User): Promise<boolean> {
  try {
    await query(
      `INSERT INTO users (telegram_id, full_name, phone_number, class_name, login, password, registration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.telegram_id, user.full_name, user.phone_number, user.class_name, user.login, user.password, user.registration_date]
    );
    return true;
  } catch {
    return false;
  }
}

export async function getAllUsers(): Promise<User[]> {
  return query<User>("SELECT * FROM users ORDER BY registration_date DESC");
}

export async function getUsersCount(): Promise<number> {
  return queryCount("SELECT COUNT(*) FROM users");
}

export async function updateUser(telegramId: number, updates: Partial<User>): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (key === "telegram_id") continue;
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return false;
  values.push(telegramId);

  try {
    await query(`UPDATE users SET ${setClauses.join(", ")} WHERE telegram_id = $${idx}`, values);
    return true;
  } catch {
    return false;
  }
}

export async function deleteUser(telegramId: number): Promise<boolean> {
  try {
    await query("DELETE FROM users WHERE telegram_id = $1", [telegramId]);
    return true;
  } catch {
    return false;
  }
}

export async function getUsersByClass(className: string): Promise<User[]> {
  return query<User>("SELECT * FROM users WHERE class_name = $1", [className]);
}

export function generateCredentials(telegramId: number): { login: string; password: string } {
  const login = `user_${telegramId}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  return { login, password };
}

export function getDaysUntilSeptember(): number {
  const today = new Date();
  const target = new Date("2026-09-05");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export { query, queryOne };
