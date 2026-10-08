// ============================================================
//  "BEK VA LOLA: SAYOHAT" — o'yin holatini saqlash
//  Holat serverda saqlanadi (boshqa qurilmada ham davom etadi),
//  internet bo'lmasa — localStorage zaxira sifatida ishlaydi.
// ============================================================
import type { Difficulty } from "@/pages/sayohat/sayohatData";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const LS_KEY = "sayohat_state_v1";

function getToken(): string | null {
  return localStorage.getItem("talim_auth_token");
}

export interface SayohatState {
  character: "bek" | "lola" | null;
  name: string;
  difficulty: Difficulty;
  stars: Record<string, number>; // regionId -> eng yuqori yulduz (0..3)
  souvenirs: string[];           // yig'ilgan esdaliklar (souvenir id)
  tangaEarned: number;           // o'yindan yig'ilgan jami tanga (ko'rsatish uchun)
}

export const DEFAULT_STATE: SayohatState = {
  character: null,
  name: "",
  difficulty: "oson",
  stars: {},
  souvenirs: [],
  tangaEarned: 0,
};

function readLocal(): SayohatState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SayohatState>) };
  } catch {
    return null;
  }
}

function writeLocal(state: SayohatState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* localStorage ishlamasa jim o'tamiz */
  }
}

/** Ikki holatni birlashtiradi — yulduzning kattasi, esdaliklar birlashmasi, tanganing kattasi */
function mergeStates(a: SayohatState, b: SayohatState): SayohatState {
  const stars: Record<string, number> = { ...a.stars };
  for (const [k, v] of Object.entries(b.stars)) {
    stars[k] = Math.max(stars[k] ?? 0, v);
  }
  return {
    // identifikatsion maydonlar — eng so'nggi (server) ustun, bo'lmasa local
    character: b.character ?? a.character,
    name: b.name || a.name,
    difficulty: b.difficulty || a.difficulty,
    stars,
    souvenirs: Array.from(new Set([...a.souvenirs, ...b.souvenirs])),
    tangaEarned: Math.max(a.tangaEarned, b.tangaEarned),
  };
}

/**
 * Holatni yuklash: serverdagi va localdagi holat birlashtiriladi.
 * Shunday qilib, viloyatdan qaytilganda (local hali yangi) ham, boshqa
 * qurilmadan kirilganda (server yangi) ham to'g'ri ko'rsatiladi.
 */
export async function loadState(): Promise<SayohatState> {
  const local = readLocal();
  const token = getToken();
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/sayohat/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as { data: Partial<SayohatState> | null };
        if (json.data && typeof json.data === "object") {
          const server: SayohatState = { ...DEFAULT_STATE, ...json.data };
          const merged = local ? mergeStates(local, server) : server;
          writeLocal(merged);
          return merged;
        }
      }
    } catch {
      /* tarmoq xatosi — localStorage ga o'tamiz */
    }
  }
  return local ?? { ...DEFAULT_STATE };
}

/** Holatni saqlash: localStorage + server */
export async function saveState(state: SayohatState): Promise<void> {
  writeLocal(state);
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE}/sayohat/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: state }),
    });
  } catch {
    /* saqlanmasa ham localStorage da bor */
  }
}

// ------------------------------------------------------------
//  Viloyat ochilish vaqtlari (admin belgilaydi)
// ------------------------------------------------------------
export type UnlockMap = Record<string, string | null>; // region_id -> ISO sana | null

/** Barcha viloyatlarning ochilish vaqtini oladi */
export async function loadUnlocks(): Promise<UnlockMap> {
  const token = getToken();
  if (!token) return {};
  try {
    const res = await fetch(`${API_BASE}/sayohat/unlocks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return (await res.json()) as UnlockMap;
  } catch {
    return {};
  }
}

/** Viloyat ochilish vaqtini belgilaydi (admin). unlockAt=null — olib tashlaydi */
export async function setUnlock(regionId: string, unlockAt: string | null): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/sayohat/unlocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ region_id: regionId, unlock_at: unlockAt }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Viloyat yakunlanganda tanga mukofotini so'raymiz.
 * Server firibgarlikdan himoyalangan — faqat bir marta (yoki yaxshilansa farqini) beradi.
 * Qaytaradi: bu safar berilgan tanga (0 bo'lishi ham mumkin).
 */
export async function sendReward(regionId: string, stars: number): Promise<number> {
  const token = getToken();
  if (!token) return 0;
  try {
    const res = await fetch(`${API_BASE}/sayohat/reward`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ region_id: regionId, stars }),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { awarded?: number };
    return json.awarded ?? 0;
  } catch {
    return 0;
  }
}
