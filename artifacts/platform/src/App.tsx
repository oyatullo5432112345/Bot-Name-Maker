import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { BirthdayBanner } from "@/components/birthday-banner";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { useAuth } from "@/lib/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout, FaceLockGuard } from "@/components/layout";
import { SkeletonPage } from "@/components/skeleton-page";

const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const StudentsList = lazy(() => import("@/pages/students/index"));
const NewStudent = lazy(() => import("@/pages/students/new"));
const BulkNewStudents = lazy(() => import("@/pages/students/bulk-new"));
const ClassesList = lazy(() => import("@/pages/classes/index"));
const StaffList = lazy(() => import("@/pages/staff/index"));
const NewStaff = lazy(() => import("@/pages/staff/new"));
const BulkNewStaff = lazy(() => import("@/pages/staff/bulk-new"));
const StaffSubjectsPage = lazy(() => import("@/pages/staff/subjects"));
const GamesPage = lazy(() => import("@/pages/games/index"));
const BoardGameList = lazy(() => import("@/pages/games/board/index"));
const BoardGameNew = lazy(() => import("@/pages/games/board/new"));
const BoardGamePlay = lazy(() => import("@/pages/games/board/play"));
const WheelList = lazy(() => import("@/pages/games/wheel/index"));
const WheelSpin = lazy(() => import("@/pages/games/wheel/spin"));
const MaktabOlami = lazy(() => import("@/pages/oyin/index"));
const MergeGame = lazy(() => import("@/pages/oyin/merge"));
const Intellektual = lazy(() => import("@/pages/intellektual/index"));
const SayohatIndex = lazy(() => import("@/pages/sayohat/index"));
const SayohatPlay = lazy(() => import("@/pages/sayohat/play"));
const SayohatAdmin = lazy(() => import("@/pages/sayohat/admin"));
const SayohatAdminQuestions = lazy(() => import("@/pages/sayohat/admin-questions"));
const ProPage = lazy(() => import("@/pages/pro"));
const BaholashPage = lazy(() => import("@/pages/baholash/index"));
const DarsJadvaliPage = lazy(() => import("@/pages/dars-jadvali/index"));
const AnalyticsPage = lazy(() => import("@/pages/analytics/index"));
const Kutubxona = lazy(() => import("@/pages/kutubxona/index"));

const AdminResetPage = lazy(() => import("@/pages/admin/reset"));
const MaktablarPage = lazy(() => import("@/pages/admin/maktablar"));
const ReytingPage = lazy(() => import("@/pages/reyting/index"));
const QollanmalarPage = lazy(() => import("@/pages/qollanmalar"));
const OlimpiyadaPage = lazy(() => import("@/pages/olimpiada/index"));
const AnnouncementsPage = lazy(() => import("@/pages/announcements/index"));
const ChatPage = lazy(() => import("@/pages/chat/index"));
const StudentIdCard = lazy(() => import("@/pages/students/id-card"));
const TangaPage = lazy(() => import("@/pages/tanga/index"));
const MonitoringIndex = lazy(() => import("@/pages/monitoring/index"));
const MonitoringAdmin = lazy(() => import("@/pages/monitoring/admin"));
const MonitoringTake = lazy(() => import("@/pages/monitoring/take"));
const MonitoringAnalytics = lazy(() => import("@/pages/monitoring/analytics"));
const FaceIdPage = lazy(() => import("@/pages/faceid/index"));
const FaceEnrollPage = lazy(() => import("@/pages/faceid/enroll"));
const FaceKioskPage = lazy(() => import("@/pages/faceid/kiosk"));
const FaceTodayPage = lazy(() => import("@/pages/faceid/today"));
const LoginIdsPage = lazy(() => import("@/pages/admin/login-ids"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, roles, faceLock }: { component: React.ComponentType; roles?: string[]; faceLock?: boolean }) {
  const inner = (
    <Suspense fallback={<SkeletonPage />}>
      <Component />
    </Suspense>
  );
  return (
    <AuthGuard roles={roles}>
      <AppLayout>
        {faceLock ? <FaceLockGuard>{inner}</FaceLockGuard> : inner}
      </AppLayout>
    </AuthGuard>
  );
}

