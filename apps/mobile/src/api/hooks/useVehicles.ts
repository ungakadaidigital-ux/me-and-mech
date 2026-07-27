import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import type { Vehicle } from '@me-and-mech/shared';

export function useVehiclesForCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', customerId],
    queryFn: () => apiRequest<Vehicle[]>(`/vehicles?customer_id=${customerId}`),
    enabled: !!customerId,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => apiRequest<Vehicle>(`/vehicles/${id}`),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { customer_id: string; vehicle_number: string; make?: string; model?: string }) =>
      apiRequest<Vehicle>('/vehicles', { method: 'POST', body: input }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['vehicles', variables.customer_id] }),
  });
}
