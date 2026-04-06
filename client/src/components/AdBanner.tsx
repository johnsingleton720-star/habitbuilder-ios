import { useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { isNative, isIOS } from "@/lib/platform";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const PUBLISHER_ID = "ca-pub-6586042200836262";
const AD_SLOT_ID = import.meta.env.VITE_ADSENSE_SLOT_ID as string | undefined;

export function AdBanner() {
  const { isFreeUser } = useSubscription();
  const pushed = useRef(false);

  const isNativeIOS = isNative() && isIOS();

  const shouldShow = isFreeUser && !isNativeIOS && !!AD_SLOT_ID;

  useEffect(() => {
    if (!shouldShow || pushed.current) return;
    try {
      pushed.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div className="w-full" data-testid="ad-banner">
      <p className="text-[10px] text-muted-foreground text-center mb-1 uppercase tracking-widest select-none">
        Advertisement
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
