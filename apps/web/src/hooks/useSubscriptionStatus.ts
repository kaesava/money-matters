"use client";

import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";

export function useSubscriptionStatus() {
  const { data: session } = authClient.useSession();
  const query = trpc.getSubscriptionStatus.useQuery(undefined, {
    enabled: !!session?.user,
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
