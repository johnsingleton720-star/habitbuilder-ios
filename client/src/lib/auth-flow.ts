export async function openAuthFlow() {
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
            await apiRequest('POST', '/api/auth/exchange-token', { token });
            try {
              const { trackFunnelEvent } = await import('@/hooks/use-funnel-tracking');
              trackFunnelEvent("auth_login_success", { method: "google" });
            } catch {}
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
      await Browser.open({ url: 'https://habitbuilder.pro/api/login?returnTo=/api/auth/native-complete' });
      return;
    } catch (e) {
      console.warn('Browser plugin not available, using webview redirect:', e);
    }
  }
  window.location.href = "/api/login";
}
