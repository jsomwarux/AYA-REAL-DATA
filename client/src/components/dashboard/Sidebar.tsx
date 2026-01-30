import { useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/components/PasswordGate";

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
}

const mainNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5" />,
    iconColor: "text-teal-400",
    description: "Dashboard overview",
  },
  {
    title: "Construction Progress",
    href: "/construction",
    icon: <Building2 className="h-5 w-5" />,
    iconColor: "text-blue-400",
    description: "Room-by-room progress tracking",
  },
  {
    title: "Budget",
    href: "/budget",
    icon: <DollarSign className="h-5 w-5" />,
    iconColor: "text-green-400",
    description: "Project budget tracking",
    managementOnly: true,
  },
  {
    title: "Timeline",
    href: "/timeline",
    icon: <Calendar className="h-5 w-5" />,
    iconColor: "text-amber-400",
    description: "Project schedule and milestones",
    managementOnly: true,
  },
  {
    title: "Deal Intelligence",
    href: "/deals",
    icon: <Radar className="h-5 w-5" />,
    iconColor: "text-purple-400",
    description: "Score distressed properties",
    badge: "Protected",
    managementOnly: true,
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
  const role = useUserRole();
  const visibleNavItems = role === "management"
    ? mainNavItems
    : mainNavItems.filter(item => !item.managementOnly);

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
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-teal">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <span className="text-xl font-bold tracking-tight text-white">AYA</span>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Intelligence Platform
                </p>
              </div>
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
