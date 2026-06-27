import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/theme";
import { useLogout } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, GraduationCap, School, LogOut,
  Gamepad2, Trophy, BookOpen, ClipboardList, CalendarDays,
  MessageSquare, Library, Award, Video,
  KeyRound, Megaphone, Sun, Moon, CalendarCheck, Menu, X, CreditCard, Music2,
  FileSpreadsheet, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

const roleDisplay: Record<string, string> = {
  admin: "Admin", director: "Direktor", mudir: "Obidov Boburjon",
  zam_direktor: "Direktor o'rinbosari", zavuch: "Zavuch",
  teacher: "O'qituvchi", sinf_rahbari: "Sinf rahbari",
  student: "O'quvchi", kutubxonachi: "Kutubxonachi",
};

function useUnreadAnnouncements() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["announcements-unread-count"],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/announcements`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) return { count: 0 };
      const items = await r.json() as Array<{ created_at: string }>;
      const lastSeen = localStorage.getItem("announcements_last_seen") ?? "0";
      const unread = items.filter(a => new Date(a.created_at).getTime() > Number(lastSeen));
      return { count: unread.length };
    },
    staleTime: 60_000,
  });
  return data?.count ?? 0;
}

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
};

function NavLink({ href, icon: Icon, label, badge, active, onClick }: {
  href: string; icon: React.ElementType; label: string;
  badge?: number; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="relative shrink-0">
        <Icon className="w-4 h-4" />
        {badge && badge > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{badge}</span>
      ) : null}
    </Link>
  );
}

const SECTION_COLORS: Record<string, string> = {
  "Ta'lim":            "text-emerald-500",
  "Sozlamalar":        "text-slate-400",
  "Kutubxona boshqaruvi": "text-amber-500",
  "O'yinlar":          "text-pink-500",
  "Mening ma'lumotlarim": "text-blue-400",
};

function NavSection({ label, children }: { label?: string; children: React.ReactNode }) {
  const labelColor = label ? (SECTION_COLORS[label] ?? "text-muted-foreground") : "";
  return (
    <div className="space-y-0.5">
      {label && (
        <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();
  const unreadCount = useUnreadAnnouncements();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => authLogout() });
  };

  if (!user) return <>{children}</>;

  const isMudir = user.role === "mudir";
  const canViewStaff = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewClasses = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewStudents = !isMudir && ["admin","director","zam_direktor","zavuch","sinf_rahbari"].includes(user.role);
  const canViewDavomat = !isMudir && ["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"].includes(user.role);
  const isStudent = user.role === "student";
  const canManageLibrary = !isMudir && ["admin","kutubxonachi"].includes(user.role);
  const initials = user.full_name?.[0]?.toUpperCase() ?? "U";
  const isDark = theme === "dark";

  const isActive = (href: string) =>
    href === "/dashboard" ? location === href || location === "/" : location.startsWith(href);

  const mobileNavItems: NavItem[] = !isMudir ? [
    { href: "/dashboard", icon: LayoutDashboard, label: "Bosh" },
    { href: "/baholash", icon: ClipboardList, label: "Baholar" },
    ...(canViewDavomat ? [{ href: "/davomat", icon: CalendarCheck, label: "Davomat" }] : []),
    { href: "/announcements", icon: Megaphone, label: "E'lonlar", badge: unreadCount },
    { href: "/dars-jadvali", icon: CalendarDays, label: "Jadval" },
  ] : [
    { href: "/olimpiada", icon: Trophy, label: "Olimpiada" },
  ];

  // Sidebar content (shared between desktop sidebar and mobile drawer)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-black text-sm">T</span>
          </div>
          <div>
            <div className="text-sm font-bold">Talim Platform</div>
            <div className="text-[10px] text-muted-foreground">3-Maktab</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <NavSection>
          {!isMudir && <NavLink href="/dashboard" icon={LayoutDashboard} label="Bosh sahifa" active={isActive("/dashboard")} />}
          {canViewStudents && <NavLink href="/students" icon={GraduationCap} label="O'quvchilar" active={isActive("/students")} />}
          {canViewClasses && <NavLink href="/classes" icon={School} label="Sinflar" active={isActive("/classes")} />}
          {canViewStaff && <NavLink href="/staff" icon={Users} label="Xodimlar" active={isActive("/staff")} />}
        </NavSection>

        {!isMudir && (
          <NavSection label="Ta'lim">
            <NavLink href="/darslik" icon={BookOpen} label="Darslik" active={isActive("/darslik")} />
            <NavLink href="/baholash" icon={ClipboardList} label="Baholash" active={isActive("/baholash")} />
            {canViewDavomat && <NavLink href="/davomat" icon={CalendarCheck} label="Davomat" active={isActive("/davomat")} />}
            <NavLink href="/dars-jadvali" icon={CalendarDays} label="Dars jadvali" active={isActive("/dars-jadvali")} />
            <NavLink href="/library" icon={Library} label="Kutubxona" active={isActive("/library")} />
            <NavLink href="/certificate" icon={Award} label="Sertifikat" active={isActive("/certificate")} />
          </NavSection>
        )}

        <NavSection>
          <NavLink href="/olimpiada" icon={Trophy} label="Olimpiada.Uz" active={isActive("/olimpiada")} />
        </NavSection>

        <NavSection>
          <NavLink href="/reyting" icon={Trophy} label="Haftalik Reyting" active={isActive("/reyting")} />
          <NavLink href="/tanga" icon={Wallet} label="Tanga Tizimi 🪙" active={isActive("/tanga")} />
        </NavSection>

        {!isMudir && ["admin","director"].includes(user.role) && (
          <NavSection label="Sozlamalar">
            <NavLink href="/admin/codes" icon={KeyRound} label="Mahfiy kodlar" active={isActive("/admin/codes")} />
            <NavLink href="/admin/videos" icon={Video} label="Onboarding videolari" active={isActive("/admin/videos")} />
            <NavLink href="/admin/export" icon={FileSpreadsheet} label="Hujjat Generator" active={isActive("/admin/export")} />
            {user.role === "admin" && (
              <NavLink href="/admin/music" icon={Music2} label="Musiqa sozlamalari" active={isActive("/admin/music")} />
            )}
          </NavSection>
        )}

        {canManageLibrary && (
          <NavSection label="Kutubxona boshqaruvi">
            <NavLink href="/library/loans" icon={ClipboardList} label="Ijara jurnali" active={isActive("/library/loans")} />
            <NavLink href="/library/new" icon={BookOpen} label="Kitob qo'shish" active={isActive("/library/new")} />
          </NavSection>
        )}

        {isStudent && (
          <NavSection label="O'yinlar">
            <NavLink href="/games" icon={Gamepad2} label="O'yinlar ro'yxati" active={isActive("/games") && location !== "/games/reyting"} />
            <NavLink href="/games/reyting" icon={Trophy} label="Reyting" active={isActive("/games/reyting")} />
          </NavSection>
        )}

        {isStudent && (
          <NavSection label="Mening ma'lumotlarim">
            <NavLink href="/students/id-card" icon={CreditCard} label="Mening ID kartam" active={isActive("/students/id-card")} />
          </NavSection>
        )}

        {!isMudir && (
          <NavSection>
            <NavLink href="/qollanmalar" icon={Video} label="Yo'riqnomalar" active={isActive("/qollanmalar")} />
            <NavLink
              href="/announcements"
              icon={Megaphone}
              label="E'lonlar"
              badge={unreadCount}
              active={isActive("/announcements")}
              onClick={() => localStorage.setItem("announcements_last_seen", String(Date.now()))}
            />
          </NavSection>
        )}

        {!isMudir && (
          <NavSection>
            <NavLink href="/chat" icon={MessageSquare} label="Qo'llab-quvvatlash" active={isActive("/chat")} />
          </NavSection>
        )}
      </div>

      {/* Footer: user info + logout */}
      <div className="border-t px-3 py-3 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-accent">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{roleDisplay[user.role] || user.role}</p>
            {user.class_name && <p className="text-xs text-muted-foreground">{user.class_name} sinf</p>}
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Chiqish
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl flex flex-col transition-transform duration-300 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="h-14 flex items-center px-4 border-b bg-background lg:hidden sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-bold text-foreground flex-1">Talim Platform</span>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-36 lg:pb-20">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background">
          <div className="flex items-center justify-around px-1 py-2">
            {mobileNavItems.map(({ href, icon: Icon, label, badge }) => {
              const active = href === "/dashboard"
                ? location === href || location === "/"
                : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    if (href === "/announcements") {
                      localStorage.setItem("announcements_last_seen", String(Date.now()));
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div className={`relative transition-transform duration-150 ${active ? "scale-110" : "scale-100"}`}>
                    <div className={`absolute inset-0 rounded-full transition-all duration-200 ${active ? "bg-primary/15 scale-150 blur-sm" : ""}`} />
                    <Icon className="w-5 h-5 relative" />
                    {badge && badge > 0 ? (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={`text-[10px] font-medium transition-all duration-150 ${active ? "font-bold" : ""}`}>{label}</span>
                  {active && (
                    <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

    </div>
  );
}
