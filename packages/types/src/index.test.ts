import { describe, it, expect } from 'vitest';
import {
  BaseSchema,
  TenantSchema,
  TenantMemberSchema,
  BankAccountSchema,
  CategorySchema,
  CategoryScheduleSchema,
  IncomeSourceSchema,
  IncomeSourceScheduleSchema,
  IncomeEventSchema,
  AllocationPlanSchema,
  AllocationPlanLineSchema,
  TransactionLedgerSchema,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
  CanAffordQuery,
  CanAffordVerdictDto,
  MonthlySummaryDto,
  ConfirmPlanCommand,
  UserPreferencesSchema,
} from './index.js';

describe('Domain Schemas Validation', () => {
  const mockBase = {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    appId: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date(),
    createdBy: '44444444-4444-4444-8444-444444444444',
    updatedAt: new Date(),
    updatedBy: '44444444-4444-4444-8444-444444444444',
    archivedAt: null,
  };

  it('validates BaseSchema properly and rejects invalid UUIDs or extra keys', () => {
    expect(() => BaseSchema.parse(mockBase)).not.toThrow();
    expect(() => BaseSchema.parse({ ...mockBase, id: 'invalid-uuid' })).toThrow();
    expect(() => BaseSchema.parse({ ...mockBase, extraKey: 'bad' })).toThrow();
  });

  it('validates TenantSchema defaults and fiscal year format', () => {
    const validTenant = TenantSchema.parse({
      ...mockBase,
      name: 'Acme Corp',
    });
    expect(validTenant.fyEndMonthDay).toBe('06-30');
    expect(validTenant.premiumEnabled).toBe(false);

    expect(() =>
      TenantSchema.parse({
        ...mockBase,
        name: 'Acme',
        fyEndMonthDay: 'invalid-date',
      })
    ).toThrow();
  });

  it('validates TenantMemberSchema roles and invite statuses', () => {
    const member = TenantMemberSchema.parse({
      ...mockBase,
      userId: '55555555-5555-4555-8555-555555555555',
      role: 'OWNER',
      inviteToken: null,
      inviteStatus: 'ACCEPTED',
    });
    expect(member.role).toBe('OWNER');

    expect(() =>
      TenantMemberSchema.parse({
        ...mockBase,
        userId: '55555555-5555-4555-8555-555555555555',
        role: 'SUPERADMIN' as unknown,
        inviteToken: null,
        inviteStatus: 'ACCEPTED',
      })
    ).toThrow();
  });

  it('validates BankAccountSchema defaults', () => {
    const bank = BankAccountSchema.parse({
      ...mockBase,
      name: 'Main Checking',
    });
    expect(bank.lastKnownBalance).toBe('0.00');
    expect(bank.unbudgetedBuffer).toBe('0.00');
  });

  it('validates CategorySchema 3-bucket architecture parameters', () => {
    const category = CategorySchema.parse({
      ...mockBase,
      name: 'Rent & Bills',
      type: 'REGULAR',
      isCommitted: true,
      monthlyAmount: '1200.00',
      budgetFrequency: 'MONTHLY',
      isDefaultExcess: false,
      rolloverRule: 'ROLLOVER',
      isDefaultSavings: false,
      everydayTargetKeepAmount: null,
      everydaySweepFrequency: null,
      icon: 'home',
      colour: '#123456',
      bankAccountId: null,
    });
    expect(category.type).toBe('REGULAR');
    expect(category.colour).toBe('#123456');

    // Invalid hex color
    expect(() =>
      CategorySchema.parse({
        ...mockBase,
        name: 'Bad Color',
        type: 'GOAL',
        monthlyAmount: null,
        everydayTargetKeepAmount: null,
        everydaySweepFrequency: null,
        icon: null,
        colour: 'invalid-hex',
        bankAccountId: null,
      })
    ).toThrow();
  });

  it('validates CategoryScheduleSchema optional fields', () => {
    const sched = CategoryScheduleSchema.parse({
      ...mockBase,
      categoryId: '66666666-6666-4666-8666-666666666666',
      targetAmount: '500.00',
      dueDate: '2026-12-31',
      targetDate: null,
    });
    expect(sched.targetAmount).toBe('500.00');
  });

  it('validates IncomeSourceSchema and IncomeSourceScheduleSchema', () => {
    const incSource = IncomeSourceSchema.parse({
      ...mockBase,
      name: 'Tech Corp Salary',
      type: 'SALARY',
      amount: '5000.00',
      receivingAccountId: null,
    });
    expect(incSource.type).toBe('SALARY');

    const incSchedule = IncomeSourceScheduleSchema.parse({
      ...mockBase,
      incomeSourceId: incSource.id,
      rrule: 'FREQ=WEEKLY;BYDAY=FR',
      startDate: '2026-01-01',
      endDate: null,
      occurrenceCount: null,
      nextOccurrenceDate: '2026-08-01',
    });
    expect(incSchedule.rrule).toContain('FREQ=WEEKLY');
  });

  it('validates IncomeEventSchema, AllocationPlanSchema, and AllocationPlanLineSchema', () => {
    const incEvent = IncomeEventSchema.parse({
      ...mockBase,
      incomeSourceId: '66666666-6666-4666-8666-666666666666',
      expectedDate: '2026-08-01',
      expectedAmount: '2500.00',
      actualAmount: null,
      status: 'UPCOMING',
    });
    expect(incEvent.status).toBe('UPCOMING');

    const plan = AllocationPlanSchema.parse({
      ...mockBase,
      incomeEventId: incEvent.id,
      status: 'PENDING',
      totalIncomeAmount: '2500.00',
      confirmedAt: null,
    });
    expect(plan.status).toBe('PENDING');

    const planLine = AllocationPlanLineSchema.parse({
      ...mockBase,
      planId: plan.id,
      categoryId: '77777777-7777-4777-8777-777777777777',
      proposedAmount: '500.00',
      confirmedAmount: null,
      reasoning: 'Fixed monthly obligation',
    });
    expect(planLine.proposedAmount).toBe('500.00');
  });

  it('validates TransactionLedgerSchema and transaction queries', () => {
    const tx = TransactionLedgerSchema.parse({
      ...mockBase,
      categoryId: '77777777-7777-4777-8777-777777777777',
      bankAccountId: null,
      planLineId: null,
      flowType: 'DEBIT',
      amount: '45.50',
      idempotencyKey: 'tx_12345',
      note: 'Grocery store purchase',
      recordedAt: new Date(),
    });
    expect(tx.flowType).toBe('DEBIT');
    expect(tx.source).toBe('MANUAL');

    const listQuery = ListTransactionsQuery.parse({});
    expect(listQuery.limit).toBe(50);
    expect(listQuery.offset).toBe(0);

    const catQuery = ListCategoryTransactionsQuery.parse({
      categoryId: '77777777-7777-4777-8777-777777777777',
    });
    expect(catQuery.limit).toBe(30);
  });

  it('validates CanAffordQuery and CanAffordVerdictDto discriminated union variants', () => {
    const validQuery = CanAffordQuery.parse({ amount: '120.50' });
    expect(validQuery.amount).toBe('120.50');

    expect(() => CanAffordQuery.parse({ amount: '120.501' })).toThrow();

    const yesVerdict = CanAffordVerdictDto.parse({
      verdict: 'YES',
      source: 'everyday',
      everydayRemaining: '540.00',
    });
    expect(yesVerdict.verdict).toBe('YES');

    const waitVerdict = CanAffordVerdictDto.parse({
      verdict: 'WAIT',
      daysUntilNextPaycheck: 5,
      amountExpected: '1500.00',
    });
    expect(waitVerdict.verdict).toBe('WAIT');

    const noVerdict = CanAffordVerdictDto.parse({
      verdict: 'NO',
      shortfall: '80.00',
    });
    expect(noVerdict.verdict).toBe('NO');
  });

  it('validates MonthlySummaryDto, ConfirmPlanCommand, and UserPreferencesSchema', () => {
    const summary = MonthlySummaryDto.parse({
      year: 2026,
      month: 7,
      totalIncome: '4000.00',
      totalSpent: '2100.00',
      totalSaved: '1000.00',
      everydayRemaining: '900.00',
    });
    expect(summary.month).toBe(7);

    const confirmCmd = ConfirmPlanCommand.parse({
      planId: '88888888-8888-4888-8888-888888888888',
      lines: [
        {
          lineId: '99999999-9999-4999-8999-999999999999',
          confirmedAmount: '350.00',
        },
      ],
    });
    expect(confirmCmd.lines[0].confirmedAmount).toBe('350.00');

    const prefs = UserPreferencesSchema.parse({});
    expect(prefs.quickActionsCollapsed).toBe(false);
    expect(prefs.timezone).toBe('UTC');
  });
});
