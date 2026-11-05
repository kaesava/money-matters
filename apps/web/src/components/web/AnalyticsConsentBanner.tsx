'use client';

import React, { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { Button } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export const ANALYTICS_CONSENT_KEY = 'mm_analytics_consent';

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      if (consent === null) {
        setVisible(true);
      } else if (consent === 'denied') {
        posthog.opt_out_capturing();
      } else if (consent === 'granted') {
        posthog.opt_in_capturing();
      }
    } catch {
      // In private browsing mode or local storage disabled
    }
  }, []);

  const handleConsent = (granted: boolean) => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, granted ? 'granted' : 'denied');
      if (granted) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('privacy.analyticsConsentTitle')}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('privacy.analyticsConsentTitle')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('privacy.analyticsConsentDesc')}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleConsent(false)}
        >
          {t('privacy.analyticsConsentDecline')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => handleConsent(true)}
        >
          {t('privacy.analyticsConsentAccept')}
        </Button>
      </div>
    </div>
  );
}
