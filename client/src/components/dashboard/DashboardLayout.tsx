import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarProvider, useSidebar } from "./Sidebar";
import { RefreshCw, Menu, X, Clock, LayoutDashboard, Building2, DollarSign, Calendar, Radar, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUserRole } from "@/components/PasswordGate";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface MobileNavItem {
  title: string;
  href: string;
  icon: ReactNode;
  iconColor: string;
  managementOnly?: boolean;
}

const mobileNavItems: MobileNavItem[] = [
  { title: "Overview", href: "/", icon: <LayoutDashboard className="h-5 w-5" />, iconColor: "text-teal-400" },
  { title: "Construction", href: "/construction", icon: <Building2 className="h-5 w-5" />, iconColor: "text-blue-400" },
  { title: "Budget", href: "/budget", icon: <DollarSign className="h-5 w-5" />, iconColor: "text-green-400", managementOnly: true },
  { title: "Timeline", href: "/timeline", icon: <Calendar className="h-5 w-5" />, iconColor: "text-amber-400", managementOnly: true },
  { title: "Deal Intelligence", href: "/deals", icon: <Radar className="h-5 w-5" />, iconColor: "text-purple-400", managementOnly: true },
];

function Header({ title, subtitle, onRefresh, isLoading }: Omit<DashboardLayoutProps, 'children'>) {
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      setLastSync(new Date());
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  // Auto-update the "last sync" display
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync((prev) => prev);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-white/10 bg-background/95 px-3 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu button */}
      <div className="flex items-center gap-3 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-background border-white/10">
            <MobileSidebar onClose={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Title section - desktop */}
      <div className="hidden lg:block">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Mobile title */}
      <div className="lg:hidden flex-1 min-w-0 mx-2">
        <h1 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Last sync indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
            </span>
            <span>Synced</span>
          </div>
          <span className="text-muted-foreground/50">|</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatLastSync(lastSync)}</span>
          </div>
        </div>

        {/* Mobile sync dot */}
        <div className="md:hidden flex items-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
          </span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-background group h-8 sm:h-9 px-2 sm:px-3"
          >
            <RefreshCw className={cn(
              "h-4 w-4 sm:mr-2 transition-transform duration-500",
              isLoading && "animate-spin",
              !isLoading && "group-hover:rotate-180"
            )} />
            <span className="hidden sm:inline">{isLoading ? "Syncing..." : "Refresh"}</span>
          </Button>
        )}

      </div>
    </header>
  );
}

function MobileSidebar({ onClose }: { onClose: () => void }) {
  const [location] = useLocation();
  const role = useUserRole();
  const visibleItems = role === "management"
    ? mobileNavItems
    : mobileNavItems.filter(item => !item.managementOnly);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-teal">
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">AYA</span>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Intelligence Platform
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground px-3">
          Main
        </div>
        {visibleItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <span className={cn(isActive ? item.iconColor : "text-current", "transition-colors")}>
                {item.icon}
              </span>
              <span className="flex-1">{item.title}</span>
              {item.managementOnly && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DashboardContent({
  children,
  title,
  subtitle,
  onRefresh,
  isLoading
}: DashboardLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-sidebar",
        isCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
      )}>
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />

        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent {...props} />
    </SidebarProvider>
  );
}
