import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { PasswordGate } from "@/components/PasswordGate";
import Overview from "@/pages/Overview";
import ConstructionProgress from "@/pages/ConstructionProgress";
import Budget from "@/pages/Budget";
import Timeline from "@/pages/Timeline";
import Deals from "@/pages/Deals";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/construction" component={ConstructionProgress} />
      <Route path="/budget" component={Budget} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/deals" component={Deals} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
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
