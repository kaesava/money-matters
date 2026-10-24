import { describe, it, expect } from 'vitest';
import { requiresWriteAccess } from './trpc.js';
import type { SubscriptionStatusDto } from '@money-matters/types';

describe('requiresWriteAccess Unit Tests', () => {
  const baseStatus: SubscriptionStatusDto = {
    status: 'TRIAL_ACTIVE',
    trialEndsAt: new Date(Date.now() + 30 * 86400000),
    subscriptionEndsAt: null,
    isTrialActive: true,
    isTrialExpired: false,
    isGracePeriod: false,
    isSubscribed: false,
    isPastDue: false,
    isDeactivated: false,
    daysRemainingInTrial: 30,
    cancelAtPeriodEnd: false,
  };

  it('allows write access for active trial or active subscription', () => {
    expect(() => {
      requiresWriteAccess({ subscriptionStatus: baseStatus });
    }).not.toThrow();
  });

  it('throws FORBIDDEN when trial is expired', () => {
    const status: SubscriptionStatusDto = {
      ...baseStatus,
      status: 'TRIAL_EXPIRED',
      isTrialActive: false,
      isTrialExpired: true,
      daysRemainingInTrial: 0,
    };
    expect(() => {
      requiresWriteAccess({ subscriptionStatus: status });
    }).toThrowError(/read-only/i);
  });

  it('throws FORBIDDEN during 7-day read-only grace period (SEC-001)', () => {
    const status: SubscriptionStatusDto = {
      ...baseStatus,
      status: 'TRIAL_GRACE',
      isGracePeriod: true,
      isPastDue: true,
    };
    expect(() => {
      requiresWriteAccess({ subscriptionStatus: status });
    }).toThrowError(/read-only/i);
  });

  it('throws FORBIDDEN when past due', () => {
    const status: SubscriptionStatusDto = {
      ...baseStatus,
      status: 'PAST_DUE',
      isPastDue: true,
    };
    expect(() => {
      requiresWriteAccess({ subscriptionStatus: status });
    }).toThrowError(/read-only/i);
  });

  it('throws FORBIDDEN when account is deactivated', () => {
    const status: SubscriptionStatusDto = {
      ...baseStatus,
      status: 'DEACTIVATED',
      isDeactivated: true,
    };
    expect(() => {
      requiresWriteAccess({ subscriptionStatus: status });
    }).toThrowError(/read-only/i);
  });
});
