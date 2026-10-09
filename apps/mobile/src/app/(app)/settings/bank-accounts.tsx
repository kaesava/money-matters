import { useEffect } from 'react';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';

export default function BankAccountsLegacyRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();

  useEffect(() => {
    const idParam = params.id ? `&id=${params.id}` : '';
    const returnParam = params.returnTo ? `&returnTo=${params.returnTo}` : '';
    router.replace(`/(app)/settings?tab=bank-accounts${idParam}${returnParam}` as Href);
  }, [router, params.id, params.returnTo]);

  return null;
}
