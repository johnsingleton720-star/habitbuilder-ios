import { useAuth } from "./use-auth";
import type { SubscriptionTier } from "@shared/models/auth";

interface SubscriptionFeatures {
  maxHabits: number;
  hasAiCoaching: boolean;
  hasPersonalizedPlans: boolean;
  hasSessionSummaries: boolean;
  hasStreaksAchievements: boolean;
  hasTemplates: boolean;
  hasWeeklyReports: boolean;
  hasEmailReminders: boolean;
  hasVoiceNotes: boolean;
  hasAccountabilityPartners: boolean;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
}

const TIER_FEATURES: Record<SubscriptionTier | 'trial', SubscriptionFeatures> = {
  trial: {
    maxHabits: 3,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: true,
    hasStreaksAchievements: true,
    hasTemplates: true,
    hasWeeklyReports: false,
    hasEmailReminders: false,
    hasVoiceNotes: false,
    hasAccountabilityPartners: false,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
  },
  free: {
    maxHabits: 0, // No access after trial
    hasAiCoaching: false,
    hasPersonalizedPlans: false,
    hasSessionSummaries: false,
    hasStreaksAchievements: false,
    hasTemplates: false,
    hasWeeklyReports: false,
    hasEmailReminders: false,
    hasVoiceNotes: false,
    hasAccountabilityPartners: false,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
  },
  pro: {
    maxHabits: Infinity,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: true,
    hasStreaksAchievements: true,
    hasTemplates: true,
    hasWeeklyReports: true,
    hasEmailReminders: true,
    hasVoiceNotes: false,
    hasAccountabilityPartners: false,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
  },
  premium: {
    maxHabits: Infinity,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: true,
    hasStreaksAchievements: true,
    hasTemplates: true,
    hasWeeklyReports: true,
    hasEmailReminders: true,
    hasVoiceNotes: true,
    hasAccountabilityPartners: true,
    hasPrioritySupport: true,
    hasAdvancedAnalytics: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  
  // Check trial status
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const isInTrial = trialEndsAt && trialEndsAt > new Date();
  const trialExpired = trialEndsAt && trialEndsAt <= new Date();
  const trialDaysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  
  // Determine effective tier
  const baseTier: SubscriptionTier = (user?.subscriptionTier as SubscriptionTier) || 'free';
  const hasPaidSubscription = user?.hasPaid && (baseTier === 'pro' || baseTier === 'premium');
  
  // Effective tier: paid subscription > trial > expired free
  const effectiveTier: SubscriptionTier | 'trial' = hasPaidSubscription 
    ? baseTier 
    : isInTrial 
      ? 'trial' 
      : 'free';
  
  const isActive = hasPaidSubscription || isInTrial || user?.isAdmin;
  const features = TIER_FEATURES[effectiveTier];
  
  const canUseFeature = (feature: keyof SubscriptionFeatures): boolean => {
    return features[feature] === true || (typeof features[feature] === 'number' && features[feature] > 0);
  };
  
  const canAddMoreHabits = (currentCount: number): boolean => {
    return currentCount < features.maxHabits;
  };
  
  const getUpgradeMessage = (feature: keyof SubscriptionFeatures): string => {
    if (effectiveTier === 'trial' || effectiveTier === 'free') {
      return 'Subscribe to Pro to unlock this feature';
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
    isPro: baseTier === 'pro' || baseTier === 'premium',
    isPremium: baseTier === 'premium',
  };
}
