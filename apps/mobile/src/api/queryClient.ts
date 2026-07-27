import { QueryClient } from '@tanstack/react-query';

/**
 * PKG-039 — React Query config tuned for budget Android + patchy
 * connectivity: fewer aggressive refetches (data usage matters), longer
 * staleTime for mostly-static lists (customers/vehicles), short retry
 * count so a genuinely offline device fails fast into the offline queue
 * (offline/sync.ts) rather than spinning.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0, // mutations go through the offline queue instead of query-level retry
    },
  },
});
