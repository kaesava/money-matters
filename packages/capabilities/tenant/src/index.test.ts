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
    const valuesMock = vi.fn().mockResolvedValue([]);
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
    expect(insertMock).toHaveBeenCalledTimes(2);
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

  it('invitePartnerHandler generates invite token and inserts member record', async () => {
    const returningMock = vi.fn().mockResolvedValue([{ inviteToken: 'test-token', inviteEmail: 'partner@example.com' }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
    const mockDb: any = { insert: insertMock };

    const { invitePartnerHandler } = await import('./index.js');
    const handler = invitePartnerHandler(mockDb);
    const result = await handler({ email: 'partner@example.com' }, tenantId, appId, userId);

    expect(result.success).toBe(true);
    expect(result.inviteEmail).toBe('partner@example.com');
  });

  it('acceptInviteHandler updates pending invite to accepted state', async () => {
    const limitMock = vi.fn().mockResolvedValue([{ id: 'invite-1', tenantId, role: 'MEMBER' }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const returningMock = vi.fn().mockResolvedValue([{ tenantId, role: 'MEMBER' }]);
    const setWhereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: setWhereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });

    const mockDb: any = { select: selectMock, update: updateMock };

    const { acceptInviteHandler } = await import('./index.js');
    const handler = acceptInviteHandler(mockDb);
    const result = await handler({ inviteToken: 'valid-token' }, userId);

    expect(result.success).toBe(true);
    expect(result.tenantId).toBe(tenantId);
  });
});
