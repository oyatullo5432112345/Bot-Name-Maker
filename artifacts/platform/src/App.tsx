import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { BirthdayBanner } from "@/components/birthday-banner";
import { useAuth } from "@/lib/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout";
import { SkeletonPage } from "@/components/skeleton-page";

const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
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
const SozOyini = lazy(() => import("@/pages/games/sozoyini"));
const Jumboq = lazy(() => import("@/pages/games/jumboq"));
const Arqon = lazy(() => import("@/pages/games/arqon"));
const Poyga = lazy(() => import("@/pages/games/poyga"));
const Reyting = lazy(() => import("@/pages/games/reyting"));
const DarslikPage = lazy(() => import("@/pages/darslik/index"));
const NewDarslikPage = lazy(() => import("@/pages/darslik/new"));
const BaholashPage = lazy(() => import("@/pages/baholash/index"));
const DarsJadvaliPage = lazy(() => import("@/pages/dars-jadvali/index"));
const LibraryPage = lazy(() => import("@/pages/library/index"));
const NewBookPage = lazy(() => import("@/pages/library/new"));
const LibraryLoansPage = lazy(() => import("@/pages/library/loans"));
const CertificatePage = lazy(() => import("@/pages/certificate"));
const AdminVideosPage = lazy(() => import("@/pages/admin/videos"));
const AdminCodesPage = lazy(() => import("@/pages/admin/codes"));
const AdminExportPage = lazy(() => import("@/pages/admin/export"));
const ReytingPage = lazy(() => import("@/pages/reyting/index"));
const QollanmalarPage = lazy(() => import("@/pages/qollanmalar"));
const OlimpiyadaPage = lazy(() => import("@/pages/olimpiada/index"));
const AnnouncementsPage = lazy(() => import("@/pages/announcements/index"));
const DavomatPage = lazy(() => import("@/pages/davomat/index"));
const ChatPage = lazy(() => import("@/pages/chat/index"));
const StudentIdCard = lazy(() => import("@/pages/students/id-card"));
const TangaPage = lazy(() => import("@/pages/tanga/index"));
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

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  return (
    <AuthGuard roles={roles}>
      <AppLayout>
        <Suspense fallback={<SkeletonPage />}>
          <Component />
        </Suspense>
      </AppLayout>
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
      <Route path="/register">
        {user ? <Redirect to="/dashboard" /> : (
          <Suspense fallback={<LoadingSpinner />}><Register /></Suspense>
        )}
      </Route>
      <Route path="/">
        {user?.role === "mudir" ? <Redirect to="/olimpiada" /> : <Redirect to="/dashboard" />}
      </Route>

      <Route path="/dashboard">
        {user?.role === "mudir" ? <Redirect to="/olimpiada" /> : <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/students"><ProtectedRoute component={StudentsList} roles={["admin","director","mudir","zam_direktor","zavuch","sinf_rahbari"]} /></Route>
      <Route path="/students/id-card"><ProtectedRoute component={StudentIdCard} /></Route>
      <Route path="/students/new"><ProtectedRoute component={NewStudent} roles={["admin"]} /></Route>
      <Route path="/students/bulk-new"><ProtectedRoute component={BulkNewStudents} roles={["admin"]} /></Route>

      <Route path="/classes"><ProtectedRoute component={ClassesList} roles={["admin","director","mudir","zam_direktor","zavuch"]} /></Route>

      <Route path="/staff"><ProtectedRoute component={StaffList} roles={["admin"]} /></Route>
      <Route path="/staff/new"><ProtectedRoute component={NewStaff} roles={["admin"]} /></Route>
      <Route path="/staff/bulk-new"><ProtectedRoute component={BulkNewStaff} roles={["admin"]} /></Route>
      <Route path="/staff/:id/subjects"><ProtectedRoute component={StaffSubjectsPage} roles={["admin"]} /></Route>

      <Route path="/darslik/new"><ProtectedRoute component={NewDarslikPage} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"]} /></Route>
      <Route path="/darslik"><ProtectedRoute component={DarslikPage} /></Route>

      <Route path="/baholash"><ProtectedRoute component={BaholashPage} /></Route>
      <Route path="/dars-jadvali"><ProtectedRoute component={DarsJadvaliPage} /></Route>
      <Route path="/davomat"><ProtectedRoute component={DavomatPage} roles={["admin","director","zam_direktor","zavuch","teacher","sinf_rahbari"]} /></Route>

      <Route path="/library/new"><ProtectedRoute component={NewBookPage} roles={["admin","kutubxonachi"]} /></Route>
      <Route path="/library/loans"><ProtectedRoute component={LibraryLoansPage} roles={["admin","kutubxonachi"]} /></Route>
      <Route path="/library"><ProtectedRoute component={LibraryPage} /></Route>

      <Route path="/certificate"><ProtectedRoute component={CertificatePage} /></Route>
      <Route path="/olimpiada"><ProtectedRoute component={OlimpiyadaPage} /></Route>

      <Route path="/admin/videos"><ProtectedRoute component={AdminVideosPage} roles={["admin","director","mudir"]} /></Route>
      <Route path="/admin/codes"><ProtectedRoute component={AdminCodesPage} roles={["admin","director","mudir"]} /></Route>
      <Route path="/admin/export"><ProtectedRoute component={AdminExportPage} roles={["admin","director","zam_direktor","zavuch"]} /></Route>
      <Route path="/reyting"><ProtectedRoute component={ReytingPage} /></Route>
      <Route path="/tanga"><ProtectedRoute component={TangaPage} /></Route>

      <Route path="/qollanmalar"><ProtectedRoute component={QollanmalarPage} /></Route>
      <Route path="/announcements"><ProtectedRoute component={AnnouncementsPage} /></Route>
      <Route path="/chat"><ProtectedRoute component={ChatPage} /></Route>

      <Route path="/games/sozoyini"><ProtectedRoute component={SozOyini} roles={["student"]} /></Route>
      <Route path="/games/jumboq"><ProtectedRoute component={Jumboq} roles={["student"]} /></Route>
      <Route path="/games/arqon"><ProtectedRoute component={Arqon} roles={["student"]} /></Route>
      <Route path="/games/poyga"><ProtectedRoute component={Poyga} roles={["student"]} /></Route>
      <Route path="/games/reyting"><ProtectedRoute component={Reyting} roles={["student"]} /></Route>
      <Route path="/games"><ProtectedRoute component={GamesPage} roles={["student"]} /></Route>

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
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
