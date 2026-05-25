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

const roleDisplay: Record<string, string> = {
  admin: "Admin",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  student: "O'quvchi"
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        authLogout();
      }
    });
  };

  if (!user) return <>{children}</>;

  const canViewStaff = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const canViewClasses = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const canViewStudents = ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const isStudent = user.role === "student";
  const canViewDarslik = true;
  const canViewBaholash = true;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border/50 py-4 px-4">
            <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
              <ShieldAlert className="w-5 h-5 text-sidebar-primary" />
              <span>TALIM PLATFORM</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard" || location === "/"}>
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Bosh sahifa</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

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

            <SidebarGroup>
              <SidebarGroupLabel>Ta'lim</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {canViewDarslik && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/darslik")}>
                        <Link href="/darslik">
                          <BookOpen className="w-4 h-4" />
                          <span>Darslik</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {canViewBaholash && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/baholash")}>
                        <Link href="/baholash">
                          <ClipboardList className="w-4 h-4" />
                          <span>Baholash</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/dars-jadvali")}>
                      <Link href="/dars-jadvali">
                        <CalendarDays className="w-4 h-4" />
                        <span>Dars jadvali</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

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
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border/50 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-sidebar-foreground">{user.full_name}</span>
                <span className="text-xs text-sidebar-foreground/70">{roleDisplay[user.role] || user.role}</span>
                {user.class_name && (
                  <span className="text-xs text-sidebar-foreground/50 mt-0.5">{user.class_name} sinf</span>
                )}
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Chiqish
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center px-4 border-b bg-background shadow-sm lg:hidden">
            <SidebarTrigger />
            <div className="ml-4 font-medium flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              TALIM PLATFORM
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
