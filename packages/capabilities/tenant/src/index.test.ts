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
    const mockDb: any = { insert: insertMock };

    const handler = createTenantHandler(mockDb);
    const result = await handler({ name: 'Acme Household' }, appId, userId);

    expect(result.success).toBe(true);
    expect(typeof result.tenantId).toBe('string');
    expect(insertMock).toHaveBeenCalledTimes(2);
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

  it('archiveBankAccountHandler throws if linked categories exist', async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
      }),
    });
    const mockDb: any = { select: selectMock };

    const handler = archiveBankAccountHandler(mockDb);
    await expect(handler(accountId, tenantId, appId, userId)).rejects.toThrow(
      'Cannot archive a bank account that has active categories linked to it.'
    );
  });
});
