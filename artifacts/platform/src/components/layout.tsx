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
  KeyRound, Megaphone, Sun, Moon, CalendarCheck, X, CreditCard,
  FileSpreadsheet, Wallet, ChevronRight, Settings,
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

interface TangaInfo { total: number; unvon: { title: string; emoji: string; color: string } }

function useTangaInfo(enabled: boolean) {
  const { data } = useQuery<TangaInfo>({
    queryKey: ["tanga-layout"],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/tanga/my`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
      if (!r.ok) throw new Error("err");
      return r.json() as Promise<TangaInfo>;
    },
    enabled,
    staleTime: 60_000,
  });
  return data ?? null;
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

// ===================================================
// Ta'lim TV Logo — UZ bayrog'i ranglari
// ===================================================
function TalimTvLogo({ size = "default" }: { size?: "default" | "small" }) {
  const isSmall = size === "small";
  return (
    <div className={`flex items-center gap-${isSmall ? "1.5" : "2"} select-none`}>
      <div className={`${isSmall ? "w-7 h-7" : "w-8 h-8"} rounded-lg overflow-hidden shrink-0 shadow`}>
        <div className="w-full h-1/3" style={{ background: "#1C64A8" }} />
        <div className="w-full h-1/3 bg-white" />
        <div className="w-full h-1/3" style={{ background: "#1EB53A" }} />
      </div>
      <div>
        <span
          className={`font-black ${isSmall ? "text-sm" : "text-base"} leading-none tracking-tight`}
          style={{
            background: "linear-gradient(135deg, #1C64A8 0%, #1C64A8 33%, #ffffff 50%, #1EB53A 66%, #1EB53A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
          }}
        >
          Ta'lim TV
        </span>
        {!isSmall && <div className="text-[9px] text-muted-foreground leading-none mt-0.5">3-Maktab</div>}
      </div>
    </div>
  );
}

// ===================================================
// Quick Access Bottom Sheet (mobile menu replacement)
// ===================================================
function QuickSheet({
  open,
  onClose,
  onOpenSidebar,
  user,
  tanga,
  unreadCount,
  handleLogout,
  logoutPending,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSidebar: () => void;
  user: { full_name?: string; role: string; class_name?: string; login?: string } | null;
  tanga: TangaInfo | null;
  unreadCount: number;
  handleLogout: () => void;
  logoutPending: boolean;
}) {
  const [location] = useLocation();
  const initials = user?.full_name?.[0]?.toUpperCase() ?? "U";

  useEffect(() => { if (open) onClose(); }, [location]);

  const quickLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Bosh sahifa", emoji: "🏠" },
    { href: "/baholash", icon: ClipboardList, label: "Baholar", emoji: "📝" },
    { href: "/dars-jadvali", icon: CalendarDays, label: "Jadval", emoji: "📅" },
    { href: "/announcements", icon: Megaphone, label: "E'lonlar", emoji: "📢", badge: unreadCount },
    { href: "/tanga", icon: Wallet, label: "Tanga 🪙", emoji: "🪙" },
    { href: "/reyting", icon: Trophy, label: "Reyting", emoji: "🏆" },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl border-t">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-4 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Profile card */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: tanga ? tanga.unvon.color + "20" : "hsl(var(--muted))",
              border: `1px solid ${tanga ? tanga.unvon.color + "40" : "transparent"}`,
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow"
              style={{ background: tanga ? tanga.unvon.color : "#6366f1" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{roleDisplay[user?.role ?? ""] || user?.role}</p>
              {user?.class_name && <p className="text-xs text-muted-foreground">{user.class_name} sinf</p>}
            </div>
            {tanga && (
              <div className="text-right shrink-0">
                <p className="text-lg font-black" style={{ color: tanga.unvon.color }}>{tanga.total}</p>
                <p className="text-xs text-muted-foreground">🪙 tanga</p>
                <p className="text-[10px]" style={{ color: tanga.unvon.color }}>{tanga.unvon.emoji} {tanga.unvon.title}</p>
              </div>
            )}
          </div>

          {/* Quick navigation grid */}
          <div className="grid grid-cols-3 gap-2">
            {quickLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted hover:bg-accent transition-colors"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); onOpenSidebar(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90"
            >
              <Settings className="w-4 h-4" />
              To'liq menyu
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutPending}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-muted-foreground font-medium text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Chiqish
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ===================================================
// Mobile menu button — better than plain hamburger
// ===================================================
function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
      style={{
        background: "linear-gradient(135deg, #1C64A8, #1EB53A)",
        boxShadow: "0 2px 8px rgba(28,100,168,0.4)",
      }}
      aria-label="Menyu"
    >
      <div className="flex flex-col gap-[4px] items-center justify-center">
        <div className="w-4 h-[2px] bg-white rounded-full" />
        <div className="w-3 h-[2px] bg-white/80 rounded-full" />
        <div className="w-4 h-[2px] bg-white rounded-full" />
      </div>
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
        style={{ background: "#F5A623" }} />
    </button>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();
  const unreadCount = useUnreadAnnouncements();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const isStudent = user?.role === "student";
  const tanga = useTangaInfo(isStudent ?? false);

  useEffect(() => { setDrawerOpen(false); setQuickSheetOpen(false); }, [location]);

  const handleLogout = () => {
    setQuickSheetOpen(false);
    setDrawerOpen(false);
    logoutMutation.mutate(undefined, { onSuccess: () => authLogout() });
  };

  if (!user) return <>{children}</>;

  const isMudir = user.role === "mudir";
  const canViewStaff = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewClasses = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewStudents = !isMudir && ["admin","director","zam_direktor","zavuch","sinf_rahbari"].includes(user.role);
  const canViewDavomat = !isMudir && ["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"].includes(user.role);
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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <TalimTvLogo />
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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

      {/* Footer */}
      <div className="border-t px-3 py-3 space-y-2">
        {/* Tanga info for students */}
        {isStudent && tanga && (
          <Link href="/tanga">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: tanga.unvon.color + "20", border: `1px solid ${tanga.unvon.color}40` }}
            >
              <span className="text-lg">{tanga.unvon.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: tanga.unvon.color }}>{tanga.unvon.title}</p>
                <p className="text-[10px] text-muted-foreground">{tanga.total} 🪙 tanga</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          </Link>
        )}
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

      {/* Quick Sheet */}
      <QuickSheet
        open={quickSheetOpen}
        onClose={() => setQuickSheetOpen(false)}
        onOpenSidebar={() => setDrawerOpen(true)}
        user={user}
        tanga={tanga}
        unreadCount={unreadCount}
        handleLogout={handleLogout}
        logoutPending={logoutMutation.isPending}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="h-14 flex items-center px-3 border-b bg-background lg:hidden sticky top-0 z-30">
          <MenuButton onClick={() => setQuickSheetOpen(true)} />
          <div className="ml-3 flex-1">
            <TalimTvLogo size="small" />
          </div>
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
