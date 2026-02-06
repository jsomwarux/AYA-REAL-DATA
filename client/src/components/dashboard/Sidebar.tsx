import { useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  HardHat,
  Radar,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Lock,
  Building2,
  DollarSign,
  Calendar,
  Target,
  Ship,
  BedDouble,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TabAuthStatus } from "@/components/TabPasswordGate";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  iconColor: string;
  description?: string;
  badge?: string;
  managementOnly?: boolean;
  /** Which tab-auth key is required to show this item. "anyAuthenticated" for Overview. */
  requiredAuth?: keyof TabAuthStatus;
}

const mainNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
    iconColor: "text-teal-400",
    description: "Dashboard overview",
    requiredAuth: "anyAuthenticated",
  },
  {
    title: "Construction Progress",
    href: "/construction",
    icon: <Building2 className="h-5 w-5" />,
    iconColor: "text-blue-400",
    description: "Room-by-room progress tracking",
    requiredAuth: "construction",
  },
  {
    title: "Budget",
    href: "/budget",
    icon: <DollarSign className="h-5 w-5" />,
    iconColor: "text-green-400",
    description: "Project budget tracking",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Timeline",
    href: "/timeline",
    icon: <Calendar className="h-5 w-5" />,
    iconColor: "text-amber-400",
    description: "Project schedule and milestones",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Weekly Goals",
    href: "/weekly-goals",
    icon: <Target className="h-5 w-5" />,
    iconColor: "text-orange-400",
    description: "Weekly sprint goals and progress",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Container Schedule",
    href: "/container-schedule",
    icon: <Ship className="h-5 w-5" />,
    iconColor: "text-cyan-400",
    description: "Shipment tracking from factory to warehouse",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Room Specs",
    href: "/room-specs",
    icon: <BedDouble className="h-5 w-5" />,
    iconColor: "text-rose-400",
    description: "Room specifications and fact sheet",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Vendor Invoices",
    href: "/vendor-invoices",
    icon: <FileText className="h-5 w-5" />,
    iconColor: "text-yellow-400",
    description: "Browse vendor documents and invoices",
    managementOnly: true,
    requiredAuth: "management",
  },
  {
    title: "Deal Intelligence",
    href: "/deals",
    icon: <Radar className="h-5 w-5" />,
    iconColor: "text-purple-400",
    description: "Score distressed properties",
    badge: "Protected",
    managementOnly: true,
    requiredAuth: "deals",
  },
];

const bottomNavItems: NavItem[] = [];

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

function NavLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const [location] = useLocation();
  const isActive = location === item.href;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isCollapsed ? "justify-center" : "",
        isActive
          ? "bg-white/10 text-white"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn(isActive ? item.iconColor : "text-current", "transition-colors")}>
        {item.icon}
      </span>
      {!isCollapsed && (
        <div className="flex items-center justify-between flex-1 animate-fade-in">
          <span>{item.title}</span>
          {item.badge && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
              <Lock className="h-2.5 w-2.5" />
              {item.badge}
            </span>
          )}
        </div>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.title}</span>
            {item.badge && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                <Lock className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const tabAuthQuery = useQuery({
    queryKey: ["tab-auth"],
    queryFn: async (): Promise<TabAuthStatus> => {
      const res = await fetch("/api/auth/tab-check");
      if (!res.ok) throw new Error("Tab auth check failed");
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const tabAuth = tabAuthQuery.data;
  const visibleNavItems = mainNavItems.filter(item => {
    if (!item.requiredAuth) return true;
    return tabAuth?.[item.requiredAuth] ?? false;
  });

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-white/10 bg-background transition-sidebar",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-white/10",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}>
          <Link href="/" className="flex items-center">
            {isCollapsed ? (
              <img src="/aya-icon.png" alt="AYA" className="h-7 w-auto object-contain" />
            ) : (
              <img src="/aya-icon.png" alt="AYA" className="h-9 w-auto object-contain" />
            )}
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          <div className={cn(
            "mb-2 text-[10px] uppercase tracking-wider text-muted-foreground",
            isCollapsed ? "text-center" : "px-3"
          )}>
            {isCollapsed ? "•" : "Main"}
          </div>
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
          {/* Settings */}
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}

          {/* Collapse Toggle */}
          <div className={cn("mt-3", isCollapsed ? "flex justify-center" : "")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "text-muted-foreground hover:text-white hover:bg-white/5",
                isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start gap-2"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
