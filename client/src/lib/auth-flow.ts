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
              try {
                const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
                trackFunnelEvent("auth_google_webview_fallback", { reason: 'token_exchange_failed' });
              } catch {}
              window.location.href = "/api/login";
              return { success: true };
            }
            try {
              const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
              const isNewUser = params.searchParams.get('isNewUser') === 'true';
              trackFunnelEvent(isNewUser ? "auth_signup_success" : "auth_login_success", { method: "google" });
            } catch {}
            window.location.href = '/';
            return { success: true };
          }
          try {
            const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
            trackFunnelEvent("auth_google_webview_fallback", { reason: 'no_token_in_callback' });
          } catch {}
          window.location.href = "/api/login";
          return { success: true };
        }
        try {
          const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
          trackFunnelEvent("auth_google_webview_fallback", { reason: 'unexpected_callback_url' });
        } catch {}
        window.location.href = "/api/login";
        return { success: true };
      } catch (e: any) {
        if (e?.message?.includes('cancelled') || e?.message?.includes('cancel')) {
          return { success: false, error: 'cancelled' };
        }
        try {
          const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
          trackFunnelEvent("auth_google_webview_fallback", { reason: e?.message || 'auth_session_failed' });
        } catch {}
        window.location.href = "/api/login";
        return { success: true };
      }
    }
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
