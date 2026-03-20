import { useQuery } from "@tanstack/react-query";

interface PaymentStatus {
  hasPaid: boolean;
  isTrialActive?: boolean;
  trialEndsAt?: string | null;
}

export function usePaymentStatus() {
  const { data, isLoading, refetch } = useQuery<PaymentStatus>({
    queryKey: ['/api/payment-status'],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    hasPaid: data?.hasPaid || false,
    isTrialActive: data?.isTrialActive || false,
    trialEndsAt: data?.trialEndsAt || null,
    hasAccess: data?.hasPaid || data?.isTrialActive || false,
    isLoading,
    refetch,
  };
}
