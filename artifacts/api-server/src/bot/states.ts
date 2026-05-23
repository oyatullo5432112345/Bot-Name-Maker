// Foydalanuvchi holati (state) ni saqlash uchun oddiy in-memory xarita
// Har bir foydalanuvchi botda qaysi bosqichda ekanini saqlaymiz

export type UserStep =
  | "idle"
  | "wait_phone"
  | "wait_name"
  | "wait_class"
  | "done";

interface UserState {
  step: UserStep;
  phone?: string;
  name?: string;
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
