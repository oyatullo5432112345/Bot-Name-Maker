import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseKey = process.env["SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL va SUPABASE_ANON_KEY environment variables kerak");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  telegram_id: number;
  full_name: string;
  phone_number: string;
  class_name: string;
  login: string;
  password: string;
  registration_date: string;
}

// Foydalanuvchini bazadan ID bo'yicha topish
export async function getUserById(telegramId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (error || !data) return null;
  return data as User;
}

// Yangi foydalanuvchi qo'shish
export async function createUser(user: User): Promise<boolean> {
  const { error } = await supabase.from("users").insert([user]);
  return !error;
}

// Barcha foydalanuvchilarni olish (admin uchun)
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error || !data) return [];
  return data as User[];
}

// Foydalanuvchilar sonini olish
export async function getUsersCount(): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

// Foydalanuvchini yangilash (admin uchun)
export async function updateUser(
  telegramId: number,
  updates: Partial<User>
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("telegram_id", telegramId);
  return !error;
}

// Foydalanuvchini o'chirish (admin uchun)
export async function deleteUser(telegramId: number): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("telegram_id", telegramId);
  return !error;
}

// Sinf bo'yicha foydalanuvchilarni olish (xabar yuborish uchun)
export async function getUsersByClass(className: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("class_name", className);

  if (error || !data) return [];
  return data as User[];
}

// Login va parol yaratish
export function generateCredentials(telegramId: number): {
  login: string;
  password: string;
} {
  const login = `user_${telegramId}`;
  // Oson parol: 6 ta raqam
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  return { login, password };
}

// 5-sentabrgacha qolgan kunlarni hisoblash
export function getDaysUntilSeptember(): number {
  const today = new Date();
  const target = new Date("2026-09-05");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
