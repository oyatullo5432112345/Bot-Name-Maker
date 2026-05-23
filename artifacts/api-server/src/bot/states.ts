// Foydalanuvchi holati (state machine) — in-memory

export type UserStep =
  // O'quvchi ro'yxatdan o'tish
  | "idle"
  | "wait_phone"
  | "wait_name"
  | "wait_class"
  | "done"
  // Staff login
  | "staff_wait_login"
  | "staff_wait_password"
  // Admin: sinf yaratish
  | "admin_wait_class_name"
  // Admin: xodim qo'shish
  | "admin_staff_name"
  | "admin_staff_role"
  | "admin_staff_class"
  // Admin: sinf rahbari tayinlash
  | "admin_assign_class"
  | "admin_assign_teacher";

interface UserState {
  step: UserStep;
  // O'quvchi
  phone?: string;
  name?: string;
  // Staff qo'shish
  staffName?: string;
  staffRole?: string;
  staffClassId?: string;
  // Tayinlash
  assignClassId?: string;
  // Login
  staffLogin?: string;
}

const states = new Map<number, UserState>();

export function getState(userId: number): UserState {
  return states.get(userId) ?? { step: "idle" };
}

export function setState(userId: number, state: UserState): void {
  states.set(userId, state);
}

export function clearState(userId: number): void {
  states.set(userId, { step: "idle" });
}
