import { describe, it, expect } from 'vitest';
import { t } from '@money-matters/i18n';

describe('EnvelopeEventsToggleSection (Mobile Parity)', () => {
  it('uses shared i18n keys for web and mobile parity', () => {
    expect(t('categories.generateEventsCheckedImplication')).toBe(
      'Saving will generate upcoming expense events for up to 12 months on your calendar.'
    );
    expect(t('categories.generateEventsUncheckedEditImplication')).toBe(
      'Saving will remove all upcoming scheduled events for this bill from your calendar.'
    );
    expect(t('categories.generateEventsUncheckedNewImplication')).toBe(
      'Saving will not create any upcoming expense events on your calendar.'
    );
  });
});
