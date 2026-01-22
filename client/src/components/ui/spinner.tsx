import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "teal" | "purple" | "white";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
  xl: "h-12 w-12 border-4",
};

const variantClasses = {
  default: "border-muted-foreground/30 border-t-muted-foreground",
  teal: "border-teal-500/30 border-t-teal-500",
  purple: "border-purple-500/30 border-t-purple-500",
  white: "border-white/30 border-t-white",
};

export function Spinner({ size = "md", variant = "default", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Full page loading spinner
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fade-in">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-teal-500/20 animate-pulse" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm animate-pulse-soft">{message}</p>
    </div>
  );
}

// Inline loading indicator
export function InlineLoader({ text = "Loading" }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
      <Spinner size="sm" variant="teal" />
      <span>{text}</span>
      <span className="animate-pulse">...</span>
    </div>
  );
}

// Button loading state
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <Spinner size="sm" variant="white" className={cn("-ml-1 mr-2", className)} />
  );
}
