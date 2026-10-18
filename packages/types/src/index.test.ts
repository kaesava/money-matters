import { describe, it, expect } from 'vitest';
import {
  BaseSchema,
  TenantSchema,
  TenantMemberSchema,
  BankAccountSchema,
  EnvelopeSchema,
  IncomeSourceSchema,
  IncomeSourceScheduleSchema,
  IncomeEventSchema,
  AllocationPlanSchema,
  AllocationPlanLineSchema,
  TransactionLedgerSchema,
  ListTransactionsQuery,
  ListEnvelopeTransactionsQuery,
  CanAffordQuery,
  CanAffordVerdictDto,
  MonthlySummaryDto,
  ConfirmPlanCommand,
  UserPreferencesSchema,
  GetSpendingAnalyticsQuery,
  SpendingAnalyticsDTOSchema,
} from './index';

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

  it('validates TenantSchema defaults and properties', () => {
    const validTenant = TenantSchema.parse({
      ...mockBase,
      name: 'Acme Corp',
    });
    expect(validTenant.country).toBe('AU');
    expect(validTenant.currency).toBe('AUD');
    expect(validTenant.premiumEnabled).toBe(false);

    expect(() =>
      TenantSchema.parse({
        ...mockBase,
        name: 'Acme',
        country: 'INVALID',
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

  it('validates EnvelopeSchema parameters', () => {
    const envelope = EnvelopeSchema.parse({
      ...mockBase,
      name: 'Regular Bills',
      envelopeType: 'SCHEDULED_BILL',
      bankAccountId: '55555555-5555-4555-8555-555555555555',
      monthlyAmount: '1200.00',
      enteredAmount: '1200.00',
      budgetFrequency: 'MONTHLY',
    });
    expect(envelope.envelopeType).toBe('SCHEDULED_BILL');
  });

  it('validates IncomeSourceSchema and IncomeSourceScheduleSchema', () => {
    const incSource = IncomeSourceSchema.parse({
      ...mockBase,
      name: 'Tech Corp Salary',
      amount: '5000.00',
      receivingAccountId: null,
    });
    expect(incSource.incomeType).toBe('SALARIED');

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
      status: 'PENDING',
    });
    expect(incEvent.status).toBe('PENDING');

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
      envelopeId: '77777777-7777-4777-8777-777777777777',
      proposedAmount: '500.00',
      confirmedAmount: null,
      reasoning: 'Fixed monthly obligation',
    });
    expect(planLine.proposedAmount).toBe('500.00');
  });

  it('validates TransactionLedgerSchema and transaction queries', () => {
    const tx = TransactionLedgerSchema.parse({
      ...mockBase,
      envelopeId: '77777777-7777-4777-8777-777777777777',
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

    const envQuery = ListEnvelopeTransactionsQuery.parse({
      envelopeId: '77777777-7777-4777-8777-777777777777',
    });
    expect(envQuery.limit).toBe(30);
  });

  it('validates CanAffordQuery and CanAffordVerdictDto discriminated union variants', () => {
    const validQuery = CanAffordQuery.parse({ amount: '120.50' });
    expect(validQuery.amount).toBe('120.50');

    expect(() => CanAffordQuery.parse({ amount: '120.501' })).toThrow();

    const safeYesVerdict = CanAffordVerdictDto.parse({
      verdict: 'SAFE_YES',
      availableCash: '1000.00',
      effectiveSpendable: '800.00',
      everydayRemaining: '680.00',
      safeCushion: '120.00',
      daysUntilPayday: 10,
      nextPaydayDate: '2026-09-22',
      upcomingBillsBeforePayday: '200.00',
      rationaleSteps: ['Available cash: $1,000.00'],
    });
    expect(safeYesVerdict.verdict).toBe('SAFE_YES');

    const pacingTightVerdict = CanAffordVerdictDto.parse({
      verdict: 'PACING_TIGHT',
      availableCash: '200.00',
      effectiveSpendable: '50.00',
      everydayRemaining: '30.00',
      safeCushion: '60.00',
      cushionShortfall: '30.00',
      daysUntilPayday: 5,
      nextPaydayDate: '2026-09-17',
      upcomingBillsBeforePayday: '150.00',
      rationaleSteps: ['Leaves $30.00 remaining, below $60.00 cushion'],
    });
    expect(pacingTightVerdict.verdict).toBe('PACING_TIGHT');

    const billsRiskVerdict = CanAffordVerdictDto.parse({
      verdict: 'BILLS_RISK',
      availableCash: '500.00',
      upcomingBillsBeforePayday: '450.00',
      effectiveAfterBills: '50.00',
      billsDueItems: [{ name: 'Electricity', amount: '450.00', dueDate: '2026-09-10' }],
      rationaleSteps: ['Upcoming bills consume buffer'],
    });
    expect(billsRiskVerdict.verdict).toBe('BILLS_RISK');

    const waitVerdict = CanAffordVerdictDto.parse({
      verdict: 'WAIT_FOR_PAYCYCLE',
      canAffordAt: '2026-09-15',
      paycyclesAway: 1,
      projectedEverydayAtThatDate: '1200.00',
      shortfallToday: '50.00',
      goalAlternative: {
        goalId: '11111111-1111-1111-1111-111111111111',
        goalName: 'Holiday',
        availableGoalBalance: '500.00',
        shortfallCovered: '50.00',
        delayDays: 14,
        newTargetDate: '2026-10-01',
      },
      rationaleSteps: ['Next paycycle arrives in 5 days'],
    });
    expect(waitVerdict.verdict).toBe('WAIT_FOR_PAYCYCLE');

    const hardNoVerdict = CanAffordVerdictDto.parse({
      verdict: 'HARD_NO',
      shortfall: '70.00',
      horizonMonths: 12,
      rationaleSteps: ['Insufficient funds'],
    });
    expect(hardNoVerdict.verdict).toBe('HARD_NO');
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
    expect(prefs.timezone).toBe('UTC');
  });

  it('validates GetSpendingAnalyticsQuery and SpendingAnalyticsDTOSchema', () => {
    const defaultQuery = GetSpendingAnalyticsQuery.parse({});
    expect(defaultQuery.timeframe).toBe('90D');

    const explicitQuery = GetSpendingAnalyticsQuery.parse({ timeframe: '1Y' });
    expect(explicitQuery.timeframe).toBe('1Y');

    expect(() => GetSpendingAnalyticsQuery.parse({ timeframe: 'INVALID' })).toThrow();

    const sampleAnalytics = SpendingAnalyticsDTOSchema.parse({
      timeframe: '90D',
      totalOutflow: 3500.5,
      totalIncome: 6000,
      horizonBreakdown: {
        everyday: 1500,
        bills: 1500.5,
        goals: 500,
        totalOutflow: 3500.5,
        percentages: {
          everyday: 42.85,
          bills: 42.87,
          goals: 14.28,
        },
      },
      monthlyCashFlow: [
        {
          monthKey: '2026-08',
          label: 'Aug 26',
          income: 2000,
          outflow: 1200,
          net: 800,
        },
      ],
      topPools: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Groceries',
          amount: 800,
          percentage: 22.85,
        },
      ],
      otherPoolsAmount: 2700.5,
      isEmpty: false,
    });
    expect(sampleAnalytics.totalOutflow).toBe(3500.5);
    expect(sampleAnalytics.monthlyCashFlow).toHaveLength(1);
  });
});
