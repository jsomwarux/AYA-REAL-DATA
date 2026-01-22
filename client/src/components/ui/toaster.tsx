import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const variantIcons = {
  default: null,
  destructive: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

const variantIconColors = {
  default: "text-foreground",
  destructive: "text-red-400",
  success: "text-emerald-400",
  info: "text-blue-400",
  warning: "text-amber-400",
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = "default", ...props }) {
        const Icon = variantIcons[variant as keyof typeof variantIcons];
        const iconColor = variantIconColors[variant as keyof typeof variantIconColors] || variantIconColors.default;

        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="flex items-start gap-3">
              {Icon && (
                <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
    </ToastProvider>
  );
}
