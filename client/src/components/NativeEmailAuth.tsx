import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Mail, Lock, ArrowLeft, Eye, EyeOff, User, Sparkles, AlertTriangle } from "lucide-react";
import { SiApple, SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { isIOS, isNative } from "@/lib/platform";
import { trackFunnelEvent } from "@/hooks/use-funnel-tracking";

type AuthMode = "signup" | "login" | "forgot";

interface NativeEmailAuthProps {
  onClose: () => void;
  onSocialAuth: (provider: "apple" | "google") => void;
}

const SESSION_KEY_SOCIAL_FAILED = "habitbuilder_social_auth_failed";
const SESSION_KEY_GOOGLE_CANCEL_COUNT = "habitbuilder_google_cancel_count";

function getSessionFlag(key: string): boolean {
  try { return sessionStorage.getItem(key) === "true"; } catch { return false; }
}

function setSessionFlag(key: string, value: boolean) {
  try { sessionStorage.setItem(key, value ? "true" : "false"); } catch {}
}

function getGoogleCancelCount(): number {
  try { return parseInt(sessionStorage.getItem(SESSION_KEY_GOOGLE_CANCEL_COUNT) || "0", 10) || 0; } catch { return 0; }
}

function incrementGoogleCancelCount(): number {
  const next = getGoogleCancelCount() + 1;
  try { sessionStorage.setItem(SESSION_KEY_GOOGLE_CANCEL_COUNT, String(next)); } catch {}
  return next;
}

function isAppleError1000(message: string): boolean {
  return /error\s*1000/i.test(message);
}

const APPLE_ERROR_1000_MESSAGE =
  "Apple Sign-In couldn't connect. Please check:\n• You're signed into iCloud (Settings → tap your name)\n• Your device has a passcode set\n• You're running iOS 15 or later\n\nOr sign up with email below — it only takes a moment.";

export function NativeEmailAuth({ onClose, onSocialAuth }: NativeEmailAuthProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(true);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [socialAuthFailed, setSocialAuthFailed] = useState(() => getSessionFlag(SESSION_KEY_SOCIAL_FAILED));
  const { toast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const presignupHabit = useMemo(() => {
    try {
      const raw = localStorage.getItem("presignup_data");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.habitTitle || null;
    } catch { return null; }
  }, []);

  const isNativeIOS = isNative() && isIOS();

  useEffect(() => {
    trackFunnelEvent("auth_screen_shown", { mode });

    if (isNativeIOS) {
      import("@capacitor/core").then(({ Capacitor }) => {
        const appleOk = Capacitor.isPluginAvailable("AppleSignIn");
        const googleOk = Capacitor.isPluginAvailable("AuthSession");
        if (!appleOk) setAppleAvailable(false);
        if (!googleOk) setGoogleFailed(true);
        trackFunnelEvent("auth_methods_available", {
          apple: appleOk ? "yes" : "no",
          google: googleOk ? "yes" : "no",
          platform: "ios_native",
        });
      }).catch(() => {
        setAppleAvailable(false);
        trackFunnelEvent("auth_methods_available", {
          apple: "error",
          google: "unknown",
          platform: "ios_native",
        });
      });
    }

    if (getSessionFlag(SESSION_KEY_SOCIAL_FAILED)) {
      scrollToEmail();
    }
  }, []);

  const markSocialFailed = () => {
    setSocialAuthFailed(true);
    setSessionFlag(SESSION_KEY_SOCIAL_FAILED, true);
  };

  const scrollToEmail = () => {
    setTimeout(() => {
      emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      emailInputRef.current?.focus();
    }, 300);
  };

  const handleAppleNativeSignIn = async () => {
    trackFunnelEvent("auth_apple_tapped");
    if (!isNative() || !isIOS()) {
      onSocialAuth("apple");
      return;
    }

    setAppleLoading(true);
    setError("");

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isPluginAvailable("AppleSignIn")) {
        trackFunnelEvent("auth_signup_failed", { method: "apple", error: "plugin_not_available" });
        setAppleAvailable(false);
        markSocialFailed();
        setError("Apple Sign-In isn't available on this version. Please use your email below to sign up — it only takes a moment.");
        setAppleLoading(false);
        scrollToEmail();
        return;
      }

      const { AppleSignIn } = await import("capacitor-apple-sign-in");
      const result = await AppleSignIn.signIn();

      if (!result.identityToken) {
        trackFunnelEvent("auth_signup_failed", { method: "apple", error: "no_identity_token" });
        markSocialFailed();
        setError("Apple Sign-In didn't complete. Please use your email below — it only takes a moment.");
        setAppleLoading(false);
        scrollToEmail();
        return;
      }

      const res = await fetch("/api/auth/apple-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identityToken: result.identityToken,
          user: result.user,
          email: result.email,
          givenName: result.givenName,
          familyName: result.familyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        trackFunnelEvent("auth_signup_failed", { method: "apple", error: data.error || "server_error" });
        markSocialFailed();
        setError(data.error || "Apple Sign-In failed. Please use your email below instead.");
        setAppleLoading(false);
        scrollToEmail();
        return;
      }

      trackFunnelEvent(data.isNewUser ? "auth_signup_success" : "auth_login_success", { method: "apple" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("cancel")) {
        setAppleLoading(false);
        return;
      }
      const errMsg = err?.message || "unknown";
      trackFunnelEvent("auth_signup_failed", { method: "apple", error: errMsg });
      setAppleAvailable(false);
      markSocialFailed();

      if (isAppleError1000(errMsg)) {
        setError(APPLE_ERROR_1000_MESSAGE);
      } else {
        setError("Apple Sign-In isn't working right now. Please use your email below — it's quick and easy.");
      }
      setAppleLoading(false);
      scrollToEmail();
    }
  };

  const handleGoogleSignIn = async () => {
    trackFunnelEvent("auth_google_tapped");

    if (!isNative() || !isIOS()) {
      onSocialAuth("google");
      return;
    }

    setGoogleLoading(true);
    setError("");

    try {
      const { openAuthFlow } = await import("@/lib/auth-flow");
      const result = await openAuthFlow();

      if (result.success) {
        return;
      }

      if (result.error === "cancelled") {
        const count = incrementGoogleCancelCount();
        trackFunnelEvent("auth_google_cancelled", { count: String(count) });
        if (count >= 2) {
          setGoogleFailed(true);
          markSocialFailed();
          setError("Google sign-in doesn't seem to be working on this device. Please use your email below — it only takes a moment.");
          scrollToEmail();
        }
        setGoogleLoading(false);
        return;
      }

      if (result.error === "auth_timeout") {
        trackFunnelEvent("auth_google_timeout", { method: "google" });
        setGoogleFailed(true);
        markSocialFailed();
        setError("Google sign-in took too long to respond. This usually means it can't connect on this device.\n\nPlease use your email below — it's quick and reliable.");
        scrollToEmail();
        setGoogleLoading(false);
        return;
      }

      if (result.error === "auth_plugin_unavailable") {
        trackFunnelEvent("auth_signup_failed", { method: "google", error: "plugin_not_available" });
        setGoogleFailed(true);
        markSocialFailed();
        setError("Google sign-in isn't available on this version. Please use your email below — it only takes a moment.");
        scrollToEmail();
        setGoogleLoading(false);
        return;
      }

      trackFunnelEvent("auth_signup_failed", { method: "google", error: result.error || "unknown" });
      setGoogleFailed(true);
      markSocialFailed();
      const fallbackMsg = appleAvailable
        ? "Google sign-in didn't work. Try Apple Sign-In, or use your email below."
        : "Google sign-in didn't work. Please use your email below — it only takes a moment.";
      setError(fallbackMsg);
      scrollToEmail();
    } catch (e: any) {
      if (e?.message?.includes("cancelled") || e?.message?.includes("cancel")) {
        const count = incrementGoogleCancelCount();
        trackFunnelEvent("auth_google_cancelled", { count: String(count) });
        if (count >= 2) {
          setGoogleFailed(true);
          markSocialFailed();
          setError("Google sign-in doesn't seem to be working on this device. Please use your email below — it only takes a moment.");
          scrollToEmail();
        }
        setGoogleLoading(false);
        return;
      }
      trackFunnelEvent("auth_signup_failed", { method: "google", error: e?.message || "unknown" });
      setGoogleFailed(true);
      markSocialFailed();
      const fallbackMsg = appleAvailable
        ? "Google sign-in failed. Try Apple Sign-In, or use your email below."
        : "Google sign-in failed. Please use your email below — it only takes a moment.";
      setError(fallbackMsg);
      scrollToEmail();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    trackFunnelEvent("auth_email_submit", { mode });
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/email-signup" : "/api/auth/email-login";
      const body: Record<string, string> = { email, password };
      if (mode === "signup" && firstName.trim()) {
        body.firstName = firstName.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        trackFunnelEvent(mode === "signup" ? "auth_signup_failed" : "auth_login_failed", { method: "email", error: data.error || "unknown" });
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      trackFunnelEvent(mode === "signup" ? "auth_signup_success" : "auth_login_success", { method: "email" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (err) {
      trackFunnelEvent(mode === "signup" ? "auth_signup_failed" : "auth_login_failed", { method: "email", error: "connection_failed" });
      setError("Connection failed. Please check your internet and try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setForgotSent(true);
      setLoading(false);
    } catch (err) {
      setError("Connection failed. Please check your internet and try again.");
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setForgotSent(false);
  };

  const resetSocialAuth = () => {
    setSocialAuthFailed(false);
    setGoogleFailed(false);
    setAppleAvailable(true);
    setError("");
    setSessionFlag(SESSION_KEY_SOCIAL_FAILED, false);
  };

  const showSocialButtons = mode !== "forgot" && !socialAuthFailed;
  const showEmailProminent = socialAuthFailed || isNativeIOS;
  const hasSocialOptions = (appleAvailable || !googleFailed) && showSocialButtons;

  const emailFormBlock = (
    <>
      {showEmailProminent && mode !== "forgot" && !isNativeIOS && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
            <Mail className="w-4 h-4" />
            Sign up with email instead
          </div>
          <p className="text-xs text-muted-foreground">Quick and easy — just enter your details below</p>
        </div>
      )}

      {mode === "forgot" && forgotSent ? (
        <div className="text-center py-8" data-testid="forgot-password-sent">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
          </p>
          <Button onClick={() => switchMode("login")} variant="outline" className="w-full" data-testid="button-back-to-login">
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={mode === "forgot" ? handleForgotPassword : handleEmailAuth} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium">Name (optional)</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-10"
                  data-testid="input-auth-firstname"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                autoComplete="email"
                className={`pl-10 ${showEmailProminent ? "ring-2 ring-primary/50" : ""}`}
                data-testid="input-auth-email"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pl-10 pr-10"
                  data-testid="input-auth-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className={`w-full h-12 text-base font-semibold ${showEmailProminent ? "animate-pulse-once" : ""}`}
            disabled={loading || appleLoading || googleLoading}
            data-testid="button-auth-submit"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "signup" ? (
              "Create Account"
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Send Reset Link"
            )}
          </Button>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="w-full text-sm text-primary font-medium py-2"
              data-testid="button-forgot-password"
            >
              Forgot your password?
            </button>
          )}
        </form>
      )}
    </>
  );

  const socialButtonsBlock = hasSocialOptions ? (
    <div className="space-y-3">
      {appleAvailable && (
        <button
          onClick={handleAppleNativeSignIn}
          disabled={appleLoading || googleLoading || loading}
          className="flex items-center justify-center gap-3 w-full p-3.5 rounded-xl border bg-foreground text-background font-semibold text-sm disabled:opacity-70"
          data-testid="button-auth-apple"
        >
          {appleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <SiApple className="w-5 h-5" />
          )}
          Continue with Apple
        </button>
      )}
      {!googleFailed && (
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || appleLoading || loading}
          className="flex items-center justify-center gap-3 w-full p-3.5 rounded-xl border font-semibold text-sm disabled:opacity-70"
          data-testid="button-auth-google"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <SiGoogle className="w-4 h-4" />
          )}
          Continue with Google
        </button>
      )}
    </div>
  ) : null;

  const dividerBlock = (label: string) => (
    <div className="relative flex items-center my-6">
      <div className="flex-1 border-t" />
      <span className="px-4 text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex-1 border-t" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col safe-top safe-bottom" data-testid="native-email-auth-screen">
      <div className="flex items-center p-4">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-muted" data-testid="button-auth-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="mb-4"><Logo /></div>
            <h1 className="text-2xl font-bold font-display mb-1">
              {mode === "signup" && "Create your account"}
              {mode === "login" && "Welcome back"}
              {mode === "forgot" && "Reset password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" && (isNativeIOS ? "Enter your email to get started — it takes 30 seconds" : "Start building better habits today")}
              {mode === "login" && "Sign in to continue your journey"}
              {mode === "forgot" && "We'll send you a link to reset it"}
            </p>
          </div>

          {mode === "signup" && presignupHabit && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 mb-6" data-testid="presignup-plan-banner">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Your plan for "{presignupHabit}" is ready</p>
                <p className="text-xs text-muted-foreground">Sign up to save it and start your free trial</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4" data-testid="text-auth-error">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-line">{error}</p>
            </div>
          )}

          {socialAuthFailed && mode !== "forgot" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-4" data-testid="having-trouble-tip">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Having trouble signing in?</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Email signup is the most reliable option — it takes about 30 seconds. Just enter your details below and you're all set.
                </p>
              </div>
            </div>
          )}

          {isNativeIOS ? (
            <>
              {emailFormBlock}
              {socialButtonsBlock && mode !== "forgot" && (
                <>
                  {dividerBlock("or continue with")}
                  {socialButtonsBlock}
                </>
              )}
            </>
          ) : (
            <>
              {showSocialButtons && (
                <>
                  <div className="space-y-3 mb-6">
                    {socialButtonsBlock}
                    <p className="text-xs text-muted-foreground text-center mt-2" data-testid="text-social-auth-note">
                      {appleAvailable ? "Opens secure sign-in, then brings you right back" : "Sign in with Google or use your email below"}
                    </p>
                  </div>
                  {dividerBlock("or")}
                </>
              )}
              {emailFormBlock}
            </>
          )}

          {mode !== "forgot" && (
            <div className="text-center mt-6">
              {mode === "signup" ? (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => switchMode("login")} className="text-primary font-semibold" data-testid="button-switch-to-login">
                    Sign In
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => switchMode("signup")} className="text-primary font-semibold" data-testid="button-switch-to-signup">
                    Sign Up
                  </button>
                </p>
              )}
            </div>
          )}

          {socialAuthFailed && !showSocialButtons && mode !== "forgot" && (
            <div className="text-center mt-4">
              <button
                onClick={resetSocialAuth}
                className="text-xs text-muted-foreground underline"
                data-testid="button-retry-social"
              >
                Try social sign-in again
              </button>
            </div>
          )}

          {mode === "forgot" && !forgotSent && (
            <div className="text-center mt-6">
              <button onClick={() => switchMode("login")} className="text-sm text-primary font-semibold" data-testid="button-back-to-signin">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
