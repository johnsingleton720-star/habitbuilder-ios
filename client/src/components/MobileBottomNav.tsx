import { Home, BarChart3, Settings, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Only render if user is authenticated
  if (!user) {
    return null;
  }

  // Don't render on paywall page
  const isOnPaywall = location === "/paywall";

  const navItems = [
    {
      label: "Dashboard",
      icon: Home,
      path: "/",
      testId: "nav-item-home",
    },
    {
      label: "Progress",
      icon: BarChart3,
      path: "/progress/today",
      testId: "nav-item-progress",
    },
    {
      label: "Account",
      icon: Settings,
      path: "/account",
      testId: "nav-item-account",
    },
    ...(isOnPaywall
      ? []
      : [
          {
            label: "Upgrade",
            icon: Sparkles,
            path: "/paywall",
            testId: "nav-item-upgrade",
          },
        ]),
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 border-t border-border bg-background/80 backdrop-blur-sm"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-16 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={item.testId}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
