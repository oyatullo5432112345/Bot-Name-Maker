// ============================================================
//  "BEK VA LOLA: SAYOHAT v2" — server bilan ishlash qatlami
// ------------------------------------------------------------
//  Savollar bazadan olinadi, javoblar serverda baholanadi.
//  O'yinchi holati (qahramon/ism/daraja/yulduz) serverda saqlanadi,
//  internet bo'lmasa localStorage zaxira sifatida ishlaydi.
// ============================================================
import type { Difficulty } from "@/pages/sayohat/sayohatData";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const LS_KEY = "sayohat_state_v2";

function getToken(): string | null {
  return localStorage.getItem("talim_auth_token");
}
function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ------------------------------------------------------------
//  O'YINCHI HOLATI (kosmetik)
// ------------------------------------------------------------
export interface SayohatState {
  character: "bek" | "lola" | null;
  name: string;
  difficulty: Difficulty;
  stars: Record<string, number>; // regionId -> eng yuqori yulduz (0..3)
  souvenirs: string[];
  tangaEarned: number;           // ko'rsatish uchun (server umumiy ball ham beradi)
}

export const DEFAULT_STATE: SayohatState = {
  character: null, name: "", difficulty: "oson", stars: {}, souvenirs: [], tangaEarned: 0,
};

function readLocal(): SayohatState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SayohatState>) };
  } catch { return null; }
}
function writeLocal(state: SayohatState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* jim */ }
}

function mergeStates(a: SayohatState, b: SayohatState): SayohatState {
  const stars: Record<string, number> = { ...a.stars };
  for (const [k, v] of Object.entries(b.stars)) stars[k] = Math.max(stars[k] ?? 0, v);
  return {
    character: b.character ?? a.character,
    name: b.name || a.name,
    difficulty: b.difficulty || a.difficulty,
    stars,
    souvenirs: Array.from(new Set([...a.souvenirs, ...b.souvenirs])),
    tangaEarned: Math.max(a.tangaEarned, b.tangaEarned),
  };
}

/** Holatni yuklash: server + local birlashtiriladi */
export async function loadState(): Promise<SayohatState> {
  const local = readLocal();
  if (getToken()) {
    try {
      const res = await fetch(`${API_BASE}/sayohat/progress`, { headers: authHeaders() });
      if (res.ok) {
        const json = (await res.json()) as { state: Partial<SayohatState> | null; total_score?: number };
        if (json.state && typeof json.state === "object") {
          const server: SayohatState = { ...DEFAULT_STATE, ...json.state };
          if (typeof json.total_score === "number") server.tangaEarned = Math.max(server.tangaEarned, json.total_score);
          const merged = local ? mergeStates(local, server) : server;
          writeLocal(merged);
          return merged;
        }
      }
    } catch { /* offline — localga o'tamiz */ }
  }
  return local ?? { ...DEFAULT_STATE };
}

/** Holatni saqlash: local + server */
export async function saveState(state: SayohatState): Promise<void> {
  writeLocal(state);
  if (!getToken()) return;
  try {
    await fetch(`${API_BASE}/sayohat/progress`, {
      method: "POST", headers: authHeaders(true),
      body: JSON.stringify({ state }),
    });
  } catch { /* localda bor */ }
}

// ------------------------------------------------------------
//  VILOYATLAR (serverdan — ochilish vaqti + savol soni)
// ------------------------------------------------------------
export interface RegionInfo {
  id: string;
  title: string;
  order_index: number;
  unlock_at: string | null;
  counts: { oson: number; orta: number; qiyin: number };
}

export async function loadRegions(): Promise<RegionInfo[]> {
  if (!getToken()) return [];
  try {
    const res = await fetch(`${API_BASE}/sayohat/regions`, { headers: authHeaders() });
    if (!res.ok) return [];
    return (await res.json()) as RegionInfo[];
  } catch { return []; }
}

// ------------------------------------------------------------
//  SAVOLLAR (javobsiz — anti-cheat)
// ------------------------------------------------------------
export interface PlayQuestion {
  id: number;
  question_text: string;
  options: string[];
  hint: string;
  points: number;
}

export async function fetchQuestions(regionId: string, difficulty: Difficulty): Promise<PlayQuestion[]> {
  if (!getToken()) return [];
  try {
    const res = await fetch(
      `${API_BASE}/sayohat/questions?region_id=${encodeURIComponent(regionId)}&difficulty=${difficulty}`,
      { headers: authHeaders() },
    );
    if (!res.ok) return [];
    return (await res.json()) as PlayQuestion[];
  } catch { return []; }
}

// ------------------------------------------------------------
//  JAVOBLARNI YUBORISH (server baholaydi)
// ------------------------------------------------------------
export interface SubmitResult {
  correct: number;
  total: number;
  stars: number;
  earned_points: number;
  coins_awarded: number;
  per_question: {
    question_id: number;
    chosen_index: number;
    correct_index: number;
    is_correct: boolean;
    explanation: string;
  }[];
}

export async function submitAnswers(
  regionId: string,
  difficulty: Difficulty,
  answers: { question_id: number; chosen_index: number }[],
): Promise<SubmitResult | null> {
  if (!getToken()) return null;
  try {
    const res = await fetch(`${API_BASE}/sayohat/submit`, {
      method: "POST", headers: authHeaders(true),
      body: JSON.stringify({ region_id: regionId, difficulty, answers }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitResult;
  } catch { return null; }
}

// ============================================================
//  ADMIN (rahbariyat)
// ============================================================
export interface AdminRegion {
  id: string; title: string; order_index: number;
  unlock_at: string | null; is_active: boolean; questions: number;
}
export interface AdminQuestion {
  id: number; region_id: string; difficulty: Difficulty;
  question_text: string; options: string[]; correct_index: number;
  explanation: string; hint: string; points: number; is_active: boolean;
}
export interface SayohatStats {
  players: number; questions: number; coins: number;
  per_region: { region_id: string; title: string; finishers: number; avg_stars: number }[];
  top: { user_id: string; total_score: number; completed: number }[];
}

export async function loadAdminRegions(): Promise<AdminRegion[]> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/regions`, { headers: authHeaders() });
    if (!res.ok) return [];
    return (await res.json()) as AdminRegion[];
  } catch { return []; }
}

export async function setRegion(id: string, patch: { unlock_at?: string | null; is_active?: boolean }): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/regions/${encodeURIComponent(id)}`, {
      method: "POST", headers: authHeaders(true), body: JSON.stringify(patch),
    });
    return res.ok;
  } catch { return false; }
}

export async function loadAdminQuestions(regionId: string): Promise<AdminQuestion[]> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/questions?region_id=${encodeURIComponent(regionId)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return (await res.json()) as AdminQuestion[];
  } catch { return []; }
}

export type QuestionInput = Omit<AdminQuestion, "id">;

export async function createQuestion(q: QuestionInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/questions`, {
      method: "POST", headers: authHeaders(true), body: JSON.stringify(q),
    });
    if (res.ok) return { ok: true };
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: j.error ?? "Xatolik" };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function updateQuestion(id: number, q: QuestionInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/questions/${id}`, {
      method: "PUT", headers: authHeaders(true), body: JSON.stringify(q),
    });
    if (res.ok) return { ok: true };
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: j.error ?? "Xatolik" };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteQuestion(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/questions/${id}`, { method: "DELETE", headers: authHeaders() });
    return res.ok;
  } catch { return false; }
}

export async function loadStats(): Promise<SayohatStats | null> {
  try {
    const res = await fetch(`${API_BASE}/sayohat/admin/stats`, { headers: authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as SayohatStats;
  } catch { return null; }
}
