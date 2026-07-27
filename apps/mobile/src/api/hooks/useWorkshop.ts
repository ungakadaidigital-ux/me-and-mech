import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import type { Workshop } from '@me-and-mech/shared';

export function useWorkshop() {
  return useQuery({
    queryKey: ['workshop'],
    queryFn: () => apiRequest<Workshop>('/workshop/me'),
  });
}

export function useUpdateWorkshop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<{ shop_name: string; address: string; gst_number: string; upi_id: string }>) =>
      apiRequest<Workshop>('/workshop/me', { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workshop'] }),
  });
}

export function useReferralStatus() {
  return useQuery({
    queryKey: ['referral', 'me'],
    queryFn: () => apiRequest<{ code: string | null; successfulReferrals: number }>('/referral/me'),
  });
}

export function useApplyReferralCode() {
  return useMutation({
    mutationFn: (code: string) => apiRequest('/referral/apply', { method: 'POST', body: { code } }),
  });
}

export function useVoiceUsage(days = 30) {
  return useQuery({
    queryKey: ['reports', 'voice-usage', days],
    queryFn: () => apiRequest<{ voiceSessionCount: number }>(`/reports/voice-usage?days=${days}`),
  });
}

export function useRevenueReport(days = 30) {
  return useQuery({
    queryKey: ['reports', 'revenue', days],
    queryFn: () => apiRequest<{ totalInvoices: number; paidCount: number; pendingCount: number }>(`/reports/revenue?days=${days}`),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (fcmToken: string) => apiRequest('/push-tokens', { method: 'POST', body: { fcm_token: fcmToken } }),
  });
}
