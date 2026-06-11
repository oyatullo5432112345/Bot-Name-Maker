import { useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { SplashScreen } from "@/components/splash-screen";
import { DataSync } from "@/components/data-sync";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import StudentsList from "@/pages/students/index";
import NewStudent from "@/pages/students/new";
import BulkNewStudents from "@/pages/students/bulk-new";
import ClassesList from "@/pages/classes/index";
import StaffList from "@/pages/staff/index";
import NewStaff from "@/pages/staff/new";
import BulkNewStaff from "@/pages/staff/bulk-new";
import StaffSubjectsPage from "@/pages/staff/subjects";

import GamesPage from "@/pages/games/index";
import SozOyini from "@/pages/games/sozoyini";
import Jumboq from "@/pages/games/jumboq";
import Arqon from "@/pages/games/arqon";
import Poyga from "@/pages/games/poyga";
import Reyting from "@/pages/games/reyting";

import DarslikPage from "@/pages/darslik/index";
import NewDarslikPage from "@/pages/darslik/new";
import BaholashPage from "@/pages/baholash/index";
import DarsJadvaliPage from "@/pages/dars-jadvali/index";
import LibraryPage from "@/pages/library/index";
import NewBookPage from "@/pages/library/new";
import LibraryLoansPage from "@/pages/library/loans";
import CertificatePage from "@/pages/certificate";
import AdminVideosPage from "@/pages/admin/videos";
import AdminCodesPage from "@/pages/admin/codes";
import QollanmalarPage from "@/pages/qollanmalar";
import OlimpiyadaPage from "@/pages/olimpiada/index";
import AnnouncementsPage from "@/pages/announcements/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, roles }: { component: any, roles?: string[] }) {
  return (
    <AuthGuard roles={roles}>
      <AppLayout>
        <Component />
      </AppLayout>
    </AuthGuard>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <>
      {user && <DataSync userId={String(user.id)} userRole={user.role} />}
      <Switch>
      <Route path="/login">
        {isLoading
          ? <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          : user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/register">
        {isLoading
          ? <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          : user ? <Redirect to="/dashboard" /> : <Register />}
      </Route>
      <Route path="/">
        {user?.role === "mudir" ? <Redirect to="/olimpiada" /> : <Redirect to="/dashboard" />}
      </Route>

      <Route path="/dashboard">
        {user?.role === "mudir" ? <Redirect to="/olimpiada" /> : <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/students">
        <ProtectedRoute 
          component={StudentsList} 
          roles={["admin", "director", "mudir", "zam_direktor", "zavuch", "sinf_rahbari"]} 
        />
      </Route>
      <Route path="/students/new">
        <ProtectedRoute component={NewStudent} roles={["admin"]} />
      </Route>
      <Route path="/students/bulk-new">
        <ProtectedRoute component={BulkNewStudents} roles={["admin"]} />
      </Route>

      <Route path="/classes">
        <ProtectedRoute 
          component={ClassesList} 
          roles={["admin", "director", "mudir", "zam_direktor", "zavuch"]} 
        />
      </Route>

      <Route path="/staff">
        <ProtectedRoute component={StaffList} roles={["admin"]} />
      </Route>
      <Route path="/staff/new">
        <ProtectedRoute component={NewStaff} roles={["admin"]} />
      </Route>
      <Route path="/staff/bulk-new">
        <ProtectedRoute component={BulkNewStaff} roles={["admin"]} />
      </Route>
      <Route path="/staff/:id/subjects">
        <ProtectedRoute component={StaffSubjectsPage} roles={["admin"]} />
      </Route>

      <Route path="/darslik/new">
        <ProtectedRoute
          component={NewDarslikPage}
          roles={["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"]}
        />
      </Route>
      <Route path="/darslik">
        <ProtectedRoute component={DarslikPage} />
      </Route>

      <Route path="/baholash">
        <ProtectedRoute component={BaholashPage} />
      </Route>

      <Route path="/dars-jadvali">
        <ProtectedRoute component={DarsJadvaliPage} />
      </Route>

      <Route path="/library/new">
        <ProtectedRoute component={NewBookPage} roles={["admin", "kutubxonachi"]} />
      </Route>
      <Route path="/library/loans">
        <ProtectedRoute component={LibraryLoansPage} roles={["admin", "kutubxonachi"]} />
      </Route>
      <Route path="/library">
        <ProtectedRoute component={LibraryPage} />
      </Route>

      <Route path="/certificate">
        <ProtectedRoute component={CertificatePage} />
      </Route>

      <Route path="/olimpiada">
        <ProtectedRoute component={OlimpiyadaPage} />
      </Route>

      <Route path="/admin/videos">
        <ProtectedRoute component={AdminVideosPage} roles={["admin", "director", "mudir"]} />
      </Route>
      <Route path="/admin/codes">
        <ProtectedRoute component={AdminCodesPage} roles={["admin", "director", "mudir"]} />
      </Route>

      <Route path="/qollanmalar">
        <ProtectedRoute component={QollanmalarPage} />
      </Route>

      <Route path="/announcements">
        <ProtectedRoute component={AnnouncementsPage} />
      </Route>

      <Route path="/games/sozoyini">
        <ProtectedRoute component={SozOyini} roles={["student"]} />
      </Route>
      <Route path="/games/jumboq">
        <ProtectedRoute component={Jumboq} roles={["student"]} />
      </Route>
      <Route path="/games/arqon">
        <ProtectedRoute component={Arqon} roles={["student"]} />
      </Route>
      <Route path="/games/poyga">
        <ProtectedRoute component={Poyga} roles={["student"]} />
      </Route>
      <Route path="/games/reyting">
        <ProtectedRoute component={Reyting} roles={["student"]} />
      </Route>
      <Route path="/games">
        <ProtectedRoute component={GamesPage} roles={["student"]} />
      </Route>

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

const SPLASH_KEY = "splash_shown_v1";

function App() {
  const [splashDone, setSplashDone] = useState(() => {
    try { return sessionStorage.getItem(SPLASH_KEY) === "1"; } catch { return false; }
  });

  const handleSplashDone = useCallback(() => {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setSplashDone(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {!splashDone && <SplashScreen onDone={handleSplashDone} />}
          <div className="flex flex-col min-h-screen">
            <div className="flex-1 min-h-0">
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