// To'liq ekran sahifa (menyusiz) — Face ID kiosk uchun
function KioskRoute({ component: Component, roles, faceLock }: { component: React.ComponentType; roles?: string[]; faceLock?: boolean }) {
  const inner = (
    <Suspense fallback={<div className="fixed inset-0 bg-[#05070F]" />}>
      <Component />
    </Suspense>
  );
  return (
    <AuthGuard roles={roles}>
      {faceLock ? <FaceLockGuard>{inner}</FaceLockGuard> : inner}
    </AuthGuard>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : (
          <Suspense fallback={<LoadingSpinner />}><Login /></Suspense>
        )}
      </Route>
      {/* Mahfiy kod bilan ro'yxatdan o'tish bekor qilindi — kirish sahifasiga yo'naltiramiz */}
      <Route path="/register">
        <Redirect to={user ? "/dashboard" : "/login"} />
      </Route>
      <Route path="/">
        {user
          ? (user.role === "mudir" ? <Redirect to="/olimpiada" /> : <Redirect to="/dashboard" />)
          : <Redirect to="/login" />}
      </Route>

      <Route path="/dashboard">
        {user?.role === "mudir" ? <Redirect to="/olimpiada" /> : <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/students"><ProtectedRoute component={StudentsList} roles={["admin","director","mudir","zam_direktor","zavuch","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/students/id-card"><ProtectedRoute component={StudentIdCard} /></Route>
      <Route path="/students/new"><ProtectedRoute component={NewStudent} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/students/bulk-new"><ProtectedRoute component={BulkNewStudents} roles={["admin","director","zam_direktor","zavuch"]} /></Route>

      <Route path="/classes"><ProtectedRoute component={ClassesList} roles={["admin","director","mudir","zam_direktor","zavuch"]} /></Route>

      <Route path="/staff"><ProtectedRoute component={StaffList} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/staff/new"><ProtectedRoute component={NewStaff} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/staff/bulk-new"><ProtectedRoute component={BulkNewStaff} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/staff/:id/subjects"><ProtectedRoute component={StaffSubjectsPage} roles={["admin","director","zam_direktor","zavuch"]} /></Route>

      <Route path="/baholash"><ProtectedRoute component={BaholashPage} /></Route>
      <Route path="/dars-jadvali"><ProtectedRoute component={DarsJadvaliPage} /></Route>
      <Route path="/analytics"><ProtectedRoute component={AnalyticsPage} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/kutubxona"><ProtectedRoute component={Kutubxona} /></Route>
      <Route path="/olimpiada"><ProtectedRoute component={OlimpiyadaPage} /></Route>

      {/* Mahfiy kodlar bekor qilindi — Kirish IDlari sahifasiga yo'naltiramiz */}
      <Route path="/admin/codes"><Redirect to="/admin/login-ids" /></Route>
      <Route path="/admin/reset"><ProtectedRoute component={AdminResetPage} roles={["admin"]} /></Route>
      <Route path="/admin/maktablar"><ProtectedRoute component={MaktablarPage} roles={["admin"]} /></Route>
      <Route path="/reyting"><ProtectedRoute component={ReytingPage} /></Route>
      <Route path="/tanga"><ProtectedRoute component={TangaPage} /></Route>

      <Route path="/monitoring/analytics"><ProtectedRoute component={MonitoringAnalytics} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/monitoring/admin"><ProtectedRoute component={MonitoringAdmin} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/monitoring/:id"><ProtectedRoute component={MonitoringTake} /></Route>
      <Route path="/monitoring"><ProtectedRoute component={MonitoringIndex} /></Route>

      <Route path="/qollanmalar"><ProtectedRoute component={QollanmalarPage} /></Route>
      <Route path="/announcements"><ProtectedRoute component={AnnouncementsPage} /></Route>
      <Route path="/faceid/kiosk"><KioskRoute component={FaceKioskPage} roles={["admin","director","zam_direktor","zavuch"]} faceLock /></Route>
      <Route path="/faceid/enroll"><ProtectedRoute component={FaceEnrollPage} roles={["admin","director","zam_direktor","zavuch","sinf_rahbari","boshlangich_oqituvchi"]} faceLock /></Route>
      <Route path="/faceid/today"><ProtectedRoute component={FaceTodayPage} roles={["admin","director","zam_direktor","zavuch","sinf_rahbari","boshlangich_oqituvchi"]} faceLock /></Route>
      <Route path="/faceid"><ProtectedRoute component={FaceIdPage} roles={["admin","director","zam_direktor","zavuch"]} faceLock /></Route>
      <Route path="/admin/login-ids"><ProtectedRoute component={LoginIdsPage} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/chat"><ProtectedRoute component={ChatPage} /></Route>

      <Route path="/games/board/new"><ProtectedRoute component={BoardGameNew} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/games/board/:id"><ProtectedRoute component={BoardGamePlay} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/games/board"><ProtectedRoute component={BoardGameList} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/games/wheel/:id"><ProtectedRoute component={WheelSpin} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/games/wheel"><ProtectedRoute component={WheelList} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari","boshlangich_oqituvchi"]} /></Route>
      <Route path="/sayohat/admin/savollar"><ProtectedRoute component={SayohatAdminQuestions} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/sayohat/admin"><ProtectedRoute component={SayohatAdmin} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/sayohat/:region"><ProtectedRoute component={SayohatPlay} /></Route>
      <Route path="/sayohat"><ProtectedRoute component={SayohatIndex} /></Route>
      <Route path="/pro"><ProtectedRoute component={ProPage} /></Route>
      <Route path="/intellektual"><ProtectedRoute component={Intellektual} /></Route>
      <Route path="/oyin/merge"><ProtectedRoute component={MergeGame} /></Route>
      <Route path="/oyin"><ProtectedRoute component={MaktabOlami} /></Route>
      <Route path="/games"><ProtectedRoute component={GamesPage} /></Route>

      <Route><Suspense fallback={<LoadingSpinner />}><NotFound /></Suspense></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <BirthdayBanner />
              <PwaUpdatePrompt />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
