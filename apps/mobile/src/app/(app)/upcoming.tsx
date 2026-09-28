import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function UpcomingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(app)/paychecks?tab=EVENTS' as never);
  }, [router]);

  return null;
}
