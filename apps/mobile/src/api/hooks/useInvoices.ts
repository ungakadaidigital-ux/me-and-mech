import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import type { Invoice } from '@me-and-mech/shared';

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => apiRequest<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobCardId: string) => apiRequest<Invoice>(`/jobs/${jobCardId}/invoice`, { method: 'POST' }),
    onSuccess: (_data, jobCardId) => {
      queryClient.invalidateQueries({ queryKey: ['job-card', jobCardId] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    // Deliberately NOT routed through the offline queue — the backend
    // route for this has no subscriptionGuard and no reason to ever be
    // blocked, but it still needs a live connection to actually record
    // the payment; the mobile UI should show a clear "needs connection"
    // state for this specific action rather than silently queueing it,
    // since payment confirmation shouldn't feel "maybe pending."
    mutationFn: (invoiceId: string) => apiRequest<Invoice>(`/invoices/${invoiceId}/mark-paid`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    },
  });
}

export function useSendInvoiceWhatsApp() {
  return useMutation({
    mutationFn: ({ invoiceId, customerPhone }: { invoiceId: string; customerPhone: string }) =>
      apiRequest<{ sent: boolean }>(`/invoices/${invoiceId}/send-whatsapp`, { method: 'POST', body: { customer_phone: customerPhone } }),
  });
}
