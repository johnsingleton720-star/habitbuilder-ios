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
}

const TIER_FEATURES: Record<SubscriptionTier | 'trial', SubscriptionFeatures> = {
  trial: {
    maxHabits: 3, // Limited during trial
    hasAiCoaching: true, // Can try AI coaching
    hasPersonalizedPlans: true, // Can generate one plan
    hasSessionSummaries: false, // Premium feature
    hasStreaksAchievements: true, // Basic tracking
    hasTemplates: true, // Can view templates
    hasEditableTemplates: false, // Premium only
    hasDownloadablePdf: false, // Premium only
    hasWeeklyReports: false, // Pro+ feature
    hasEmailReminders: false, // Pro+ feature
    hasVoiceNotes: false, // Premium only
    hasAccountabilityPartners: false, // Premium only
    hasPrioritySupport: false, // Premium only
    hasAdvancedAnalytics: false, // Premium only
  },
  free: {
    maxHabits: 0, // No access after trial expires
    hasAiCoaching: false,
    hasPersonalizedPlans: false,
    hasSessionSummaries: false,
    hasStreaksAchievements: false,
    hasTemplates: false,
    hasEditableTemplates: false,
    hasDownloadablePdf: false,
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
    hasEditableTemplates: false,
    hasDownloadablePdf: false,
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
    hasEditableTemplates: true,
    hasDownloadablePdf: true,
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
  // If hasPaid is true but tier is still 'free', treat them as 'pro' (fallback for webhook edge cases)
  const storedTier: SubscriptionTier = (user?.subscriptionTier as SubscriptionTier) || 'free';
  const baseTier: SubscriptionTier = user?.hasPaid && storedTier === 'free' ? 'pro' : storedTier;
  const hasPaidSubscription = user?.hasPaid === true;
  
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
  
  // Admin has full access to all features
  const isAdmin = user?.isAdmin === true;
  
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
    isPro: baseTier === 'pro' || baseTier === 'premium' || isAdmin,
    isPremium: baseTier === 'premium' || isAdmin,
    isAdmin,
  };
}
