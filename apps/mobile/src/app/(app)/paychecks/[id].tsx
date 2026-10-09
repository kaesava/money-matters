import React from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';

/**
 * Backward compatibility redirect:
 * Deep links or legacy internal routes to /(app)/paychecks/[id]
 * automatically redirect to the canonical /(app)/income-split/[id].
 */
export default function LegacyPaycheckStudioRedirect() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();

  return (
    <Redirect
      href={{
        pathname: '/(app)/income-split/[id]',
        params: { id, returnTo },
      } as never}
    />
  );
}
