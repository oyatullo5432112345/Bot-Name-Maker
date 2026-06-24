import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/theme";
import { useLogout } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, GraduationCap, School, LogOut,
  Gamepad2, Trophy, BookOpen, ClipboardList, CalendarDays,
  MessageCircleQuestion, Loader2, Library, Award, Video,
  KeyRound, Megaphone, Sun, Moon, CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

const roleDisplay: Record<string, string> = {
  admin: "Admin", director: "Direktor", mudir: "Obidov Boburjon",
  zam_direktor: "Direktor o'rinbosari", zavuch: "Zavuch",
  teacher: "O'qituvchi", sinf_rahbari: "Sinf rahbari",
  student: "O'quvchi", kutubxonachi: "Kutubxonachi",
};

function TalimBird() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 20C10 15 17 13 22 16C27 18 29 23 26 27C23 30 18 31 13 28C8 25 5 24 6 20Z" fill="url(#bird1)" />
      <path d="M22 16C24 11 28 6 32 8C30 11 26 14 22 16Z" fill="url(#bird2)" opacity="0.95" />
      <path d="M22 16C19 11 17 6 21 4C23 7 23 12 22 16Z" fill="url(#bird2)" opacity="0.75" />
      <path d="M13 28C11 31 9 33 11 34C13 33 15 31 13 28Z" fill="url(#bird1)" opacity="0.55" />
      <path d="M26 27C28 30 30 31 30 29C29 27 27 26 26 27Z" fill="url(#bird1)" opacity="0.45" />
      <path d="M22 16C23 14 25 13 26 14" stroke="#fde68a" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <defs>
        <linearGradient id="bird1" x1="5" y1="18" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="bird2" x1="17" y1="4" x2="32" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" /><stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function useUnreadAnnouncements() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["announcements-unread-count"],
    queryFn: async () => {
      const t = getToken();
      const r = await fetch(`${API_BASE}/announcements`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!r.ok) return { count: 0 };
      const items = await r.json() as Array<{ id: string; created_at: string }>;
      const lastSeen = localStorage.getItem("announcements_last_seen") ?? "0";
      const unread = items.filter(a => new Date(a.created_at).getTime() > Number(lastSeen));
      return { count: unread.length };
    },
    staleTime: 60_000,
  });
  return data?.count ?? 0;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const unreadCount = useUnreadAnnouncements();

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportName, setSupportName] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportDone, setSupportDone] = useState(false);

  const handleSupportSubmit = async () => {
    if (supportMsg.trim().length < 5) return;
    setSupportLoading(true);
    try {
      await fetch(`${API_BASE}/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          message: supportMsg.trim(),
          name: supportName.trim() || user?.full_name,
          contact: user?.login,
        }),
      });
      setSupportDone(true);
      setSupportMsg("");
      setSupportName("");
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Xabar yuborishda xatolik yuz berdi" });
    } finally {
      setSupportLoading(false);
    }
  };

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

  const mobileNavItems = !isMudir ? [
    { href: "/dashboard", icon: LayoutDashboard, label: "Bosh" },
    { href: "/baholash", icon: ClipboardList, label: "Baholar" },
    ...(canViewDavomat ? [{ href: "/davomat", icon: CalendarCheck, label: "Davomat" }] : []),
    { href: "/announcements", icon: Megaphone, label: "E'lonlar", badge: unreadCount },
    { href: "/dars-jadvali", icon: CalendarDays, label: "Jadval" },
  ] : [
    { href: "/olimpiada", icon: Trophy, label: "Olimpiada" },
  ];

  return (
    <SidebarProvider>
      <div
        className="flex min-h-screen w-full relative"
        style={{
          backgroundImage: "url(/globe-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className={`absolute inset-0 pointer-events-none z-0 transition-colors duration-300 ${isDark ? "bg-[#07122a]/80" : "bg-white/70"}`} />

        <Sidebar className="border-r border-white/5 relative z-10">
          <div className={`absolute inset-0 backdrop-blur-[2px] pointer-events-none transition-colors duration-300 ${isDark ? "bg-[#060f25]/88" : "bg-white/90"}`} />

          <SidebarHeader className="relative z-10 border-b border-white/8 py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/80 to-indigo-700/80 flex items-center justify-center shadow-lg border border-white/10">
                  <span className="text-white font-black text-sm">T</span>
                </div>
                <div>
                  <div className="text-sm font-bold tracking-wider text-foreground">Talim Platform</div>
                  <div className="text-[9px] text-muted-foreground tracking-widest uppercase font-medium">3-Maktab</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                  title={isDark ? "Kunduzgi rejim" : "Tungi rejim"}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <TalimBird />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="relative z-10">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {!isMudir && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/dashboard" || location === "/"}>
                        <Link href="/dashboard"><LayoutDashboard className="w-4 h-4" /><span>Bosh sahifa</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {canViewStudents && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/students")}>
                        <Link href="/students"><GraduationCap className="w-4 h-4" /><span>O'quvchilar</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {canViewClasses && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/classes")}>
                        <Link href="/classes"><School className="w-4 h-4" /><span>Sinflar</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {canViewStaff && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/staff")}>
                        <Link href="/staff"><Users className="w-4 h-4" /><span>Xodimlar</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isMudir && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/60 text-[10px] tracking-widest uppercase px-3 mb-1">
                  Ta'lim
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/darslik")}>
                        <Link href="/darslik"><BookOpen className="w-4 h-4" /><span>Darslik</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/baholash")}>
                        <Link href="/baholash"><ClipboardList className="w-4 h-4" /><span>Baholash</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {canViewDavomat && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.startsWith("/davomat")}>
                          <Link href="/davomat"><CalendarCheck className="w-4 h-4" /><span>Davomat</span></Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/dars-jadvali")}>
                        <Link href="/dars-jadvali"><CalendarDays className="w-4 h-4" /><span>Dars jadvali</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/library")}>
                        <Link href="/library"><Library className="w-4 h-4" /><span>Kutubxona</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/certificate"}>
                        <Link href="/certificate"><Award className="w-4 h-4" /><span>Sertifikat</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/olimpiada"}>
                      <Link href="/olimpiada"><Trophy className="w-4 h-4" /><span>Olimpiada.Uz</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isMudir && ["admin","director"].includes(user.role) && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/60 text-[10px] tracking-widest uppercase px-3 mb-1">
                  Sozlamalar
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin/codes"}>
                        <Link href="/admin/codes"><KeyRound className="w-4 h-4" /><span>Mahfiy kodlar</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin/videos"}>
                        <Link href="/admin/videos"><Video className="w-4 h-4" /><span>Onboarding videolari</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {canManageLibrary && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/60 text-[10px] tracking-widest uppercase px-3 mb-1">
                  Kutubxona boshqaruvi
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/library/loans"}>
                        <Link href="/library/loans"><ClipboardList className="w-4 h-4" /><span>Ijara jurnali</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/library/new"}>
                        <Link href="/library/new"><BookOpen className="w-4 h-4" /><span>Kitob qo'shish</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isStudent && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-muted-foreground/60 text-[10px] tracking-widest uppercase px-3 mb-1">
                  O'yinlar
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/games" || (location.startsWith("/games/") && location !== "/games/reyting")}>
                        <Link href="/games"><Gamepad2 className="w-4 h-4" /><span>O'yinlar ro'yxati</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/games/reyting"}>
                        <Link href="/games/reyting"><Trophy className="w-4 h-4" /><span>Reyting</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {!isMudir && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/qollanmalar"}>
                        <Link href="/qollanmalar"><Video className="w-4 h-4" /><span>Yo'riqnomalar</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/announcements"}
                        onClick={() => localStorage.setItem("announcements_last_seen", String(Date.now()))}>
                        <Link href="/announcements">
                          <div className="relative">
                            <Megaphone className="w-4 h-4" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                          </div>
                          <span>E'lonlar</span>
                          {unreadCount > 0 && (
                            <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => { setSupportOpen(true); setSupportDone(false); }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <MessageCircleQuestion className="w-4 h-4" />
                      <span>Qo'llab-quvvatlash</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="relative z-10 border-t border-white/8 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-400/15 border border-white/10 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-300 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{roleDisplay[user.role] || user.role}</p>
                  {user.class_name && <p className="text-xs text-muted-foreground/70">{user.class_name} sinf</p>}
                </div>
              </div>
              <Button
                variant="ghost" size="sm"
                className="w-full justify-start text-muted-foreground hover:bg-white/8 hover:text-foreground transition-colors"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Chiqish
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          <header className="h-14 flex items-center px-4 border-b border-white/8 bg-background/70 backdrop-blur-md shadow-lg lg:hidden sticky top-0 z-20">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-3 font-bold flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
                <span className="text-white font-black text-xs">T</span>
              </div>
              <span className="text-foreground font-extrabold tracking-tight text-base">Talim Platform</span>
            </div>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
            <div className="mx-auto max-w-6xl animate-fade-in-up">
              {children}
            </div>
          </main>

          {/* Mobile bottom tab bar */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-background/90 backdrop-blur-xl">
            <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
              {mobileNavItems.map(({ href, icon: Icon, label, badge }) => {
                const isActive = href === "/dashboard"
                  ? location === href || location === "/"
                  : location.startsWith(href);
                return (
                  <Link key={href} href={href}
                    onClick={() => {
                      if (href === "/announcements") {
                        localStorage.setItem("announcements_last_seen", String(Date.now()));
                      }
                    }}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 relative ${
                      isActive
                        ? "text-primary bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {badge && badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium truncate max-w-12 text-center">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <Dialog open={supportOpen} onOpenChange={(o) => { setSupportOpen(o); if (!o) setSupportDone(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              Qo'llab-quvvatlash
            </DialogTitle>
          </DialogHeader>
          {supportDone ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-2xl">✅</p>
              <p className="font-semibold">Xabaringiz yuborildi!</p>
              <p className="text-sm text-muted-foreground">Admin tez orada javob beradi.</p>
              <Button className="w-full mt-2" onClick={() => { setSupportOpen(false); setSupportDone(false); }}>Yopish</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ismingiz</label>
                <Input placeholder={user.full_name || "Valiyev Valijon"} value={supportName} onChange={e => setSupportName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Xabaringiz</label>
                <Textarea placeholder="Savolingiz yoki muammongizni yozing..." rows={4} value={supportMsg} onChange={e => setSupportMsg(e.target.value)} />
              </div>
              <Button className="w-full" disabled={supportMsg.trim().length < 5 || supportLoading} onClick={handleSupportSubmit}>
                {supportLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Yuborish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
