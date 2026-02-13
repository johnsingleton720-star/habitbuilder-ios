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
    hasCoachChat: false, // Premium only
    hasHabitStacking: false, // Premium only
  },
  free: {
    maxHabits: 2,
    hasAiCoaching: true,
    hasPersonalizedPlans: true,
    hasSessionSummaries: false,
    hasStreaksAchievements: true,
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
  
  const isAdmin = user?.isAdmin === true;
  const isActive = true;
  const features = TIER_FEATURES[effectiveTier];
  
  // Admin users get access to ALL features regardless of tier
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
    if (effectiveTier === 'trial' && !features[feature]) {
      return 'Subscribe to Pro to keep this feature after your trial';
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
    isPro: baseTier === 'pro' || baseTier === 'premium' || isAdmin,
    isPremium: baseTier === 'premium' || isAdmin,
    isAdmin,
  };
}
