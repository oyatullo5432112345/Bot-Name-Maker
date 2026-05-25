const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function getToken(): string | null {
  return localStorage.getItem("talim_auth_token");
}

export async function submitScore(gameId: string, scoreChange: number, reason?: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/games/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ game_id: gameId, score_change: scoreChange, reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getMyScores(): Promise<Record<string, number>> {
  const token = getToken();
  if (!token) return {};
  try {
    const res = await fetch(`${API_BASE}/games/my-scores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function getRatings(gameId: string): Promise<RatingEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/games/ratings?game_id=${gameId}`);
    if (!res.ok) return [];
    return (await res.json()) as RatingEntry[];
  } catch {
    return [];
  }
}

export interface RatingEntry {
  user_login: string;
  full_name: string;
  class_name: string;
  total_score: number;
  wins: number;
  losses: number;
}
