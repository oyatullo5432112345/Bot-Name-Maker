// Mavsumiy mavzu (hozircha: qish). Nov–Fev oylarida o'zi yoqiladi, foydalanuvchi o'chirib/yoqib qo'ya oladi.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "talim_winter";

/** Qish mavsumi: noyabrdan fevralgacha */
export function isWinterSeason(d = new Date()): boolean {
  const m = d.getMonth(); // 0 = yanvar
  return m >= 10 || m <= 1;
}

interface SeasonContextValue {
  winter: boolean;
  setWinter: (on: boolean) => void;
  toggleWinter: () => void;
}

const SeasonContext = createContext<SeasonContextValue>({
  winter: false,
  setWinter: () => {},
  toggleWinter: () => {},
});

function readInitial(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "on") return true;
    if (saved === "off") return false;
  } catch { /* localStorage yo'q bo'lishi mumkin */ }
  return isWinterSeason();
}

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [winter, setWinterState] = useState<boolean>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (winter) root.setAttribute("data-season", "winter");
    else root.removeAttribute("data-season");
  }, [winter]);

  const setWinter = useCallback((on: boolean) => {
    setWinterState(on);
    try { localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch { /* ignore */ }
  }, []);

  const value = useMemo<SeasonContextValue>(
    () => ({ winter, setWinter, toggleWinter: () => setWinter(!winter) }),
    [winter, setWinter],
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  return useContext(SeasonContext);
}
