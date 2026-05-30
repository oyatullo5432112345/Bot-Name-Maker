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

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import StudentsList from "@/pages/students/index";
import NewStudent from "@/pages/students/new";
import ClassesList from "@/pages/classes/index";
import StaffList from "@/pages/staff/index";
import NewStaff from "@/pages/staff/new";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
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
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>

      <Route path="/students">
        <ProtectedRoute 
          component={StudentsList} 
          roles={["admin", "director", "zam_direktor", "zavuch"]} 
        />
      </Route>
      <Route path="/students/new">
        <ProtectedRoute component={NewStudent} roles={["admin"]} />
      </Route>

      <Route path="/classes">
        <ProtectedRoute 
          component={ClassesList} 
          roles={["admin", "director", "zam_direktor", "zavuch"]} 
        />
      </Route>

      <Route path="/staff">
        <ProtectedRoute component={StaffList} roles={["admin"]} />
      </Route>
      <Route path="/staff/new">
        <ProtectedRoute component={NewStaff} roles={["admin"]} />
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
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
