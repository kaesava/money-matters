import { trpc } from '../lib/trpc';
import { DEFAULT_APP_FEATURE_FLAGS } from '@money-matters/types';

export function useAppFeatures() {
  const query = trpc.getTenantStatus.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const features = query.data?.features ?? DEFAULT_APP_FEATURE_FLAGS;

  return {
    hasAiAssistant: Boolean(features.aiAssistant),
    hasPrivateMode: Boolean(features.privateMode),
    hasFileNotes: Boolean(features.fileNotes),
    features,
    isLoading: query.isLoading,
  };
}
