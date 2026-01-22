import {
  Inbox,
  Search,
  FileQuestion,
  BarChart3,
  Building2,
  Filter,
  Database,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "filter" | "data" | "deals" | "construction";
  className?: string;
}

const variants = {
  default: {
    icon: Inbox,
    gradient: "from-muted to-muted/50",
  },
  search: {
    icon: Search,
    gradient: "from-blue-500/20 to-purple-500/20",
  },
  filter: {
    icon: Filter,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  data: {
    icon: Database,
    gradient: "from-teal-500/20 to-cyan-500/20",
  },
  deals: {
    icon: Building2,
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  construction: {
    icon: BarChart3,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
};

export function EmptyState({
  icon: CustomIcon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const config = variants[variant];
  const Icon = CustomIcon || config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in",
        className
      )}
    >
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br",
          config.gradient
        )}
      >
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {action && (
        <Button onClick={action.onClick} variant="outline" className="group">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Compact empty state for tables
export function EmptyTableState({
  title = "No data found",
  description,
  icon: Icon = FolderOpen,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-sm text-white font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

// Search-specific empty state
export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      icon={Search}
      title="No results found"
      description={`We couldn't find any results for "${query}". Try adjusting your search or filters.`}
      action={
        onClear
          ? {
              label: "Clear Search",
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

// Filter-specific empty state
export function NoFilterResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      variant="filter"
      icon={Filter}
      title="No matches"
      description="No items match your current filters. Try adjusting your criteria."
      action={
        onClear
          ? {
              label: "Clear Filters",
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}
