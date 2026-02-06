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
import WeeklyGoals from "@/pages/WeeklyGoals";
import ContainerSchedule from "@/pages/ContainerSchedule";
import RoomSpecs from "@/pages/RoomSpecs";
import VendorInvoices from "@/pages/VendorInvoices";
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

        {/* Weekly Goals - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/weekly-goals">
          <TabPasswordGate tab="budget" title="Weekly Goals">
            <WeeklyGoals />
          </TabPasswordGate>
        </Route>

        {/* Container Schedule - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/container-schedule">
          <TabPasswordGate tab="budget" title="Container Schedule">
            <ContainerSchedule />
          </TabPasswordGate>
        </Route>

        {/* Room Specs - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/room-specs">
          <TabPasswordGate tab="budget" title="Room Specs">
            <RoomSpecs />
          </TabPasswordGate>
        </Route>

        {/* Vendor Invoices - MANAGEMENT_PASSWORD_GATE */}
        <Route path="/vendor-invoices">
          <TabPasswordGate tab="budget" title="Vendor Invoices">
            <VendorInvoices />
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
