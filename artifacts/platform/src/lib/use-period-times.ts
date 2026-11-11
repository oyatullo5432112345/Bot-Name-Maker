// Maktabning dars vaqtlari. Saqlanmagan darslar standart vaqt bilan chiqadi.
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export const DEFAULT_PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:45–11:30", 5: "11:50–12:35", 6: "12:45–13:20",
  7: "13:30–14:15", 8: "14:25–15:10",
};

export interface SavedPeriod { period: number; start_time: string; end_time: string }

export function usePeriodTimesRaw() {
  return useQuery<SavedPeriod[]>({
    queryKey: ["maktab-periods"],
    queryFn: async () => {
      const t = localStorage.getItem("talim_auth_token");
      const r = await fetch(`${API_BASE}/maktab-periods`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const d = await r.json().catch(() => ({}));
      return (d as { periods?: SavedPeriod[] }).periods ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

// Komponentlarda: const PERIOD_TIMES = usePeriodTimes();
export function usePeriodTimes(): Record<number, string> {
  const q = usePeriodTimesRaw();
  const map: Record<number, string> = { ...DEFAULT_PERIOD_TIMES };
  for (const p of q.data ?? []) map[p.period] = `${p.start_time}–${p.end_time}`;
  return map;
}
