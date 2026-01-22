import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, FileWarning } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  variant?: "default" | "network" | "server" | "notFound" | "inline";
  className?: string;
}

const variants = {
  default: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  network: {
    icon: WifiOff,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  server: {
    icon: ServerCrash,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  notFound: {
    icon: FileWarning,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
  inline: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    bgColor: "transparent",
  },
};

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an error while loading your data. Please try again.",
  onRetry,
  retryText = "Try Again",
  variant = "default",
  className,
}: ErrorStateProps) {
  const config = variants[variant];
  const Icon = config.icon;

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5", className)}>
        <Icon className={cn("h-5 w-5 flex-shrink-0", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{title}</p>
          {message && <p className="text-xs text-muted-foreground mt-0.5">{message}</p>}
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="flex-shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in-up",
        className
      )}
      role="alert"
    >
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          config.bgColor
        )}
      >
        <Icon className={cn("h-10 w-10", config.iconColor)} />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>

      {onRetry && (
        <Button
          onClick={onRetry}
          className="group"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2 transition-transform group-hover:rotate-180 duration-500" />
          {retryText}
        </Button>
      )}
    </div>
  );
}

// Compact error for cards/sections
export function ErrorCard({
  title = "Failed to load",
  onRetry,
  className,
}: {
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg border border-red-500/20 bg-red-500/5",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
      <p className="text-sm text-white mb-3">{title}</p>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="text-red-400 hover:text-red-300">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
