import { useEffect } from "react";

const BASE_TITLE = "Habit Builder";

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | ${BASE_TITLE}`;
    } else {
      document.title = `${BASE_TITLE} - Build Better Habits | AI-Powered Habit Coaching`;
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + window.location.pathname);

    return () => {
      document.title = `${BASE_TITLE} - Build Better Habits | AI-Powered Habit Coaching`;
    };
  }, [pageTitle]);
}
