import { describe, it, expect } from 'vitest';
import { createCheckoutSessionCommand, getSubscriptionStatus } from './index';

describe('billing capability', () => {
  it('throws error when Stripe secret key is missing', async () => {
    const mockDb = {} as any;
    await expect(
      createCheckoutSessionCommand(mockDb, 'tenant-123', 'test@example.com', {
        priceId: 'price_123',
        successUrl: 'https://kaesava.au/success',
        cancelUrl: 'https://kaesava.au/cancel',
      })
    ).rejects.toThrow();
  });

  it('evaluates subscription status correctly for active trial', async () => {
    const futureDate = new Date(Date.now() + 86400 * 1000 * 14);
    const mockTenant = {
      subscriptionStatus: 'TRIAL_ACTIVE',
      trialEndsAt: futureDate,
      trialGraceEndsAt: null,
      subscriptionEndsAt: null,
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockTenant],
          }),
        }),
      }),
    } as any;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_ACTIVE');
    expect(status.isTrialActive).toBe(true);
    expect(status.isFreeTier).toBe(false);
  });
});
