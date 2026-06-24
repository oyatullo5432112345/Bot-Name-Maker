import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/theme";
import { useLogout } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, GraduationCap, School, LogOut,
  Gamepad2, Trophy, BookOpen, ClipboardList, CalendarDays,
  MessageCircleQuestion, Library, Award, Video,
  KeyRound, Megaphone, Sun, Moon, CalendarCheck, Menu,
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
      <div className="flex min-h-screen w-full bg-background">

        <Sidebar className="border-r">
          <SidebarHeader className="border-b py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-sm">T</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Talim Platform</div>
                  <div className="text-[10px] text-muted-foreground">3-Maktab</div>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title={isDark ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </SidebarHeader>

          <SidebarContent>
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
                <SidebarGroupLabel>Ta'lim</SidebarGroupLabel>
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
                <SidebarGroupLabel>Sozlamalar</SidebarGroupLabel>
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
                <SidebarGroupLabel>Kutubxona boshqaruvi</SidebarGroupLabel>
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
                <SidebarGroupLabel>O'yinlar</SidebarGroupLabel>
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
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/announcements"}
                        onClick={() => localStorage.setItem("announcements_last_seen", String(Date.now()))}
                      >
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

          <SidebarFooter className="border-t p-3">
            <div className="flex flex-col gap-2">
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
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="h-14 flex items-center px-4 border-b bg-background lg:hidden sticky top-0 z-20">
            <SidebarTrigger>
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <span className="ml-3 font-bold text-foreground">Talim Platform</span>
            <div className="flex-1" />
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>

          {/* Mobile bottom tab bar */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background">
            <div className="flex items-center justify-around px-1 py-2">
              {mobileNavItems.map(({ href, icon: Icon, label, badge }) => {
                const isActive = href === "/dashboard"
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
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors relative ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {badge && badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Support dialog */}
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
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              <Input
                placeholder="Ismingiz (ixtiyoriy)"
                value={supportName}
                onChange={e => setSupportName(e.target.value)}
              />
              <Textarea
                placeholder="Muammoingizni yozing..."
                rows={4}
                value={supportMsg}
                onChange={e => setSupportMsg(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={supportMsg.trim().length < 5 || supportLoading}
                onClick={handleSupportSubmit}
              >
                {supportLoading ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
