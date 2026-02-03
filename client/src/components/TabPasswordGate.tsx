import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle, Shield } from "lucide-react";

type TabName = "construction" | "budget" | "timeline" | "deals";

export interface TabAuthStatus {
  construction: boolean;
  management: boolean;
  deals: boolean;
  anyAuthenticated: boolean;
}

interface TabPasswordGateProps {
  tab: TabName;
  title: string;
  children: React.ReactNode;
  /** If true, allows access when any tab is authenticated (used for Overview) */
  requireAny?: boolean;
}

async function checkTabAuth(): Promise<TabAuthStatus> {
  const res = await fetch("/api/auth/tab-check");
  if (!res.ok) throw new Error("Tab auth check failed");
  return res.json();
}

async function tabLogin(params: { password: string; tab: TabName }): Promise<{ success: boolean; tab: string }> {
  const res = await fetch("/api/auth/tab-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Login failed" }));
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

function getAuthKey(tab: TabName): keyof TabAuthStatus {
  if (tab === "budget" || tab === "timeline") return "management";
  return tab;
}

export function TabPasswordGate({ tab, title, children, requireAny }: TabPasswordGateProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const authQuery = useQuery({
    queryKey: ["tab-auth"],
    queryFn: checkTabAuth,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: tabLogin,
    onSuccess: () => {
      setError("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["tab-auth"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }
    loginMutation.mutate({ password, tab });
  };

  if (authQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  const authData = authQuery.data;

  // For requireAny mode (Overview), allow access if any tab is authenticated
  if (requireAny) {
    if (authData?.anyAuthenticated) {
      return <>{children}</>;
    }
    // Redirect to landing page
    setLocation("/");
    return null;
  }

  const authKey = getAuthKey(tab);
  const isAuthenticated = authData?.[authKey];

  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Management tabs (budget, timeline, deals) get pink/purple styling
  const isManagementGate = tab === "budget" || tab === "timeline" || tab === "deals";

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-[#12121a]">
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center ${isManagementGate ? "bg-pink-400/10" : "bg-teal-400/10"}`}>
            {isManagementGate ? (
              <Shield className="h-6 w-6 text-pink-400" />
            ) : (
              <Lock className="h-6 w-6 text-teal-400" />
            )}
          </div>
          <CardTitle className="text-xl text-white">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isManagementGate
              ? "Enter the management password to access this section"
              : "Enter password to access this section"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={isManagementGate ? "Management password" : "Password"}
                autoFocus
                className={`w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 ${isManagementGate ? "focus:ring-pink-400/50 focus:border-pink-400/50" : "focus:ring-teal-400/50 focus:border-teal-400/50"}`}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button
              type="submit"
              className={`w-full text-white ${isManagementGate ? "bg-pink-500 hover:bg-pink-600" : "bg-teal-500 hover:bg-teal-600"}`}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Enter"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
