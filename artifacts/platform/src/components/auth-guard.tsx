import { useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
