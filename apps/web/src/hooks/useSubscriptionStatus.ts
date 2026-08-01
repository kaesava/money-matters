"use client";

import { trpc } from "../lib/trpc";

export function useSubscriptionStatus() {
  const query = trpc.getSubscriptionStatus.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
