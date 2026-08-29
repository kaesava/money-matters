import { describe, it, expect, vi } from 'vitest';
import {
  createTenantHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getTenantHandler,
} from './index.js';

describe('Capability Tenant Handlers', () => {
  const appId = '01908bde-34bb-7b19-a178-574211bc93aa';
  const userId = '11111111-1111-4111-8111-111111111111';
  const tenantId = '22222222-2222-4222-8222-222222222222';
  const accountId = '33333333-3333-4333-8333-333333333333';

  it('exports all tenant and bank account handler initializers', () => {
    expect(typeof createTenantHandler).toBe('function');
    expect(typeof createBankAccountHandler).toBe('function');
    expect(typeof updateBankAccountHandler).toBe('function');
    expect(typeof archiveBankAccountHandler).toBe('function');
    expect(typeof getTenantHandler).toBe('function');
  });

  it('createTenantHandler creates tenant and owner member records', async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: 'mock-account-id' }]);
    const valuesMock = vi.fn().mockImplementation(() => {
      const promiseObj = Promise.resolve([]);
      (promiseObj as any).returning = returningMock;
      (promiseObj as any).onConflictDoNothing = vi.fn().mockResolvedValue([]);
      return promiseObj;
    });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    const whereMock = vi.fn().mockResolvedValue([]);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const mockDb: any = {
      insert: insertMock,
      select: selectMock,
    };

    const handler = createTenantHandler(mockDb);
    const result = await handler({ name: 'Acme Household' }, appId, userId);

    expect(result.success).toBe(true);
    expect(typeof result.tenantId).toBe('string');
    expect(insertMock).toHaveBeenCalledTimes(8);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('createBankAccountHandler inserts bank account into database', async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: accountId, name: 'Main Checking' }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
    const mockDb: any = { insert: insertMock };

    const handler = createBankAccountHandler(mockDb);
    const res = await handler({ name: 'Main Checking' }, tenantId, appId, userId);

    expect(res.id).toBe(accountId);
  });

  it('invitePartnerHandler generates invite token with 48h expiry and inserts member record', async () => {
    let insertedValues: any = null;
    const returningMock = vi.fn().mockImplementation(() => [{ inviteToken: 'test-token', inviteEmail: 'partner@example.com', expiresAt: insertedValues?.expiresAt }]);
    const valuesMock = vi.fn().mockImplementation((val) => {
      insertedValues = val;
      return { returning: returningMock };
    });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    const limitMock = vi.fn().mockResolvedValue([{ subscriptionStatus: 'SUBSCRIBED', trialEndsAt: null }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const mockDb: any = { insert: insertMock, select: selectMock };

    const { invitePartnerHandler } = await import('./index.js');
    const handler = invitePartnerHandler(mockDb);
    const result = await handler({ email: 'partner@example.com' }, tenantId, userId);

    expect(result.success).toBe(true);
    expect(result.inviteEmail).toBe('partner@example.com');
    expect(insertedValues.expiresAt).toBeInstanceOf(Date);
    expect(insertedValues.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
  });

  it('acceptInviteHandler updates pending invite to accepted state when valid', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let selectCallCount = 0;
    const selectMock = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call: find invite in tenantUsers
            return { limit: vi.fn().mockResolvedValue([{ id: 'invite-1', tenantId, role: 'MEMBER', inviteEmail: 'partner@example.com', expiresAt: futureDate }]) };
          } else if (selectCallCount === 2) {
            // Second call: find parent tenant to derive appId
            return { limit: vi.fn().mockResolvedValue([{ appId }]) };
          } else {
            // Third call: check existing personal category
            return { limit: vi.fn().mockResolvedValue([]) };
          }
        }),
      })),
    }));

    const returningMock = vi.fn().mockResolvedValue([{ tenantId, role: 'MEMBER' }]);
    const setWhereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });

    const valuesMock = vi.fn().mockResolvedValue([]);
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    const mockDb: any = { select: selectMock, update: updateMock, insert: insertMock };

    const { acceptInviteHandler } = await import('./index.js');
    const handler = acceptInviteHandler(mockDb);
    const result = await handler({ inviteToken: 'valid-token' }, userId, 'partner@example.com');

    expect(result.success).toBe(true);
    expect(result.tenantId).toBe(tenantId);
  });

  it('acceptInviteHandler rejects invite if expired', async () => {
    const pastDate = new Date(Date.now() - 1000);
    const limitMock = vi.fn().mockResolvedValue([{ id: 'invite-1', tenantId, role: 'MEMBER', inviteEmail: 'partner@example.com', expiresAt: pastDate }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const mockDb: any = { select: selectMock };

    const { acceptInviteHandler } = await import('./index.js');
    const handler = acceptInviteHandler(mockDb);
    
    await expect(handler({ inviteToken: 'expired-token' }, userId, 'partner@example.com')).rejects.toThrow('Invitation token has expired');
  });

  it('acceptInviteHandler rejects invite if user email does not match invite email', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const limitMock = vi.fn().mockResolvedValue([{ id: 'invite-1', tenantId, role: 'MEMBER', inviteEmail: 'partner@example.com', expiresAt: futureDate }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const mockDb: any = { select: selectMock };

    const { acceptInviteHandler } = await import('./index.js');
    const handler = acceptInviteHandler(mockDb);

    await expect(handler({ inviteToken: 'valid-token' }, userId, 'attacker@example.com')).rejects.toThrow(/Invitation email .* does not match/);
  });
});
