import { useEffect } from "react";

const BASE_TITLE = "Habit Builder";

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | ${BASE_TITLE}`;
    } else {
      document.title = `${BASE_TITLE} - Build Better Habits | AI-Powered Habit Coaching`;
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", window.location.origin + window.location.pathname);
    }

    return () => {
      document.title = `${BASE_TITLE} - Build Better Habits | AI-Powered Habit Coaching`;
    };
  }, [pageTitle]);
}
