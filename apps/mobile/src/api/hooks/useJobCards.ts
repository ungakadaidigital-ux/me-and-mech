import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from '../client';
import { enqueueMutation } from '../../offline/sync';
import { getDb } from '../../offline/db';
import type { JobCard } from '@me-and-mech/shared';
import type { PaginatedResult } from '../types';

export function useJobCards() {
  return useQuery({
    queryKey: ['job-cards'],
    queryFn: () => apiRequest<PaginatedResult<JobCard>>('/jobs'),
  });
}

export function useJobCard(id: string | undefined) {
  return useQuery({
    queryKey: ['job-card', id],
    queryFn: () => apiRequest<JobCard>(`/jobs/${id}`),
    enabled: !!id,
  });
}

interface CreateJobCardInput {
  customer_id: string;
  vehicle_id: string;
  job_type: string;
  items: Array<{ item_type: 'labour' | 'part'; description: string; quantity: number; rate: string }>;
}

/**
 * PKG-040 — offline-first job card creation. This is the single most
 * important write in the app to keep working offline (a mechanic mid-job
 * with no signal must still be able to record it). If the device is
 * offline: writes an optimistic row to cache_job_cards (is_local_only=1,
 * a client-generated UUID as its id) and enqueues the real create call.
 * If online: creates directly, no queue involved.
 */
export function useCreateJobCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobCardInput) => {
      const net = await NetInfo.fetch();

      if (net.isConnected) {
        return apiRequest<JobCard>('/jobs', { method: 'POST', body: input });
      }

      // Offline path — optimistic local record + queue.
      const localId = `local_${randomUUID()}`;
      const db = getDb();
      db.runSync(
        `INSERT INTO cache_job_cards (id, customer_id, vehicle_id, status, job_type, items_json, is_local_only, updated_at) VALUES (?, ?, ?, 'draft', ?, ?, 1, ?)`,
        [localId, input.customer_id, input.vehicle_id, input.job_type, JSON.stringify(input.items), new Date().toISOString()],
      );
      enqueueMutation('job_card', '/jobs', 'POST', input);

      // Return a shape consistent enough for the UI to navigate/display
      // immediately — the real server ID arrives after sync, at which
      // point queries are invalidated (see sync.ts) and this local row
      // is superseded.
      return {
        id: localId,
        workshopId: '',
        customerId: input.customer_id,
        vehicleId: input.vehicle_id,
        jobDate: new Date().toISOString(),
        jobType: input.job_type,
        status: 'draft' as const,
        items: [],
        createdAt: new Date().toISOString(),
      } satisfies JobCard;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-cards'] }),
  });
}

export function useUpdateJobCardStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'in_progress' }) =>
      apiRequest<JobCard>(`/jobs/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-card', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
    },
  });
}
