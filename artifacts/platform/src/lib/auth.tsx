import { useEffect, useRef, useState } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "talim_auth_token";
const MAX_INIT_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [localUser, setLocalUser] = useState<import("@workspace/api-client-react").AuthResult | null>(null);
  const tokenSetup = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!tokenSetup.current) {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    tokenSetup.current = true;
  }

  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));

  const { data: meData, isLoading: isMeLoading } = useGetMe({
    query: {
      queryKey: ["auth", "me"],
      enabled: hasToken && !initialized,
      retry: false,
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
        setLocalUser(meData);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setLocalUser(null);
      }
      setInitialized(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      localStorage.removeItem(TOKEN_KEY);
      setLocalUser(null);
      setInitialized(true);
    }, MAX_INIT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [meData, isMeLoading, hasToken, initialized]);

  const login = (result: import("@workspace/api-client-react").AuthResult) => {
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    setLocalUser(result);
    setInitialized(true);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLocalUser(null);
    setInitialized(false);
  };

  return (
    <AuthContext.Provider value={{ user: localUser, isLoading: !initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
