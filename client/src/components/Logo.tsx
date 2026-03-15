import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const containerSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-8 h-8 rounded-xl",
    lg: "w-10 h-10 rounded-xl",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <span className={cn("flex items-center gap-2", className)} data-testid="logo-habitbuilder">
      <span className={cn("flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20", containerSizes[size])}>
        <Leaf className={cn(iconSizes[size], "text-white drop-shadow-sm")} />
      </span>
      {showText && (
        <span className={cn("font-display font-bold tracking-tight", textSizes[size])}>
          <span className="text-foreground">Habit</span>
          <span className="text-emerald-600 dark:text-emerald-400">Builder</span>
          <span className="text-muted-foreground">.pro</span>
        </span>
      )}
    </span>
  );
}

export function LogoFooter({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)} data-testid="logo-footer">
      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
        <Leaf className="w-3.5 h-3.5 text-white" />
      </span>
      <span className="text-sm font-semibold">
        <span className="text-foreground">Habit</span>
        <span className="text-emerald-600 dark:text-emerald-400">Builder</span>
        <span className="text-muted-foreground">.pro</span>
      </span>
    </span>
  );
}
