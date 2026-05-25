import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import StudentsList from "@/pages/students/index";
import NewStudent from "@/pages/students/new";
import ClassesList from "@/pages/classes/index";
import StaffList from "@/pages/staff/index";
import NewStaff from "@/pages/staff/new";

const queryClient = new QueryClient();

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
        {isLoading ? null : user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/register">
        {isLoading ? null : user ? <Redirect to="/dashboard" /> : <Register />}
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
            <div className="bg-red-500/10 border-b border-red-400/30 py-1 px-3 text-center shrink-0">
              <span className="text-xs text-red-600 font-medium">⚠️ Bu platforma test rejimida ishlayapti</span>
            </div>
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
