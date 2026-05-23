import { supabase } from "./database.js";
import type { Role } from "./roles.js";

// ─── Interfeyslar ────────────────────────────────────────────────────────────

export interface SchoolClass {
  id: string;           // UUID
  name: string;         // Masalan: "9-A"
  teacher_id: string | null;  // Staff UUID (sinf rahbari)
  created_at: string;
}

export interface Staff {
  id: string;           // UUID
  telegram_id: number | null;  // Bot orqali kirganda to'ldiriladi
  full_name: string;
  role: Role;
  class_id: string | null;     // Qaysi sinfga biriktirilgan (o'qituvchi uchun)
  login: string;
  password: string;
  created_at: string;
}

export interface StaffWithClass extends Staff {
  class_name?: string;
}

// ─── SINFLAR (classes) ───────────────────────────────────────────────────────

export async function createClass(name: string): Promise<SchoolClass | null> {
  const { data, error } = await supabase
    .from("classes")
    .insert([{ name }])
    .select()
    .single();
  if (error || !data) return null;
  return data as SchoolClass;
}

export async function getAllClasses(): Promise<SchoolClass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("name");
  if (error || !data) return [];
  return data as SchoolClass[];
}

export async function getClassById(id: string): Promise<SchoolClass | null> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as SchoolClass;
}

export async function getClassByName(name: string): Promise<SchoolClass | null> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("name", name)
    .single();
  if (error || !data) return null;
  return data as SchoolClass;
}

export async function deleteClass(id: string): Promise<boolean> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  return !error;
}

// Sinfga rahbar tayinlash
export async function assignTeacher(
  classId: string,
  staffId: string
): Promise<boolean> {
  // Avvalgi rahbarning class_id ni null qilish
  await supabase
    .from("staff")
    .update({ class_id: null })
    .eq("class_id", classId)
    .eq("role", "teacher");

  // Yangi rahbarga class_id berish
  await supabase
    .from("staff")
    .update({ class_id: classId })
    .eq("id", staffId);

  // classes jadvalini yangilash
  const { error } = await supabase
    .from("classes")
    .update({ teacher_id: staffId })
    .eq("id", classId);
  return !error;
}

// ─── XODIMLAR (staff) ────────────────────────────────────────────────────────

export async function createStaff(input: {
  full_name: string;
  role: Role;
  class_id?: string | null;
}): Promise<Staff | null> {
  const login = `staff_${Date.now()}`;
  const password = Math.floor(100000 + Math.random() * 900000).toString();

  const { data, error } = await supabase
    .from("staff")
    .insert([{
      full_name: input.full_name,
      role: input.role,
      class_id: input.class_id ?? null,
      login,
      password,
      telegram_id: null,
    }])
    .select()
    .single();

  if (error || !data) return null;
  return data as Staff;
}

export async function getStaffByTelegramId(telegramId: number): Promise<Staff | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();
  if (error || !data) return null;
  return data as Staff;
}

export async function getStaffByLogin(login: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("login", login)
    .single();
  if (error || !data) return null;
  return data as Staff;
}

export async function getAllStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("role");
  if (error || !data) return [];
  return data as Staff[];
}

export async function getTeachers(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("role", "teacher")
    .order("full_name");
  if (error || !data) return [];
  return data as Staff[];
}

export async function updateStaff(
  id: string,
  updates: Partial<Omit<Staff, "id" | "created_at">>
): Promise<boolean> {
  const { error } = await supabase
    .from("staff")
    .update(updates)
    .eq("id", id);
  return !error;
}

// Staff telegram_id ni login qilganda biriktirish
export async function linkStaffTelegram(
  staffId: string,
  telegramId: number
): Promise<boolean> {
  const { error } = await supabase
    .from("staff")
    .update({ telegram_id: telegramId })
    .eq("id", staffId);
  return !error;
}

export async function deleteStaff(id: string): Promise<boolean> {
  const { error } = await supabase.from("staff").delete().eq("id", id);
  return !error;
}

// Rol bo'yicha xodimlarni olish
export async function getStaffByRole(role: Role): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("role", role);
  if (error || !data) return [];
  return data as Staff[];
}
