import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-4 sm:px-6 py-3" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" aria-label="HabitBuilder.pro - Home" data-testid="link-logo-home">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-2 sm:gap-3">
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

        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          data-testid="button-mobile-menu-toggle"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass-panel border-t rounded-none shadow-lg">
          <div className="flex flex-col p-4 gap-1">
            <Link href="/templates" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground" data-testid="link-nav-templates-mobile">
                Templates
              </Button>
            </Link>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground" data-testid="link-nav-blog-mobile">
                Blog
              </Button>
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground" data-testid="link-nav-about-mobile">
                About
              </Button>
            </Link>
            <Button onClick={() => { setMobileMenuOpen(false); window.location.href = "/api/login"; }} variant="ghost" className="w-full justify-start font-medium text-muted-foreground" data-testid="button-nav-signin-mobile">
              Sign In
            </Button>
            <Button onClick={() => { setMobileMenuOpen(false); window.location.href = "/api/login"; }} className="w-full mt-2" data-testid="button-nav-get-started-mobile">
              Get Started Free
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
