import { useCallback } from 'react';

/**
 * Cross-platform field interaction hooks for Web.
 * Triggers browser native dialer, mail client, and map search.
 */
export function useFieldActions() {
  const dialPhone = useCallback((phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  }, []);

  const sendEmail = useCallback((email: string) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  }, []);

  const openMap = useCallback((address: string) => {
    if (!address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank'
    );
  }, []);

  return { dialPhone, sendEmail, openMap };
}
