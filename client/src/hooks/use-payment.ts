import { useQuery } from "@tanstack/react-query";

interface PaymentStatus {
  hasPaid: boolean;
}

export function usePaymentStatus() {
  const { data, isLoading, refetch } = useQuery<PaymentStatus>({
    queryKey: ['/api/payment-status'],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    hasPaid: data?.hasPaid || false,
    isTrialActive: false,
    trialEndsAt: null,
    hasAccess: true,
    isLoading,
    refetch,
  };
}
