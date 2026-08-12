import { useEffect, useRef, useState } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "talim_auth_token";
// Faqat UI uchun "sekin ulanish" belgisi — bu vaqt tugashi HECH QACHON
// foydalanuvchini avtomatik tizimdan chiqarmaydi. Sekin internetda ham
// sessiya so'rov muvaffaqiyatli tugagunicha saqlanadi.
const SLOW_CONNECTION_HINT_MS = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [localUser, setLocalUser] = useState<import("@workspace/api-client-react").AuthResult | null>(null);
  const [slow, setSlow] = useState(false);
  const tokenSetup = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!tokenSetup.current) {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    tokenSetup.current = true;
  }

  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));

  const { data: meData, isLoading: isMeLoading, isError: isMeError } = useGetMe({
    query: {
      queryKey: ["auth", "me"],
      enabled: hasToken && !initialized,
      retry: 2,
      retryDelay: 1500,
    },
  });

  useEffect(() => {
    if (initialized) return;

    if (!hasToken) {
      setInitialized(true);
      return;
    }

    if (!isMeLoading) {
      if (meData) {
        // Token haqiqiy va foydalanuvchi topildi — sessiya davom etadi.
        setLocalUser(meData);
        setInitialized(true);
      } else if (isMeError) {
        // Server token yaroqsiz deb tasdiqladi (masalan 401) — faqat
        // shu holatda tizimdan chiqariladi, vaqt tugashi bilan emas.
        localStorage.removeItem(TOKEN_KEY);
        setLocalUser(null);
        setInitialized(true);
      }
      // Aks holda (hali natija yo'q, hato ham yo'q) — kutishda davom etamiz,
      // sessiyani bekor qilmaymiz.
      return;
    }

    // Faqat "sekin ulanish" haqida signal beramiz, lekin chiqarib yubormaymiz.
    timerRef.current = setTimeout(() => setSlow(true), SLOW_CONNECTION_HINT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [meData, isMeLoading, isMeError, hasToken, initialized]);

  const login = (result: import("@workspace/api-client-react").AuthResult) => {
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    setLocalUser(result);
    setInitialized(true);
    setSlow(false);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLocalUser(null);
    setInitialized(false);
    setSlow(false);
  };

  return (
    <AuthContext.Provider value={{ user: localUser, isLoading: !initialized, isSlowConnection: slow, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
