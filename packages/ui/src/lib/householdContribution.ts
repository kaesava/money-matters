import { t } from '@money-matters/i18n';

export type ContributionMode = 'FULL' | 'PERCENTAGE' | 'FIXED_AMOUNT';

function parseNumeric(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, ''));
}

export function cleanContributionAmount(val: string): string {
  const num = parseNumeric(val);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

/**
 * Validates household contribution settings when private envelopes exist.
 * Returns a localized error message or null when valid.
 */
export function validateHouseholdContribution(params: {
  hasPrivateEnvelopes: boolean;
  contributionMode: ContributionMode;
  contributionValue: string;
  expectedAmount: string;
}): string | null {
  if (!params.hasPrivateEnvelopes || params.contributionMode === 'FULL') {
    return null;
  }

  if (params.contributionMode === 'PERCENTAGE') {
    const pct = parseFloat(params.contributionValue);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      return t('planTabs.householdContribution.percentageInvalid');
    }
    return null;
  }

  const fix = parseFloat(cleanContributionAmount(params.contributionValue));
  const exp = parseFloat(cleanContributionAmount(params.expectedAmount));
  if (isNaN(fix) || fix <= 0) {
    return t('planTabs.householdContribution.amountInvalid');
  }
  if (!isNaN(exp) && exp > 0 && fix > exp) {
    return t('planTabs.householdContribution.fixedCannotExceedExpected');
  }
  return null;
}

/**
 * Resolves the canonical API payload for contributionMode and contributionValue.
 * Always forces 100% shared ("FULL", null) when no private envelopes exist.
 */
export function resolveHouseholdContributionPayload(params: {
  hasPrivateEnvelopes: boolean;
  contributionMode: ContributionMode;
  contributionValue: string;
}): { contributionMode: ContributionMode; contributionValue: string | null } {
  if (!params.hasPrivateEnvelopes || params.contributionMode === 'FULL') {
    return { contributionMode: 'FULL', contributionValue: null };
  }
  return {
    contributionMode: params.contributionMode,
    contributionValue: cleanContributionAmount(params.contributionValue),
  };
}
