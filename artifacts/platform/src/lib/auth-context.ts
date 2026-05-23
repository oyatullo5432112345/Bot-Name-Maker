import { createContext } from "react";
import type { AuthResult } from "@workspace/api-client-react";

export type AuthContextType = {
  user: AuthResult | null;
  isLoading: boolean;
  login: (result: AuthResult) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
