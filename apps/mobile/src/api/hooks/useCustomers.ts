import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import type { Customer } from '@me-and-mech/shared';
import type { PaginatedResult } from '../types';

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search ?? ''],
    queryFn: () => apiRequest<PaginatedResult<Customer>>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiRequest<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; phone: string; city?: string }) =>
      apiRequest<Customer>('/customers', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}
