export async function openAuthFlow(): Promise<{ success: boolean; error?: string }> {
  const stored = sessionStorage.getItem("utm_params");
  if (stored) {
    try {
      await fetch("/api/store-utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: stored,
      });
    } catch {}
  }
  const { isNative, isIOS } = await import("@/lib/platform");
  if (isNative()) {
    if (isIOS()) {
      try {
        const { AuthSession } = await import('capacitor-auth-session');
        const result = await AuthSession.start({
          url: 'https://habitbuilder.pro/api/login?returnTo=/api/auth/native-complete',
          callbackUrlScheme: 'habitbuilder',
          preferEphemeralSession: true,
        });
        if (result.url && result.url.startsWith('habitbuilder://auth')) {
          const params = new URL(result.url.replace('habitbuilder://', 'https://placeholder/'));
          const token = params.searchParams.get('token');
          if (token) {
            const { apiRequest } = await import('@/lib/queryClient');
            const exchangeRes = await apiRequest('POST', '/api/auth/exchange-token', { token });
            if (!exchangeRes.ok) {
              return { success: false, error: 'token_exchange_failed' };
            }
            try {
              const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
              const isNewUser = params.searchParams.get('isNewUser') === 'true';
              trackFunnelEvent(isNewUser ? "auth_signup_success" : "auth_login_success", { method: "google" });
            } catch {}
            window.location.href = '/';
            return { success: true };
          }
          return { success: false, error: 'no_token_in_callback' };
        }
        return { success: false, error: 'unexpected_callback_url' };
      } catch (e: any) {
        if (e?.message?.includes('cancelled') || e?.message?.includes('cancel')) {
          return { success: false, error: 'cancelled' };
        }
        // Do NOT fall back to Browser.open() on iOS — a regular browser can't handle
        // the habitbuilder:// callback URL scheme, so the user would complete OAuth in
        // Safari but be unable to return to the app. Surfacing the error is better.
        return { success: false, error: e?.message || 'auth_session_failed' };
      }
    }
    // Android: Browser.open() works because the OS handles the custom URL scheme
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: 'https://habitbuilder.pro/api/login?returnTo=/api/auth/native-complete' });
      return { success: false, error: 'browser_opened' };
    } catch (e) {
      console.warn('Browser plugin not available, using webview redirect:', e);
    }
  }
  window.location.href = "/api/login";
  return { success: true };
}
