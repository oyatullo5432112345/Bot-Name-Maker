// Monitoring — umumiy API yordamchilari, turlar va kichik funksiyalar
export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const token = () => localStorage.getItem("talim_auth_token") ?? "";

export async function mApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token();
  const res = await fetch(`${API_BASE}/monitoring${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
  return data as T;
}

// ─── Turlar ──────────────────────────────────────────────────────────────────
export type Kind = "test" | "survey";
export type Status = "draft" | "open" | "closed";
export type Difficulty = "oson" | "orta" | "qiyin";

export interface TestRow {
  id: string; kind: Kind; title: string; subject: string; class_name: string | null;
  quarter: number; academic_year: string; status: Status; has_options: boolean;
  is_anonymous: boolean; attempts_count: number; question_count: number;
  scheduled_open_at: string | null; duration_minutes: number; timed: boolean;
  pause_seconds: number; can_edit: boolean; created_at: string;
}

export interface QuestionFull {
  id: string; question: string; options: string[] | null;
  correct_index: number | null; correct_text: string | null;
  difficulty: Difficulty; time_seconds: number | null;
}
export interface FullTest extends Omit<TestRow, "can_edit" | "question_count"> { questions: QuestionFull[] }

export interface StatsQuestion {
  id: string; question: string; options: string[]; counts: number[];
  answered: number; correct_index: number | null;
}
export interface Stats {
  kind: Kind; total: number;
  by_class: { class_name: string; count: number }[];
  questions: StatsQuestion[];
}

export interface StudentItem {
  id: string; title: string; subject: string; quarter: number;
  duration_minutes: number; is_anonymous: boolean; question_count: number;
}
export interface UpcomingItem extends StudentItem { kind: Kind; scheduled_open_at: string }
export interface ArchiveItem {
  test_id: string; title: string; subject: string; quarter: number;
  score: number; total: number; percentage: number; submitted_at: string;
}
export interface StudentHome {
  student_name: string; class_name: string;
  tests: { open: StudentItem[]; upcoming: UpcomingItem[]; archive: ArchiveItem[] };
  surveys: { open: StudentItem[]; done: { id: string; title: string }[] };
}

// ─── Tahrirlash uchun qoralama savol ────────────────────────────────────────
export interface DraftQuestion {
  key: string;
  question: string;
  options: string[];
  correct_index: number;
  correct_text: string;
  difficulty: Difficulty;
  customTime: boolean;
  time_seconds: number;
}

export const DIFFICULTY_TIME: Record<Difficulty, number> = { oson: 20, orta: 40, qiyin: 60 };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { oson: "Oson", orta: "O'rta", qiyin: "Qiyin" };

let keySeq = 0;
export const newKey = () => `q${Date.now().toString(36)}${keySeq++}`;

export const emptyQuestion = (optionCount = 4): DraftQuestion => ({
  key: newKey(), question: "", options: Array.from({ length: optionCount }, () => ""),
  correct_index: 0, correct_text: "", difficulty: "orta", customTime: false, time_seconds: DIFFICULTY_TIME.orta,
});

// ─── Kichik yordamchilar ─────────────────────────────────────────────────────
export const sortClassNames = (names: string[]) =>
  [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export function academicYearNow(d = new Date()): string {
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
export function quarterNow(d = new Date()): number {
  const m = d.getMonth() + 1;
  if (m >= 9 && m <= 10) return 1;
  if (m >= 11) return 2;
  if (m <= 3) return 3;
  return 4;
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** <input type="datetime-local"> uchun mahalliy vaqt satri */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const scoreTone = (p: number) =>
  p >= 85 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
  : p >= 60 ? "text-sky-600 dark:text-sky-400 bg-sky-500/10"
  : p >= 40 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
  : "text-rose-600 dark:text-rose-400 bg-rose-500/10";

export const letter = (i: number) => String.fromCharCode(65 + i);
