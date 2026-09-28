import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function BankAccountsLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(app)/settings?tab=bank-accounts' as never);
  }, [router]);

  return null;
}
