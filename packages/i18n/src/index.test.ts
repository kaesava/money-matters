import { describe, it, expect } from 'vitest';
import { t, translations } from './index.js';

describe('i18n Localization Engine', () => {
  it('translates valid nested translation keys accurately', () => {
    expect(t('common.save')).toBe('Save');
    expect(t('common.previous')).toBe('Previous');
    expect(t('common.nextPage')).toBe('Next');
    expect(t('common.pageOf', { page: 1, totalPages: 5 })).toBe('Page 1 of 5');
    expect(t('nav.paychecks')).toBe('Income & Expenses');
    expect(t('app.title')).toBe('Money Matters by Kaesava');
  });

  it('interpolates template parameters correctly', () => {
    const result = t('setup.stepOf', { step: 2, total: 4 });
    expect(result).toBe('Step 2 of 4');

    const alert = t('shortfall.alertBody', { category: 'Dining Out', amount: '$45.00' });
    expect(alert).toBe('Dining Out is short by $45.00.');
  });

  it('uses defaultValue fallback when key does not exist', () => {
    const missing = t('non.existent.key', { defaultValue: 'Fallback Text' });
    expect(missing).toBe('Fallback Text');
  });

  it('returns raw key if translation key is missing and no defaultValue provided', () => {
    const missingRaw = t('unknown.translation.path');
    expect(missingRaw).toBe('unknown.translation.path');
  });

  it('handles optional locale parameter safely', () => {
    expect(t('common.cancel', 'en')).toBe('Cancel');
  });

  it('exposes en dictionary tokens', () => {
    expect(translations.en.auth.signIn).toBe('Sign In');
  });
});
