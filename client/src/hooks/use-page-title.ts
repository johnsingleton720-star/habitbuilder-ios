import { useEffect } from "react";

const BASE_TITLE = "HabitBuilder.pro";
const SITE_URL = "https://habitbuilder.pro";
const DEFAULT_DESCRIPTION = "Build lasting habits with AI-powered coaching. Personalized daily action plans, guided sessions with timers, streak tracking, XP leveling, and progress analytics. Start with 1 habit free forever.";

export function usePageTitle(pageTitle?: string, metaDescription?: string) {
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
    canonical.setAttribute("href", SITE_URL + window.location.pathname);

    let descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (descTag) {
      descTag.setAttribute("content", metaDescription || DEFAULT_DESCRIPTION);
    }

    let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) {
      ogTitle.setAttribute("content", pageTitle ? `${pageTitle} | ${BASE_TITLE}` : `${BASE_TITLE} - AI-Powered Habit Coaching App | Build Habits That Stick`);
    }

    let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) {
      ogDesc.setAttribute("content", metaDescription || DEFAULT_DESCRIPTION);
    }

    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (ogUrl) {
      ogUrl.setAttribute("content", SITE_URL + window.location.pathname);
    }

    return () => {
      document.title = `${BASE_TITLE} - Build Better Habits | AI-Powered Habit Coaching`;
    };
  }, [pageTitle, metaDescription]);
}
