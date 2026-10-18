import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';

export default function UpcomingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(app)/paychecks?tab=EVENTS' as Href);
  }, [router]);

  return null;
}
