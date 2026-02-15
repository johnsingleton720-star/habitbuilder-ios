import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function PublicNav() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" aria-label="HabitBuilder.pro - Home" data-testid="link-logo-home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link href="/templates">
            <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-templates">
              Templates
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-blog">
              Blog
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-about">
              About
            </Button>
          </Link>
          <Button onClick={() => window.location.href = "/api/login"} variant="ghost" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
            Sign In
          </Button>
          <Button onClick={() => window.location.href = "/api/login"} data-testid="button-nav-get-started">
            Get Started Free
          </Button>
        </div>
      </div>
    </nav>
  );
}
