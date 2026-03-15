import { Home, BarChart3, Settings, Leaf } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) {
    return null;
  }

  const navItems = [
    {
      label: "Dashboard",
      icon: Home,
      path: "/",
      testId: "nav-item-home",
    },
    {
      label: "Habits",
      icon: Leaf,
      path: "/#habits",
      testId: "nav-item-habits",
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
  ];

  const isActive = (path: string) => {
    if (path === "/" || path === "/#habits") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  const scrollToHabits = () => {
    setTimeout(() => {
      const habitsSection = document.getElementById("habits-section");
      if (habitsSection) {
        const yOffset = -20;
        const y = habitsSection.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);
  };

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (path === "/#habits") {
      e.preventDefault();
      if (location === "/") {
        scrollToHabits();
      } else {
        window.location.href = "/#habits";
      }
    }
  };

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 border-t border-border bg-background/80 backdrop-blur-sm"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const href = item.path === "/#habits" ? "/" : item.path;

            return (
              <Link key={item.path} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 w-full h-16 transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={item.testId}
                  aria-label={item.label}
                  onClick={(e) => handleNavClick(e, item.path)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
