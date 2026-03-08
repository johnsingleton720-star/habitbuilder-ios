import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X, ArrowRight, ShieldCheck, CreditCard, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { SiGoogle, SiApple } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isNative } from "@/lib/platform";

const AUTH_BASE_URL = 'https://habitbuilder.pro';

async function openAuthFlow() {
  if (isNative()) {
    const { isIOS } = await import("@/lib/platform");
    if (isIOS()) {
      try {
        const { AuthSession } = await import('capacitor-auth-session');
        const result = await AuthSession.start({
          url: `${AUTH_BASE_URL}/api/login?returnTo=/api/auth/native-complete`,
          callbackUrlScheme: 'habitbuilder',
          preferEphemeralSession: true,
        });
        if (result.url && result.url.startsWith('habitbuilder://auth')) {
          const params = new URL(result.url.replace('habitbuilder://', 'https://placeholder/'));
          const token = params.searchParams.get('token');
          if (token) {
            const { apiRequest } = await import('@/lib/queryClient');
            await apiRequest('POST', '/api/auth/exchange-token', { token });
            window.location.href = '/';
            return;
          }
        }
      } catch (e: any) {
        if (e?.message?.includes('cancelled') || e?.message?.includes('cancel')) return;
        console.warn('AuthSession not available, falling back to Browser:', e);
      }
    }
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: `${AUTH_BASE_URL}/api/login?returnTo=/api/auth/native-complete` });
      return;
    } catch (e) {
      console.warn('Browser plugin not available, using webview redirect:', e);
    }
  }
  window.location.href = "/api/login";
}

function NavLoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const handleContinue = () => {
    onOpenChange(false);
    openAuthFlow();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-nav-login-transition">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-display">Create your account in seconds</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <p className="text-center text-muted-foreground text-sm">
            Sign in securely — use your Google, Apple, or email account.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-nav-continue-google"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <SiGoogle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Google</p>
                <p className="text-xs text-muted-foreground">Use your Gmail or Google account</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-nav-continue-apple"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <SiApple className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Apple</p>
                <p className="text-xs text-muted-foreground">Use your Apple ID</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border/50" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border/50" />
            </div>
            <button
              onClick={handleContinue}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-full text-left hover-elevate cursor-pointer"
              data-testid="button-nav-continue-email"
            >
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Continue with Email</p>
                <p className="text-xs text-muted-foreground">Create an account with email & password</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
          <p className="text-xs text-center text-muted-foreground bg-muted/40 rounded-lg p-3">
            You'll be taken to a secure sign-in page. Choose Google, Apple, or create an account with email & password.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure & encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>No credit card needed</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleSignUpClick = () => {
    setMobileMenuOpen(false);
    setShowLoginDialog(true);
  };

  const handleSignInClick = () => {
    setMobileMenuOpen(false);
    openAuthFlow();
  };

  return (
    <>
      <NavLoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-4 sm:px-6 py-3 safe-top" aria-label="Main navigation">
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
            <Button onClick={handleSignInClick} variant="ghost" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
              Sign In
            </Button>
            <Button onClick={handleSignUpClick} data-testid="button-nav-get-started">
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
              <Button onClick={handleSignInClick} variant="ghost" className="w-full justify-start font-medium text-muted-foreground" data-testid="button-nav-signin-mobile">
                Sign In
              </Button>
              <Button onClick={handleSignUpClick} className="w-full mt-2" data-testid="button-nav-get-started-mobile">
                Get Started Free
              </Button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
