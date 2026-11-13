"use client";

import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";

export function useAppFeatures() {
  const { data: session } = authClient.useSession();
  const query = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  const features = query.data?.features ?? DEFAULT_APP_FEATURE_FLAGS;

  return {
    hasAiAssistant: Boolean(features.aiAssistant),
    hasPrivateMode: Boolean(features.privateMode),
    hasPartnerInvites: Boolean(features.privateMode),
    hasFileNotes: Boolean(features.fileNotes),
    hasSimulation: Boolean(features.simulation),
    hasCustomAllocationRules: Boolean(features.customAllocationRules),
    hasReports: Boolean(features.reports),
    features,
    isLoading: query.isLoading,
  };
}
