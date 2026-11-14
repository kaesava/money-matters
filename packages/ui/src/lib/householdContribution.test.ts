import { describe, it, expect } from 'vitest';
import {
  validateHouseholdContribution,
  resolveHouseholdContributionPayload,
} from './householdContribution';

describe('householdContribution helpers', () => {
  it('forces FULL and skips validation when no private envelopes exist', () => {
    expect(
      validateHouseholdContribution({
        hasPrivateEnvelopes: false,
        contributionMode: 'PERCENTAGE',
        contributionValue: '0',
        expectedAmount: '1000.00',
      })
    ).toBeNull();

    expect(
      resolveHouseholdContributionPayload({
        hasPrivateEnvelopes: false,
        contributionMode: 'FIXED_AMOUNT',
        contributionValue: '500.00',
      })
    ).toEqual({ contributionMode: 'FULL', contributionValue: null });
  });

  it('validates percentage and fixed amount when private envelopes exist', () => {
    expect(
      validateHouseholdContribution({
        hasPrivateEnvelopes: true,
        contributionMode: 'PERCENTAGE',
        contributionValue: '150',
        expectedAmount: '1000.00',
      })
    ).toBeTruthy();

    expect(
      validateHouseholdContribution({
        hasPrivateEnvelopes: true,
        contributionMode: 'FIXED_AMOUNT',
        contributionValue: '1200.00',
        expectedAmount: '1000.00',
      })
    ).toBeTruthy();

    expect(
      validateHouseholdContribution({
        hasPrivateEnvelopes: true,
        contributionMode: 'FIXED_AMOUNT',
        contributionValue: '800.00',
        expectedAmount: '1000.00',
      })
    ).toBeNull();

    expect(
      resolveHouseholdContributionPayload({
        hasPrivateEnvelopes: true,
        contributionMode: 'FIXED_AMOUNT',
        contributionValue: '800',
      })
    ).toEqual({ contributionMode: 'FIXED_AMOUNT', contributionValue: '800.00' });
  });
});
