import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TabPasswordGate } from "@/components/TabPasswordGate";
import Landing from "@/pages/Landing";
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

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Landing page - no authentication required */}
        <Route path="/" component={Landing} />

        {/* Overview - accessible once any tab is authenticated */}
        <Route path="/overview">
          <TabPasswordGate tab="construction" title="Dashboard Access" requireAny>
            <Overview />
          </TabPasswordGate>
        </Route>

        {/* Construction - PASSWORD_GATE */}
        <Route path="/construction">
          <TabPasswordGate tab="construction" title="Construction Progress">
            <ConstructionProgress />
          </TabPasswordGate>
        </Route>

        {/* Budget - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/budget">
          <TabPasswordGate tab="budget" title="Budget">
            <Budget />
          </TabPasswordGate>
        </Route>

        {/* Timeline - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/timeline">
          <TabPasswordGate tab="timeline" title="Timeline">
            <Timeline />
          </TabPasswordGate>
        </Route>

        {/* Deals - DEALS_PASSWORD */}
        <Route path="/deals">
          <TabPasswordGate tab="deals" title="Deal Intelligence">
            <Deals />
          </TabPasswordGate>
        </Route>

        {/* Settings - management gate */}
        <Route path="/settings">
          <TabPasswordGate tab="budget" title="Settings">
            <Settings />
          </TabPasswordGate>
        </Route>

        {/* Legacy management route */}
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
      <Router />
    </QueryClientProvider>
  );
}

export default App;
