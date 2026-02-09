import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <span className={cn("flex items-center gap-1.5", className)} data-testid="logo-habitbuilder">
      <Leaf className={cn(iconSizes[size], "text-emerald-600 fill-emerald-600/20")} />
      {showText && (
        <span className={cn("font-display font-bold tracking-tight", textSizes[size])}>
          <span className="text-[#0a1628] dark:text-[#c5d0e6]">Habit</span>
          <span className="text-emerald-600">Builder</span>
          <span className="text-[#0a1628] dark:text-[#c5d0e6]">.pro</span>
        </span>
      )}
    </span>
  );
}

export function LogoFooter({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} data-testid="logo-footer">
      <Leaf className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
      <span className="text-sm font-medium">
        <span className="text-[#0a1628] dark:text-[#c5d0e6]">Habit</span>
        <span className="text-emerald-600">Builder</span>
        <span className="text-[#0a1628] dark:text-[#c5d0e6]">.pro</span>
      </span>
    </span>
  );
}
