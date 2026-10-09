/**
 * Mobile Locale & Timezone Configuration
 *
 * Central state for active mobile locale, timezone, and currency preferences.
 * Extracted into a standalone module to prevent require cycles between format.ts
 * and schedule-format.ts.
 */

export interface MobileLocaleConfig {
  locale: string;
  timezone: string;
  currency: string;
}

let currentMobileLocaleConfig: MobileLocaleConfig = {
  locale: 'en-AU',
  timezone: 'Australia/Sydney',
  currency: 'AUD',
};

export function setMobileLocaleConfig(cfg: Partial<MobileLocaleConfig>): void {
  currentMobileLocaleConfig = {
    ...currentMobileLocaleConfig,
    ...cfg,
  };
}

export function getMobileLocaleConfig(): MobileLocaleConfig {
  return currentMobileLocaleConfig;
}
