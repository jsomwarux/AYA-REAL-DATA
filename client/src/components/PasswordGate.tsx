import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle } from "lucide-react";

async function checkAuth(): Promise<{ authenticated: boolean }> {
  const res = await fetch("/api/auth/check");
  if (!res.ok) throw new Error("Auth check failed");
  return res.json();
}

async function login(password: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
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

  const authQuery = useQuery({
    queryKey: ["auth"],
    queryFn: checkAuth,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      setError("");
      setPassword("");
      queryClient.setQueryData(["auth"], { authenticated: true });
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
    loginMutation.mutate(password);
  };

  // Still loading auth check
  if (authQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Authenticated — render the app
  if (authQuery.data?.authenticated) {
    return <>{children}</>;
  }

  // Show password gate
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-[#12121a]">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-teal-400/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-teal-400" />
          </div>
          <CardTitle className="text-xl text-white">AYA Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter password to access the dashboard
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
                className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50"
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
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
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
