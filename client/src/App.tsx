import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { PasswordGate, useUserRole } from "@/components/PasswordGate";
import Overview from "@/pages/Overview";
import ConstructionProgress from "@/pages/ConstructionProgress";
import Budget from "@/pages/Budget";
import Timeline from "@/pages/Timeline";
import Deals from "@/pages/Deals";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

/** Redirects non-management users to / */
function ManagementOnly({ component: Component }: { component: React.ComponentType }) {
  const role = useUserRole();
  if (role !== "management") {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/construction" component={ConstructionProgress} />
      <Route path="/budget">
        <ManagementOnly component={Budget} />
      </Route>
      <Route path="/timeline">
        <ManagementOnly component={Timeline} />
      </Route>
      <Route path="/deals">
        <ManagementOnly component={Deals} />
      </Route>
      <Route path="/settings">
        <ManagementOnly component={Settings} />
      </Route>
      {/* /management is handled by PasswordGate — it shows management login then redirects to / */}
      <Route path="/management">
        <Redirect to="/" />
      </Route>
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <PasswordGate>
        <Router />
      </PasswordGate>
    </QueryClientProvider>
  );
}

export default App;
