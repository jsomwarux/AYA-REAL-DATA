import { ReactNode, useState, useEffect } from "react";
import { Sidebar, SidebarProvider, useSidebar } from "./Sidebar";
import { RefreshCw, Menu, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu button */}
      <div className="flex items-center gap-4 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-background border-white/10">
            <MobileSidebar onClose={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Title section */}
      <div className="hidden lg:block">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Mobile title */}
      <div className="lg:hidden">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
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

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-background group"
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2 transition-transform duration-500",
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
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
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
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation placeholder - will be rendered by Sidebar */}
      <div className="flex-1 p-4">
        <p className="text-xs text-muted-foreground">Use desktop for full navigation</p>
      </div>
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
        <main className="p-4 md:p-6 animate-fade-in">
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
