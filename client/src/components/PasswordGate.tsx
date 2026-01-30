import { useState, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle, Shield } from "lucide-react";

type UserRole = "management" | "default" | null;

interface AuthData {
  authenticated: boolean;
  role: UserRole;
}

const RoleContext = createContext<UserRole>(null);

export function useUserRole(): UserRole {
  return useContext(RoleContext);
}

async function checkAuth(): Promise<AuthData> {
  const res = await fetch("/api/auth/check");
  if (!res.ok) throw new Error("Auth check failed");
  return res.json();
}

async function login(params: { password: string; requestedRole?: string }): Promise<{ success: boolean; role: UserRole }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: params.password, requestedRole: params.requestedRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Login failed" }));
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useLocation();

  const isManagementRoute = location.startsWith("/management");

  const authQuery = useQuery({
    queryKey: ["auth"],
    queryFn: checkAuth,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setError("");
      setPassword("");
      queryClient.setQueryData(["auth"], { authenticated: true, role: data.role });
      // If logged in via /management, redirect to /
      if (isManagementRoute) {
        setLocation("/");
      }
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
    loginMutation.mutate({
      password,
      requestedRole: isManagementRoute ? "management" : undefined,
    });
  };

  // Still loading auth check
  if (authQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  const authData = authQuery.data;
  const isAuthenticated = !!authData?.authenticated;
  const currentRole = authData?.role || null;

  // If on /management route and authenticated but not as management, show management gate
  const needsManagementAuth = isManagementRoute && (!isAuthenticated || currentRole !== "management");

  // Authenticated with correct role — render the app
  if (isAuthenticated && !needsManagementAuth) {
    return (
      <RoleContext.Provider value={currentRole}>
        {children}
      </RoleContext.Provider>
    );
  }

  // Show password gate
  const isManagementGate = isManagementRoute || needsManagementAuth;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-[#12121a]">
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center ${isManagementGate ? 'bg-purple-400/10' : 'bg-teal-400/10'}`}>
            {isManagementGate ? (
              <Shield className="h-6 w-6 text-purple-400" />
            ) : (
              <Lock className="h-6 w-6 text-teal-400" />
            )}
          </div>
          <CardTitle className="text-xl text-white">
            {isManagementGate ? "Management Access" : "AYA Dashboard"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isManagementGate
              ? "Enter management password for full access"
              : "Enter password to access the dashboard"}
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
                placeholder="Password"
                autoFocus
                className={`w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 ${isManagementGate ? 'focus:ring-purple-400/50 focus:border-purple-400/50' : 'focus:ring-teal-400/50 focus:border-teal-400/50'}`}
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
              className={`w-full text-white ${isManagementGate ? 'bg-purple-500 hover:bg-purple-600' : 'bg-teal-500 hover:bg-teal-600'}`}
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
