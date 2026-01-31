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

const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    maxHabits: 3,
    hasAiCoaching: false,
    hasPersonalizedPlans: false,
    hasSessionSummaries: false,
    hasStreaksAchievements: true,
    hasTemplates: true, // Basic templates only
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
  
  const tier: SubscriptionTier = (user?.subscriptionTier as SubscriptionTier) || 'free';
  const isActive = user?.hasPaid || tier !== 'free';
  const features = TIER_FEATURES[tier];
  
  const canUseFeature = (feature: keyof SubscriptionFeatures): boolean => {
    return features[feature] === true || (typeof features[feature] === 'number' && features[feature] > 0);
  };
  
  const canAddMoreHabits = (currentCount: number): boolean => {
    return currentCount < features.maxHabits;
  };
  
  const getUpgradeMessage = (feature: keyof SubscriptionFeatures): string => {
    if (tier === 'free') {
      return 'Upgrade to Pro to unlock this feature';
    }
    if (tier === 'pro' && !features[feature]) {
      return 'Upgrade to Premium to unlock this feature';
    }
    return '';
  };
  
  return {
    tier,
    isActive,
    features,
    canUseFeature,
    canAddMoreHabits,
    getUpgradeMessage,
    isPro: tier === 'pro' || tier === 'premium',
    isPremium: tier === 'premium',
  };
}
