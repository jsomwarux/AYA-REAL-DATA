import { Link } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  Building2,
  DollarSign,
  Calendar,
  Target,
  Ship,
  Radar,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface TabAuthStatus {
  construction: boolean;
  management: boolean;
  deals: boolean;
  anyAuthenticated: boolean;
}

async function checkTabAuth(): Promise<TabAuthStatus> {
  const res = await fetch("/api/auth/tab-check");
  if (!res.ok) throw new Error("Tab auth check failed");
  return res.json();
}

const tabs = [
  {
    title: "Construction Progress",
    href: "/construction",
    icon: Building2,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "hover:border-blue-400/30",
    description: "Room-by-room progress tracking across all floors and units",
    authKey: "construction" as const,
  },
  {
    title: "Budget",
    href: "/budget",
    icon: DollarSign,
    iconColor: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "hover:border-green-400/30",
    description: "Project budget tracking, vendor spend, and cost analysis",
    authKey: "management" as const,
  },
  {
    title: "Timeline",
    href: "/timeline",
    icon: Calendar,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "hover:border-amber-400/30",
    description: "Project schedule, milestones, and event tracking",
    authKey: "management" as const,
  },
  {
    title: "Weekly Goals",
    href: "/weekly-goals",
    icon: Target,
    iconColor: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "hover:border-orange-400/30",
    description: "Track weekly sprint goals, assignees, and completion status",
    authKey: "management" as const,
  },
  {
    title: "Container Schedule",
    href: "/container-schedule",
    icon: Ship,
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "hover:border-cyan-400/30",
    description: "Track shipments from factory to warehouse with delivery status",
    authKey: "management" as const,
  },
  {
    title: "Deal Intelligence",
    href: "/deals",
    icon: Radar,
    iconColor: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "hover:border-purple-400/30",
    description: "AI-scored distressed property analysis and recommendations",
    authKey: "deals" as const,
  },
];

export default function Landing() {
  useDocumentTitle("AYA Intelligence Platform");

  const tabAuthQuery = useQuery({
    queryKey: ["tab-auth"],
    queryFn: checkTabAuth,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const tabAuth = tabAuthQuery.data;
  const showOverview = tabAuth?.anyAuthenticated;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-16 pb-10 px-4">
        <img src="/aya-logo.png" alt="AYA" className="h-20 w-auto max-w-[220px] object-contain mb-4" />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          AYA Intelligence Platform
        </h1>
        <p className="text-muted-foreground text-center max-w-md text-sm">
          Real estate development intelligence dashboard. Select a section below to access project data and analytics.
        </p>
      </div>

      {/* Tabs Grid */}
      <div className="flex-1 px-4 pb-16 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Overview - only shown when authenticated to at least one tab */}
          {showOverview && (
            <Link href="/overview" className="sm:col-span-2">
              <Card className="border-white/10 bg-[#12121a] hover:border-teal-400/30 transition-all duration-200 cursor-pointer group">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-400/10 shrink-0">
                    <LayoutDashboard className="h-6 w-6 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-base group-hover:text-teal-400 transition-colors">
                        Overview
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Dashboard summary with key metrics from all sections
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isUnlocked = tabAuth?.[tab.authKey];

            return (
              <Link key={tab.href} href={tab.href}>
                <Card
                  className={`border-white/10 bg-[#12121a] ${tab.borderColor} transition-all duration-200 cursor-pointer group h-full`}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${tab.bgColor} shrink-0`}
                    >
                      <Icon className={`h-6 w-6 ${tab.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-white font-semibold text-base group-hover:${tab.iconColor} transition-colors`}
                        >
                          {tab.title}
                        </h3>
                        {!isUnlocked && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {tab.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
