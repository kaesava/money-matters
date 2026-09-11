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
    expect(status.isTrialExpired).toBe(false);
  });

  it('evaluates TRIAL_GRACE when trial period has ended but within 7-day grace window', async () => {
    const pastTrialDate = new Date(Date.now() - 86400 * 1000 * 2); // 2 days past trial
    const futureGraceDate = new Date(Date.now() + 86400 * 1000 * 5); // 5 days left in grace
    const mockTenant = {
      subscriptionStatus: 'TRIAL_ACTIVE',
      trialEndsAt: pastTrialDate,
      trialGraceEndsAt: futureGraceDate,
      subscriptionEndsAt: null,
      cancelAtPeriodEnd: false,
      planType: null,
      nextBillingAt: null,
    };

    const updateSetWhere = async () => [];
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockTenant],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: updateSetWhere,
        }),
      }),
    } as any;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_GRACE');
    expect(status.isTrialGrace).toBe(true);
    expect(status.isTrialExpired).toBe(false);
  });

  it('evaluates TRIAL_EXPIRED when grace period has ended', async () => {
    const pastTrialDate = new Date(Date.now() - 86400 * 1000 * 10);
    const pastGraceDate = new Date(Date.now() - 86400 * 1000 * 3);
    const mockTenant = {
      subscriptionStatus: 'TRIAL_ACTIVE',
      trialEndsAt: pastTrialDate,
      trialGraceEndsAt: pastGraceDate,
      subscriptionEndsAt: null,
      cancelAtPeriodEnd: false,
      planType: null,
      nextBillingAt: null,
    };

    const updateSetWhere = async () => [];
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockTenant],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: updateSetWhere,
        }),
      }),
    } as any;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_EXPIRED');
    expect(status.isTrialExpired).toBe(true);
    expect(status.isTrialGrace).toBe(false);
  });

  it('verifies mock checkout session synchronously', async () => {
    const { verifyCheckoutSessionCommand } = await import('./index');
    const updateSetWhere = async () => [];
    const mockDb = {
      update: () => ({
        set: () => ({
          where: updateSetWhere,
        }),
      }),
    } as any;

    const res = await verifyCheckoutSessionCommand(mockDb, 'tenant-123', 'mock_checkout_session_success');
    expect(res.verified).toBe(true);
    expect(res.subscriptionStatus).toBe('SUBSCRIBED');
  });

  it('queries list of invoices for a tenant', async () => {
    const { listInvoicesQuery } = await import('./index');
    const mockInvoices = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: '22222222-2222-4222-8222-222222222222',
        stripeInvoiceId: 'in_123',
        amountPaid: '69.00',
        currency: 'AUD',
        status: 'paid',
        paidAt: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
        invoicePdfUrl: 'https://stripe.com/invoice.pdf',
        hostedInvoiceUrl: 'https://stripe.com/invoice',
        createdAt: new Date(),
      },
    ];

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => mockInvoices,
          }),
        }),
      }),
    } as any;

    const invoices = await listInvoicesQuery(mockDb, '22222222-2222-4222-8222-222222222222');
    expect(invoices.length).toBe(1);
    expect(invoices[0].amountPaid).toBe('69.00');
    expect(invoices[0].stripeInvoiceId).toBe('in_123');
  });
});
