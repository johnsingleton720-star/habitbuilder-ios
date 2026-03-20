import { useAuth } from "./use-auth";
import type { SubscriptionTier } from "@shared/models/auth";

interface SubscriptionFeatures {
  maxHabits: number;
  hasAiCoaching: boolean;
  hasPersonalizedPlans: boolean;
  hasSessionSummaries: boolean;
  hasStreaksAchievements: boolean;
  hasTemplates: boolean;
  hasEditableTemplates: boolean;
  hasDownloadablePdf: boolean;
  hasWeeklyReports: boolean;
  hasEmailReminders: boolean;
  hasVoiceNotes: boolean;
  hasAccountabilityPartners: boolean;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
  hasCoachChat: boolean;
  hasHabitStacking: boolean;
  hasAiResources: boolean;
  hasPlanRefresh: boolean;
  hasUnlimitedSessions: boolean;
  hasJournal: boolean;
  hasFocusTimer: boolean;
  hasMoodTracker: boolean;
  hasGoals: boolean;
  hasDailyPlanner: boolean;
}

const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    maxHabits: 1,
    hasAiCoaching: false,
    hasPersonalizedPlans: false,
    hasSessionSummaries: false,
    hasStreaksAchievements: false,
    hasTemplates: true,
    hasEditableTemplates: false,
    hasDownloadablePdf: false,
    hasWeeklyReports: false,
    hasEmailReminders: false,
    hasVoiceNotes: false,
    hasAccountabilityPartners: false,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
    hasCoachChat: false,
    hasHabitStacking: false,
    hasAiResources: false,
    hasPlanRefresh: false,
    hasUnlimitedSessions: false,
    hasJournal: false,
    hasFocusTimer: false,
    hasMoodTracker: false,
    hasGoals: false,
    hasDailyPlanner: false,
  },
  pro: {
    maxHabits: Infinity,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: true,
    hasStreaksAchievements: true,
    hasTemplates: true,
    hasEditableTemplates: false,
    hasDownloadablePdf: false,
    hasWeeklyReports: true,
    hasEmailReminders: true,
    hasVoiceNotes: false,
    hasAccountabilityPartners: false,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
    hasCoachChat: false,
    hasHabitStacking: false,
    hasAiResources: true,
    hasPlanRefresh: true,
    hasUnlimitedSessions: true,
    hasJournal: true,
    hasFocusTimer: true,
    hasMoodTracker: true,
    hasGoals: false,
    hasDailyPlanner: false,
  },
  premium: {
    maxHabits: Infinity,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: true,
    hasStreaksAchievements: true,
    hasTemplates: true,
    hasEditableTemplates: true,
    hasDownloadablePdf: true,
    hasWeeklyReports: true,
    hasEmailReminders: true,
    hasVoiceNotes: true,
    hasAccountabilityPartners: true,
    hasPrioritySupport: true,
    hasAdvancedAnalytics: true,
    hasCoachChat: true,
    hasHabitStacking: true,
    hasAiResources: true,
    hasPlanRefresh: true,
    hasUnlimitedSessions: true,
    hasJournal: true,
    hasFocusTimer: true,
    hasMoodTracker: true,
    hasGoals: true,
    hasDailyPlanner: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  
  const rawTrialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const trialEndsAt = rawTrialEndsAt && !isNaN(rawTrialEndsAt.getTime()) ? rawTrialEndsAt : null;
  const now = new Date();
  const hasPaidSubscription = user?.hasPaid === true;
  const isAdmin = user?.isAdmin === true;
  
  const isInTrial = !!(
    trialEndsAt &&
    !hasPaidSubscription &&
    trialEndsAt > now
  );
  
  const trialExpired = !!(
    trialEndsAt &&
    !hasPaidSubscription &&
    trialEndsAt <= now
  );
  
  const trialDaysRemaining = isInTrial && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const storedTier: SubscriptionTier = (user?.subscriptionTier as SubscriptionTier) || 'free';
  const baseTier: SubscriptionTier = hasPaidSubscription && storedTier === 'free' ? 'pro' : storedTier;

  const effectiveTier: SubscriptionTier = isInTrial
    ? 'premium'
    : hasPaidSubscription
      ? baseTier
      : 'free';
  
  const isActive = true;
  const features = TIER_FEATURES[effectiveTier];
  const isFreeUser = effectiveTier === 'free' && !isAdmin;
  
  const canUseFeature = (feature: keyof SubscriptionFeatures): boolean => {
    if (isAdmin) return true;
    return features[feature] === true || (typeof features[feature] === 'number' && features[feature] > 0);
  };
  
  const canAddMoreHabits = (currentCount: number): boolean => {
    if (isAdmin) return true;
    return currentCount < features.maxHabits;
  };
  
  const getUpgradeMessage = (feature: keyof SubscriptionFeatures): string => {
    if (effectiveTier === 'free' && !features[feature]) {
      return 'Upgrade to Pro ($6/mo) to unlock this feature';
    }
    if (effectiveTier === 'pro' && !features[feature]) {
      return 'Upgrade to Premium to unlock this feature';
    }
    return '';
  };
  
  return {
    tier: effectiveTier,
    baseTier,
    isActive,
    isInTrial,
    trialExpired,
    trialDaysRemaining,
    trialEndsAt,
    features,
    canUseFeature,
    canAddMoreHabits,
    getUpgradeMessage,
    isPro: effectiveTier === 'pro' || effectiveTier === 'premium' || isAdmin,
    isPremium: effectiveTier === 'premium' || isAdmin,
    isAdmin,
    isFreeUser,
  };
}
