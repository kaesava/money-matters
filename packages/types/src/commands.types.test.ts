import { describe, it, expect } from 'vitest';
import {
  CreateTenantCommand,
  UpdateTenantCommand,
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  CreateIncomeSourceCommand,
  UpdateIncomeSourceCommand,
  CreateIncomeSourceScheduleCommand,
  CreateIncomeEventCommand,
  RecordExpenseCommand,
  MoveMoneyCommand,
  OverrideEventCommand,
  DeleteUpcomingEventCommand,
  BulkDeleteEventsCommand,
  ConfirmPaydayCommand,
  InvitePartnerCommand,
  AcceptInviteCommand,
  SyncLedgerMutationCommand,
  WaterfallExecutionPayload,
} from './commands.types.js';

describe('Command Schemas Validation', () => {
  it('validates CreateTenantCommand and UpdateTenantCommand', () => {
    const createRes = CreateTenantCommand.parse({ name: 'New Tenant' });
    expect(createRes.name).toBe('New Tenant');
    expect(() => CreateTenantCommand.parse({ name: '' })).toThrow();

    const updateRes = UpdateTenantCommand.parse({ fyEndMonthDay: '12-31' });
    expect(updateRes.fyEndMonthDay).toBe('12-31');
    expect(() => UpdateTenantCommand.parse({ fyEndMonthDay: 'invalid' })).toThrow();
  });

  it('validates CreateBankAccountCommand and UpdateBankAccountCommand', () => {
    const bankCmd = CreateBankAccountCommand.parse({ name: 'Savings' });
    expect(bankCmd.name).toBe('Savings');

    const updateBank = UpdateBankAccountCommand.parse({ lastKnownBalance: '1500.25' });
    expect(updateBank.lastKnownBalance).toBe('1500.25');
  });

  it('validates CreateCategoryCommand and UpdateCategoryCommand', () => {
    const catCmd = CreateCategoryCommand.parse({
      name: 'Groceries',
      type: 'EVERYDAY',
      colour: '#FF0000',
    });
    expect(catCmd.type).toBe('EVERYDAY');

    expect(() =>
      CreateCategoryCommand.parse({
        name: 'Invalid Type',
        type: 'INVALID' as any,
      })
    ).toThrow();

    const updateCat = UpdateCategoryCommand.parse({
      isCommitted: true,
      monthlyAmount: '300.00',
    });
    expect(updateCat.isCommitted).toBe(true);
  });

  it('validates CreateCategoryScheduleCommand', () => {
    const schedCmd = CreateCategoryScheduleCommand.parse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      targetAmount: '1000.00',
      dueDate: '2026-12-01',
    });
    expect(schedCmd.targetAmount).toBe('1000.00');
  });

  it('validates CreateIncomeSourceCommand and UpdateIncomeSourceCommand', () => {
    const incCmd = CreateIncomeSourceCommand.parse({
      name: 'Salary',
      amount: '3500.00',
    });
    expect(incCmd.amount).toBe('3500.00');

    const updateInc = UpdateIncomeSourceCommand.parse({ amount: '4000.00' });
    expect(updateInc.amount).toBe('4000.00');
  });

  it('validates CreateIncomeSourceScheduleCommand and CreateIncomeEventCommand', () => {
    const sched = CreateIncomeSourceScheduleCommand.parse({
      incomeSourceId: '11111111-1111-4111-8111-111111111111',
      rrule: 'FREQ=MONTHLY',
      startDate: '2026-01-01',
    });
    expect(sched.rrule).toBe('FREQ=MONTHLY');

    const event = CreateIncomeEventCommand.parse({
      incomeSourceId: '11111111-1111-4111-8111-111111111111',
      expectedDate: '2026-08-01',
      expectedAmount: '2000.00',
    });
    expect(event.expectedAmount).toBe('2000.00');
  });

  it('validates RecordExpenseCommand and MoveMoneyCommand', () => {
    const expense = RecordExpenseCommand.parse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      amount: '50.00',
    });
    expect(expense.flowType).toBe('DEBIT');
    expect(expense.source).toBe('MANUAL');

    const move = MoveMoneyCommand.parse({
      sourceCategoryId: '11111111-1111-4111-8111-111111111111',
      destinationCategoryId: '22222222-2222-4222-8222-222222222222',
      amount: '100.00',
    });
    expect(move.amount).toBe('100.00');
  });

  it('validates OverrideEventCommand, SkipEventsCommand, DeleteUpcomingEventCommand, and ConfirmPaydayCommand', () => {
    const override = OverrideEventCommand.parse({
      eventId: '11111111-1111-4111-8111-111111111111',
      eventType: 'INCOME',
      amount: '2200.00',
      expectedDate: '2026-08-02',
      name: 'Salary Paycheck',
      note: 'Bonus added',
    });
    expect(override.updateSeries).toBe(false);
    expect(override.name).toBe('Salary Paycheck');
    expect(override.note).toBe('Bonus added');

    const delEvt = DeleteUpcomingEventCommand.parse({
      eventId: '11111111-1111-4111-8111-111111111111',
      eventType: 'EXPENSE',
    });
    expect(delEvt.eventType).toBe('EXPENSE');

    const bulkDel = BulkDeleteEventsCommand.parse({
      incomeEventIds: ['11111111-1111-4111-8111-111111111111'],
      expenseEventIds: ['22222222-2222-4222-8222-222222222222'],
    });
    expect(bulkDel.incomeEventIds).toHaveLength(1);
    expect(bulkDel.expenseEventIds).toHaveLength(1);

    const payday = ConfirmPaydayCommand.parse({
      incomeEventId: '11111111-1111-4111-8111-111111111111',
      actualAmount: '2500.00',
      lines: [
        {
          bucketId: '22222222-2222-4222-8222-222222222222',
          amount: '500.00',
        },
      ],
    });
    expect(payday.lines[0].amount).toBe('500.00');
  });

  it('validates InvitePartnerCommand, AcceptInviteCommand, SyncLedgerMutationCommand, and WaterfallExecutionPayload', () => {
    const invite = InvitePartnerCommand.parse({ email: 'partner@example.com' });
    expect(invite.ttlHours).toBe(72);

    const accept = AcceptInviteCommand.parse({
      inviteToken: '11111111-1111-4111-8111-111111111111',
      userEmail: 'partner@example.com',
    });
    expect(accept.userEmail).toBe('partner@example.com');

    const sync = SyncLedgerMutationCommand.parse({
      clientMutationId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'mut-12345',
      clientTimestamp: '2026-07-26T00:00:00.000Z',
      categoryId: '22222222-2222-4222-8222-222222222222',
      amount: '45.50',
      flowType: 'DEBIT',
    });
    expect(sync.flowType).toBe('DEBIT');

    const waterfall = WaterfallExecutionPayload.parse({
      tenantId: '11111111-1111-4111-8111-111111111111',
      incomeEventId: '22222222-2222-4222-8222-222222222222',
      paycheckAmount: '3200.00',
      idempotencyKey: 'wf-key-99',
      executionLockId: '33333333-3333-4333-8333-333333333333',
    });
    expect(waterfall.paycheckAmount).toBe('3200.00');
  });
});

