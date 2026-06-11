import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  LogOut,
  ShieldAlert,
  Gamepad2,
  Trophy,
  BookOpen,
  ClipboardList,
  CalendarDays,
  MessageCircleQuestion,
  Loader2,
  Library,
  Award,
  Video,
  KeyRound,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

const roleDisplay: Record<string, string> = {
  admin: "Admin",
  director: "Direktor",
  mudir: "Obidov Boburjon",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  student: "O'quvchi",
  kutubxonachi: "Kutubxonachi",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { toast } = useToast();

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
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        authLogout();
      }
    });
  };

  if (!user) return <>{children}</>;

  const isMudir = user.role === "mudir";
  const canViewStaff = !isMudir && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const canViewClasses = !isMudir && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const canViewStudents = !isMudir && ["admin", "director", "zam_direktor", "zavuch", "sinf_rahbari"].includes(user.role);
  const isStudent = user.role === "student";
  const canManageLibrary = !isMudir && ["admin", "kutubxonachi"].includes(user.role);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border/40 py-4 px-4">
            <div className="flex items-center gap-3 font-bold text-sidebar-foreground">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-wide">TALIM</div>
                <div className="text-[10px] text-sidebar-foreground/60 font-normal -mt-0.5 tracking-widest uppercase">Platform</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {!isMudir && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard" || location === "/"}>
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Bosh sahifa</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )}

                  {canViewStudents && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/students")}>
                        <Link href="/students">
                          <GraduationCap className="w-4 h-4" />
                          <span>O'quvchilar</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {canViewClasses && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/classes")}>
                        <Link href="/classes">
                          <School className="w-4 h-4" />
                          <span>Sinflar</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {canViewStaff && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/staff")}>
                        <Link href="/staff">
                          <Users className="w-4 h-4" />
                          <span>Xodimlar</span>
                        </Link>
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
                      <Link href="/darslik">
                        <BookOpen className="w-4 h-4" />
                        <span>Darslik</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/baholash")}>
                      <Link href="/baholash">
                        <ClipboardList className="w-4 h-4" />
                        <span>Baholash</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/dars-jadvali")}>
                      <Link href="/dars-jadvali">
                        <CalendarDays className="w-4 h-4" />
                        <span>Dars jadvali</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/library")}>
                      <Link href="/library">
                        <Library className="w-4 h-4" />
                        <span>Kutubxona</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/certificate"}>
                      <Link href="/certificate">
                        <Award className="w-4 h-4" />
                        <span>Sertifikat</span>
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
                    <SidebarMenuButton asChild isActive={location === "/olimpiada"}>
                      <Link href="/olimpiada">
                        <Trophy className="w-4 h-4" />
                        <span>Olimpiada.Uz</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isMudir && ["admin", "director"].includes(user.role) && (
              <SidebarGroup>
                <SidebarGroupLabel>Sozlamalar</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin/codes"}>
                        <Link href="/admin/codes">
                          <KeyRound className="w-4 h-4" />
                          <span>Mahfiy kodlar</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuButton asChild isActive={location === "/admin/videos"}>
                        <Link href="/admin/videos">
                          <Video className="w-4 h-4" />
                          <span>Onboarding videolari</span>
                        </Link>
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
                        <Link href="/library/loans">
                          <ClipboardList className="w-4 h-4" />
                          <span>Ijara jurnali</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/library/new"}>
                        <Link href="/library/new">
                          <BookOpen className="w-4 h-4" />
                          <span>Kitob qo'shish</span>
                        </Link>
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
                        <Link href="/games">
                          <Gamepad2 className="w-4 h-4" />
                          <span>O'yinlar ro'yxati</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/games/reyting"}>
                        <Link href="/games/reyting">
                          <Trophy className="w-4 h-4" />
                          <span>Reyting</span>
                        </Link>
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
                      <Link href="/qollanmalar">
                        <Video className="w-4 h-4" />
                        <span>Yo'riqnomalar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            )}

            {/* E'lonlar */}
            {!isMudir && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/announcements"}>
                        <Link href="/announcements">
                          <Megaphone className="w-4 h-4" />
                          <span>E'lonlar</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Qo'llab-quvvatlash tugmasi */}
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

          <SidebarFooter className="border-t border-sidebar-border/40 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user.full_name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.full_name}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{roleDisplay[user.role] || user.role}</p>
                  {user.class_name && (
                    <p className="text-xs text-sidebar-foreground/50">{user.class_name} sinf</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Chiqish
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center px-4 border-b bg-background/95 backdrop-blur-sm shadow-sm lg:hidden sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-3 font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="gradient-text text-base font-extrabold tracking-tight">TALIM</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Qo'llab-quvvatlash dialogi */}
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
              <Button className="w-full mt-2" onClick={() => { setSupportOpen(false); setSupportDone(false); }}>
                Yopish
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ismingiz</label>
                <Input
                  placeholder={user.full_name || "Valiyev Valijon"}
                  value={supportName}
                  onChange={e => setSupportName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Xabaringiz</label>
                <Textarea
                  placeholder="Savolingiz yoki muammongizni yozing..."
                  rows={4}
                  value={supportMsg}
                  onChange={e => setSupportMsg(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={supportMsg.trim().length < 5 || supportLoading}
                onClick={handleSupportSubmit}
              >
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
