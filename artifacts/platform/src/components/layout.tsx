import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/theme";
import { useLogout } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, GraduationCap, School, LogOut, Home,
  Gamepad2, Trophy, BookOpen, ClipboardList, ClipboardCheck, CalendarDays,
  MessageSquare, Library, Award,
  KeyRound, Megaphone, Sun, Moon, CalendarCheck, X, CreditCard,
  Wallet, ChevronRight, AlertTriangle, ScanFace, Monitor, Grid3x3, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

// ===================================================
// YANGI RANG SXEMASI (butunlay boshqacha): binafsha → siyohrang → pushti
// ===================================================
const BRAND = "linear-gradient(135deg, #7c3aed 0%, #a21caf 55%, #db2777 100%)";
const BRAND_SOFT = "linear-gradient(135deg, #7c3aed22, #db277722)";
const ACCENT = "#7c3aed"; // asosiy urg'u (binafsha)

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

function useSupportUnread() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["support-unread-count"],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/support/unread`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) return { count: 0 };
      return r.json() as Promise<{ count: number }>;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}
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

// ===================================================
// Navigatsiya ma'lumotlari (bitta manba — desktop va telefon shu yerdan)
// ===================================================
type NavEntry = {
  href: string;
  icon: React.ElementType;
  label: string;
  tint: string;          // ikonka rangi
  badge?: number;
  match?: string;        // aktivlikni aniqlash uchun (yo'q bo'lsa href)
  seen?: boolean;        // bosilganda "ko'rildi" belgisi (e'lonlar)
};
type NavGroup = { label?: string; items: NavEntry[] };

// ===================================================
// Desktop sidebar uchun bitta qator
// ===================================================
function SideRow({ e, active, onNav }: { e: NavEntry; active: boolean; onNav?: () => void }) {
  const Icon = e.icon;
  return (
    <Link
      href={e.href}
      onClick={() => { if (e.seen) localStorage.setItem("announcements_last_seen", String(Date.now())); onNav?.(); }}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
        active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      style={active ? { background: e.tint + "1f", color: e.tint } : undefined}
    >
      <div className="relative shrink-0">
        <Icon className="w-4 h-4" style={{ color: active ? e.tint : undefined }} />
        {e.badge && e.badge > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            {e.badge > 9 ? "9+" : e.badge}
          </span>
        ) : null}
      </div>
      <span className="flex-1">{e.label}</span>
      {e.badge && e.badge > 0 ? (
        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{e.badge}</span>
      ) : null}
    </Link>
  );
}

const SECTION_COLOR: Record<string, string> = {
  "Ta'lim": "#a21caf",
  "Boshqa": "#7c3aed",
  "Sozlamalar": "#db2777",
  "Kutubxona boshqaruvi": "#c026d3",
  "Mening ma'lumotlarim": "#8b5cf6",
};

// ===================================================
// Ta'lim Platform logotipi
// ===================================================
function TalimTvLogo({ size = "default" }: { size?: "default" | "small" }) {
  const { user } = useAuth();
  const isSmall = size === "small";
  const proActive = user?.pro_expires_at && new Date(user.pro_expires_at).getTime() > Date.now();
  const proDays = proActive ? Math.max(0, Math.ceil((new Date(user!.pro_expires_at!).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="flex items-center gap-2 select-none">
      <span
        className="inline-flex items-center justify-center rounded-xl text-white font-black shrink-0"
        style={{ background: BRAND, width: isSmall ? 26 : 30, height: isSmall ? 26 : 30, fontSize: isSmall ? 13 : 15 }}
      >
        T
      </span>
      <span className={`font-black ${isSmall ? "text-base" : "text-lg"} leading-none tracking-tight text-foreground`}>
        Ta'lim{" "}
        <span style={{ background: BRAND, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          Platform
        </span>
      </span>
      {proActive && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
        >
          ⭐ Pro • {proDays}kun
        </span>
      )}
    </div>
  );
}

// ===================================================
// YANGI: To'liq menyu — pastdan chiqadigan varaq (bitta bosishda ochiladi)
// ===================================================
function MobileMenu({
  open, onClose, groups, isActive, user, tanga, isDark, toggleTheme, handleLogout, logoutPending,
}: {
  open: boolean;
  onClose: () => void;
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  user: { full_name?: string; role: string; class_name?: string | null } | null;
  tanga: TangaInfo | null;
  isDark: boolean;
  toggleTheme: () => void;
  handleLogout: () => void;
  logoutPending: boolean;
}) {
  if (!open) return null;
  const initials = user?.full_name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 talim-backdrop" onClick={onClose} />

      {/* Varaq */}
      <div className="absolute inset-x-0 bottom-0 talim-sheet flex flex-col rounded-t-[26px] bg-background shadow-2xl"
           style={{ maxHeight: "92vh" }}>
        {/* Gradient shapka */}
        <div className="relative rounded-t-[26px] px-4 pt-3 pb-4 text-white overflow-hidden" style={{ background: BRAND }}>
          <div className="flex justify-center">
            <div className="w-11 h-1.5 rounded-full bg-white/40" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors active:scale-90"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mt-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur text-white font-black text-2xl shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate leading-tight">{user?.full_name}</p>
              <p className="text-xs text-white/85 truncate">{roleDisplay[user?.role ?? ""] || user?.role}</p>
              {user?.class_name && <p className="text-xs text-white/75">{user.class_name} sinf</p>}
            </div>
            {tanga && (
              <div className="text-right shrink-0 rounded-2xl px-3 py-1.5 bg-white/15 backdrop-blur">
                <p className="text-lg font-black leading-none">{tanga.total}</p>
                <p className="text-[10px] text-white/85 mt-0.5">🪙 {tanga.unvon.emoji}</p>
              </div>
            )}
          </div>
        </div>

        {/* Menyu ro'yxati */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 overscroll-contain">
          {groups.map((g, gi) => (
            <div key={gi} className="talim-stagger">
              {g.label && (
                <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider"
                   style={{ color: SECTION_COLOR[g.label] ?? ACCENT }}>
                  {g.label}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((e) => {
                  const Icon = e.icon;
                  const active = isActive(e.match ?? e.href);
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      onClick={() => { if (e.seen) localStorage.setItem("announcements_last_seen", String(Date.now())); onClose(); }}
                      className="relative flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border transition-all active:scale-[0.97]"
                      style={{
                        background: active ? e.tint + "1f" : "hsl(var(--card))",
                        borderColor: active ? e.tint + "66" : "hsl(var(--border))",
                      }}
                    >
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: e.tint + "22" }}>
                        <Icon className="w-[18px] h-[18px]" style={{ color: e.tint }} />
                      </span>
                      <span className="text-[13px] font-semibold leading-tight flex-1 min-w-0 truncate"
                            style={active ? { color: e.tint } : undefined}>
                        {e.label}
                      </span>
                      {e.badge && e.badge > 0 ? (
                        <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                          {e.badge > 9 ? "9+" : e.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pastki amallar */}
        <div className="border-t px-3 py-3 flex gap-2"
             style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border font-semibold text-sm text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? "Yorug'" : "Tungi"}
          </button>
          <button
            onClick={handleLogout}
            disabled={logoutPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ef4444, #db2777)" }}
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();
  const unreadCount = useUnreadAnnouncements();
  const supportUnread = useSupportUnread();
  const [drawerOpen, setDrawerOpen] = useState(false); // desktop-style o'ng drawer emas — endi to'liq menyu varaq
  const [menuOpen, setMenuOpen] = useState(false);
  const isStudent = user?.role === "student";
  const tanga = useTangaInfo(isStudent ?? false);

  // Sahifa o'zgarganda barcha ochilgan panellarni yopamiz
  useEffect(() => { setDrawerOpen(false); setMenuOpen(false); }, [location]);

  // Menyu ochiq bo'lganda orqa fon skroll qilinmasin
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    logoutMutation.mutate(undefined, { onSuccess: () => authLogout() });
  };

  if (!user) return <>{children}</>;

  const isMudir = user.role === "mudir";
  const canViewStaff = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewClasses = !isMudir && ["admin","director","zam_direktor","zavuch"].includes(user.role);
  const canViewStudents = !isMudir && ["admin","director","zam_direktor","zavuch","sinf_rahbari"].includes(user.role);
  const canViewDavomat = !isMudir && ["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"].includes(user.role);
  const canUseFaceId = !isMudir && ["admin","director","zam_direktor","zavuch","sinf_rahbari"].includes(user.role);
  const canUseLab = !isMudir && ["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"].includes(user.role);
  const canSeeLoginIds = !isMudir && ["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"].includes(user.role);
  const canManageLibrary = !isMudir && ["admin","kutubxonachi"].includes(user.role);
  const initials = user.full_name?.[0]?.toUpperCase() ?? "U";
  const isDark = theme === "dark";

  const isActive = (href: string) =>
    href === "/dashboard" ? location === href || location === "/" : location.startsWith(href);

  // ---------- Navigatsiya guruhlari (bitta manba) ----------
  const groups: NavGroup[] = [];

  const mainItems: NavEntry[] = [];
  if (!isMudir) mainItems.push({ href: "/dashboard", icon: LayoutDashboard, label: "Bosh sahifa", tint: "#7c3aed" });
  mainItems.push({ href: "/monitoring", icon: ClipboardCheck, label: "Monitoring", tint: "#8b5cf6" });
  if (canViewStudents) mainItems.push({ href: "/students", icon: GraduationCap, label: "O'quvchilar", tint: "#0ea5e9" });
  if (canViewClasses) mainItems.push({ href: "/classes", icon: School, label: "Sinflar", tint: "#14b8a6" });
  if (canViewStaff) mainItems.push({ href: "/staff", icon: Users, label: "Xodimlar", tint: "#f59e0b" });
  mainItems.push({ href: "/games", icon: Gamepad2, label: "O'yinlar", tint: "#ec4899" });
  groups.push({ items: mainItems });

  if (!isMudir) {
    const edu: NavEntry[] = [
      { href: "/darslik", icon: BookOpen, label: "Darslik", tint: "#8b5cf6" },
      { href: "/baholash", icon: ClipboardList, label: "Baholash", tint: "#6366f1" },
    ];
    if (canViewDavomat) edu.push({ href: "/davomat", icon: CalendarCheck, label: "Davomat", tint: "#0ea5e9" });
    if (canUseFaceId) edu.push({ href: user.role === "sinf_rahbari" ? "/faceid/enroll" : "/faceid", icon: ScanFace, label: "Face ID", tint: "#d946ef", match: "/faceid" });
    if (canUseLab) edu.push({ href: "/lab", icon: Monitor, label: "Kompyuterlar", tint: "#14b8a6" });
    if (canSeeLoginIds) edu.push({ href: "/admin/login-ids", icon: KeyRound, label: "Kirish IDlari", tint: "#f59e0b" });
    edu.push({ href: "/dars-jadvali", icon: CalendarDays, label: "Dars jadvali", tint: "#ec4899" });
    edu.push({ href: "/library", icon: Library, label: "Kutubxona", tint: "#22c55e" });
    edu.push({ href: "/certificate", icon: Award, label: "Sertifikat", tint: "#eab308" });
    edu.push({ href: "/olimpiada", icon: Trophy, label: "Olimpiada.Uz", tint: "#f97316" });
    groups.push({ label: "Ta'lim", items: edu });
  } else {
    groups.push({ items: [{ href: "/olimpiada", icon: Trophy, label: "Olimpiada.Uz", tint: "#f97316" }] });
  }

  const other: NavEntry[] = [{ href: "/tanga", icon: Wallet, label: "Tanga Tizimi 🪙", tint: "#eab308" }];
  if (!isMudir) other.push({ href: "/announcements", icon: Megaphone, label: "E'lonlar", tint: "#db2777", badge: unreadCount, seen: true });
  if (!isMudir) other.push({ href: "/chat", icon: MessageSquare, label: "Qo'llab-quvvatlash", tint: "#0ea5e9", badge: supportUnread });
  groups.push({ label: "Boshqa", items: other });

  if (!isMudir && user.role === "admin") {
    groups.push({ label: "Sozlamalar", items: [
      { href: "/admin/maktablar", icon: Building2, label: "Maktablar", tint: "#2563eb" },
      { href: "/admin/reset", icon: AlertTriangle, label: "Xavfli zona", tint: "#ef4444" },
    ] });
  }
  if (canManageLibrary) {
    groups.push({ label: "Kutubxona boshqaruvi", items: [
      { href: "/library/loans", icon: ClipboardList, label: "Ijara jurnali", tint: "#f59e0b" },
      { href: "/library/new", icon: BookOpen, label: "Kitob qo'shish", tint: "#22c55e" },
    ]});
  }
  if (isStudent) {
    groups.push({ label: "Mening ma'lumotlarim", items: [
      { href: "/students/id-card", icon: CreditCard, label: "Mening ID kartam", tint: "#8b5cf6" },
    ]});
  }

  // ---------- Telefon pastki panel (asosiy 4 ta + Menyu) ----------
  const barItems: NavEntry[] = !isMudir ? [
    { href: "/dashboard", icon: Home, label: "Bosh", tint: ACCENT },
    { href: "/monitoring", icon: ClipboardCheck, label: "Monitoring", tint: ACCENT },
    { href: "/dars-jadvali", icon: CalendarDays, label: "Jadval", tint: ACCENT },
    { href: "/announcements", icon: Megaphone, label: "E'lonlar", tint: ACCENT, badge: unreadCount, seen: true },
  ] : [
    { href: "/olimpiada", icon: Trophy, label: "Olimpiada", tint: ACCENT },
  ];

  // ---------- Desktop sidebar ----------
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <TalimTvLogo />
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-0.5">
            {g.label && (
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: SECTION_COLOR[g.label] ?? "hsl(var(--muted-foreground))" }}>
                {g.label}
              </p>
            )}
            {g.items.map((e) => (
              <SideRow key={e.href} e={e} active={isActive(e.match ?? e.href)} />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t px-3 py-3 space-y-2">
        {user.pro_expires_at && new Date(user.pro_expires_at).getTime() > Date.now() && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
               style={{ background: "linear-gradient(135deg, #f59e0b15, #f9731615)", border: "1px solid #f59e0b40" }}>
            <span className="text-base shrink-0">⭐</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>Pro versiya</p>
              <p className="text-[10px] text-muted-foreground">
                {Math.max(0, Math.ceil((new Date(user.pro_expires_at).getTime() - Date.now()) / 86400000))} kun qoldi
              </p>
            </div>
          </div>
        )}
        {isStudent && tanga && (
          <Link href="/tanga">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                 style={{ background: tanga.unvon.color + "20", border: `1px solid ${tanga.unvon.color}40` }}>
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
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: BRAND }}>
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

      {/* Telefon: to'liq menyu (bitta bosishda) */}
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        groups={groups}
        isActive={isActive}
        user={user}
        tanga={tanga}
        isDark={isDark}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
        logoutPending={logoutMutation.isPending}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Telefon shapka — sodda: logo + tungi rejim */}
        <header className="h-14 flex items-center px-3 border-b bg-background/95 backdrop-blur lg:hidden sticky top-0 z-30">
          <div className="flex-1">
            <TalimTvLogo size="small" />
          </div>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Rejim"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Sahifa */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-28 lg:pb-8">
          <div key={location} className="mx-auto max-w-6xl page-fade">
            {children}
          </div>
        </main>

        {/* Telefon pastki panel: asosiy tugmalar + Menyu (to'liq menyuni bitta bosishda ochadi) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <div className="mx-2 mb-2 rounded-[22px] border bg-background/95 backdrop-blur shadow-[0_-8px_30px_-10px_rgba(124,58,237,0.35)]"
               style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-stretch justify-around px-1.5 py-1.5">
              {barItems.map((e) => {
                const Icon = e.icon;
                const active = isActive(e.match ?? e.href);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    onClick={() => { if (e.seen) localStorage.setItem("announcements_last_seen", String(Date.now())); }}
                    className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all duration-150 active:scale-90 flex-1"
                  >
                    <div className="relative flex items-center justify-center w-11 h-8 rounded-2xl transition-all duration-200"
                         style={active ? { background: ACCENT + "1f" } : undefined}>
                      <Icon className="w-5 h-5" style={{ color: active ? ACCENT : "hsl(var(--muted-foreground))" }} />
                      {e.badge && e.badge > 0 ? (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                          {e.badge > 9 ? "9+" : e.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px]"
                          style={{ color: active ? ACCENT : "hsl(var(--muted-foreground))", fontWeight: active ? 700 : 500 }}>
                      {e.label}
                    </span>
                  </Link>
                );
              })}

              {/* MENYU tugmasi — to'liq menyuni BITTA bosishda ochadi */}
              <button
                onClick={() => setMenuOpen(true)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all duration-150 active:scale-90 flex-1"
                aria-label="Menyu"
              >
                <div className="relative flex items-center justify-center w-11 h-8 rounded-2xl transition-all duration-200"
                     style={menuOpen ? { background: ACCENT } : { background: BRAND }}>
                  <Grid3x3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px]" style={{ color: ACCENT, fontWeight: 700 }}>Menyu</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
