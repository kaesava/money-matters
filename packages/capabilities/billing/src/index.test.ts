import { describe, it, expect } from 'vitest';
import type { DbOrTx } from '@money-matters/db';
import { createCheckoutSessionCommand, getSubscriptionStatus } from './index';

describe('billing capability', () => {
  it('throws error when Stripe secret key is missing', async () => {
    const mockDb = {} as unknown as DbOrTx;
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
    } as unknown as DbOrTx;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_ACTIVE');
    expect(status.isTrialActive).toBe(true);
    expect(status.isTrialExpired).toBe(false);
  });

  it('evaluates TRIAL_EXPIRED immediately when trial period has ended', async () => {
    const pastTrialDate = new Date(Date.now() - 86400 * 1000 * 2); // 2 days past trial
    const mockTenant = {
      subscriptionStatus: 'TRIAL_ACTIVE',
      trialEndsAt: pastTrialDate,
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
    } as unknown as DbOrTx;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_EXPIRED');
    expect(status.isTrialExpired).toBe(true);
  });

  it('reactivates TRIAL_ACTIVE when trialEndsAt is in future even if stored as TRIAL_EXPIRED', async () => {
    const futureTrialDate = new Date(Date.now() + 86400 * 1000 * 3); // 3 days in future
    const mockTenant = {
      subscriptionStatus: 'TRIAL_EXPIRED',
      trialEndsAt: futureTrialDate,
      subscriptionEndsAt: null,
      cancelAtPeriodEnd: false,
      planType: null,
      nextBillingAt: null,
    };

    let updatedTo: string | undefined;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockTenant],
          }),
        }),
      }),
      update: () => ({
        set: (vals: { subscriptionStatus?: string }) => {
          updatedTo = vals.subscriptionStatus;
          return {
            where: async () => [],
          };
        },
      }),
    } as unknown as DbOrTx;

    const status = await getSubscriptionStatus(mockDb, 'tenant-123');
    expect(status.status).toBe('TRIAL_ACTIVE');
    expect(status.isTrialActive).toBe(true);
    expect(status.isTrialExpired).toBe(false);
    expect(updatedTo).toBe('TRIAL_ACTIVE');
  });

  it('rejects invalid or mock checkout session ID format', async () => {
    const { verifyCheckoutSessionCommand } = await import('./index');
    const mockDb = {} as unknown as Parameters<typeof verifyCheckoutSessionCommand>[0];

    await expect(
      verifyCheckoutSessionCommand(mockDb, 'tenant-123', 'mock_checkout_session_success')
    ).rejects.toThrow();
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
    } as unknown as Parameters<typeof listInvoicesQuery>[0];

    const invoices = await listInvoicesQuery(mockDb, '22222222-2222-4222-8222-222222222222');
    expect(invoices.length).toBe(1);
    expect(invoices[0].amountPaid).toBe('69.00');
    expect(invoices[0].stripeInvoiceId).toBe('in_123');
  });

  it('rejects createCheckoutSession with unwhitelisted target URL', async () => {
    const { createCheckoutSessionCommand } = await import('./index');
    const mockDb = {} as unknown as Parameters<typeof createCheckoutSessionCommand>[0];

    await expect(
      createCheckoutSessionCommand(mockDb, 'tenant-123', 'user@example.com', {
        planType: 'founding',
        successUrl: 'https://attacker.com/success',
        cancelUrl: 'https://kaesava.au/cancel',
      })
    ).rejects.toThrow('Invalid redirect URL: target domain is not authorized.');
  });

  it('requires Stripe secret key for checkout session creation', async () => {
    const { createCheckoutSessionCommand } = await import('./index');
    const mockDb = {} as unknown as Parameters<typeof createCheckoutSessionCommand>[0];

    await expect(
      createCheckoutSessionCommand(mockDb, 'tenant-123', 'user@example.com', {
        planType: 'annual',
        successUrl: 'https://kaesava.au/success',
        cancelUrl: 'https://kaesava.au/cancel',
      })
    ).rejects.toThrow('Stripe secret key is not configured.');
  });
});

