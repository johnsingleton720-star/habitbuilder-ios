import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles, BarChart3, Target, Zap, Heart, Navigation, Layout } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { AnimatePresence, motion } from "framer-motion";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right";
  requiresTier?: "pro" | "premium";
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const ALL_STEPS: TourStep[] = [
  {
    selector: '[data-testid="card-dashboard-hero"]',
    title: "Your Progress at a Glance",
    description: "Track your level, XP earned, and current streak right here. Complete habits and tasks daily to earn XP and level up!",
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    position: "bottom",
  },
  {
    selector: '[data-tour="daily-action-center"]',
    title: "Your Daily Action Center",
    description: "This is where you'll find today's focus — the habits and tasks that matter most right now. Quick tasks let you add personal to-dos alongside your habits.",
    icon: <Target className="w-5 h-5 text-emerald-500" />,
    position: "bottom",
  },
  {
    selector: '#habits-section',
    title: "Your Habits",
    description: "All your habits live here. Tap any habit to see your personalized AI action plan, start guided sessions, and track your streaks. Use the + button to add more.",
    icon: <Sparkles className="w-5 h-5 text-primary" />,
    position: "top",
  },
  {
    selector: '[data-tour="achievements-section"]',
    title: "Earn Rewards",
    description: "You'll earn achievement badges and XP for hitting milestones — streak goals, completion targets, and more. Watch your progress grow over time!",
    icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
    position: "top",
  },
  {
    selector: '[data-tour="feature-links"]',
    title: "Powerful Tools",
    description: "Access Focus Timer for deep work sessions, Mood Check-in to track how you feel, Goals to set targets, and the Smart Planner for AI-optimized daily schedules.",
    icon: <Layout className="w-5 h-5 text-blue-500" />,
    position: "top",
  },
  {
    selector: '[data-tour="user-menu-trigger"]',
    title: "More Features",
    description: "Tap your profile picture to access AI Coach Chat, Daily Journal, Analytics, Community Forum, Accountability Partners, and more. There's a lot to explore!",
    icon: <Heart className="w-5 h-5 text-rose-500" />,
    position: "bottom",
  },
  {
    selector: '[data-tour="progress-link"]',
    title: "Track Your Progress",
    description: "View your habit streaks, completion trends, and detailed stats over time. See how your consistency builds real results!",
    icon: <BarChart3 className="w-5 h-5 text-indigo-500" />,
    position: "top",
    mobileOnly: true,
  },
  {
    selector: '[data-testid="mobile-bottom-nav"]',
    title: "Navigate the App",
    description: "Use the bottom bar to quickly jump between your Dashboard, Habits, Progress charts, and Account settings.",
    icon: <Navigation className="w-5 h-5 text-teal-500" />,
    position: "top",
    mobileOnly: true,
  },
];

const TOUR_STORAGE_KEY = "featureTourCompleted";

interface FeatureTourProps {
  onComplete: () => void;
}

export function FeatureTour({ onComplete }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { tier } = useSubscription();

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const steps = ALL_STEPS.filter((step) => {
    if (step.requiresTier === "pro" && tier === "free") return false;
    if (step.requiresTier === "premium" && tier !== "premium") return false;
    if (step.mobileOnly && !isMobile) return false;
    if (step.desktopOnly && isMobile) return false;
    return true;
  });

  const step = steps[currentStep];

  const positionTooltip = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  const scrollToElement = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isInView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(positionTooltip, 400);
      } else {
        positionTooltip();
      }
    }
  }, [step, positionTooltip]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    scrollToElement();
    const handleResize = () => positionTooltip();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", positionTooltip);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", positionTooltip);
    };
  }, [currentStep, isVisible, scrollToElement, positionTooltip]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible || !step) return null;

  const padding = 8;
  const maxSpotlightHeight = Math.floor(window.innerHeight * 0.35);
  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: Math.min(targetRect.height + padding * 2, maxSpotlightHeight),
      }
    : null;

  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipEstimatedHeight = 140;
    const centerX = targetRect.left + targetRect.width / 2;
    const effectiveBottom = spotlightStyle
      ? spotlightStyle.top + spotlightStyle.height
      : targetRect.bottom;

    let leftPos = centerX - tooltipWidth / 2;
    leftPos = Math.max(16, Math.min(leftPos, window.innerWidth - tooltipWidth - 16));

    const spaceBelow = window.innerHeight - effectiveBottom - padding - 12;
    const spaceAbove = (targetRect.top - padding - 12);

    switch (step.position) {
      case "bottom": {
        if (spaceBelow >= tooltipEstimatedHeight) {
          return { top: effectiveBottom + padding + 12, left: leftPos, width: tooltipWidth };
        }
        if (spaceAbove >= tooltipEstimatedHeight) {
          return { bottom: window.innerHeight - (targetRect.top - padding - 12), left: leftPos, width: tooltipWidth };
        }
        return { bottom: 80, left: leftPos, width: tooltipWidth };
      }
      case "top": {
        if (spaceAbove >= tooltipEstimatedHeight) {
          return { bottom: window.innerHeight - (targetRect.top - padding - 12), left: leftPos, width: tooltipWidth };
        }
        if (spaceBelow >= tooltipEstimatedHeight) {
          return { top: effectiveBottom + padding + 12, left: leftPos, width: tooltipWidth };
        }
        return { bottom: 80, left: leftPos, width: tooltipWidth };
      }
      default: {
        if (spaceBelow >= tooltipEstimatedHeight) {
          return { top: effectiveBottom + padding + 12, left: leftPos, width: tooltipWidth };
        }
        return { bottom: 80, left: leftPos, width: tooltipWidth };
      }
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200]"
      data-testid="feature-tour-overlay"
    >
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightStyle && (
              <rect
                x={spotlightStyle.left}
                y={spotlightStyle.top}
                width={spotlightStyle.width}
                height={spotlightStyle.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleNext}
        />
      </svg>

      {spotlightStyle && (
        <div
          className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none"
          style={{
            top: spotlightStyle.top,
            left: spotlightStyle.left,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-card border border-border rounded-xl shadow-xl p-4 z-[201]"
          style={getTooltipPosition()}
          data-testid="feature-tour-tooltip"
        >
          <button
            onClick={handleComplete}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
            data-testid="button-tour-skip"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-3 pr-6">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {step.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {currentStep + 1} of {steps.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handlePrev}
                  data-testid="button-tour-prev"
                >
                  <ChevronLeft className="w-3 h-3 mr-0.5" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleNext}
                data-testid="button-tour-next"
              >
                {currentStep === steps.length - 1 ? "Got it!" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3 ml-0.5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export { TOUR_STORAGE_KEY };
