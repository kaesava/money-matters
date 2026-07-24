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
  SkipEventsCommand,
  ConfirmPaydayCommand,
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

  it('validates OverrideEventCommand, SkipEventsCommand, and ConfirmPaydayCommand', () => {
    const override = OverrideEventCommand.parse({
      eventId: '11111111-1111-4111-8111-111111111111',
      eventType: 'INCOME',
      amount: '2200.00',
      expectedDate: '2026-08-02',
    });
    expect(override.updateSeries).toBe(false);

    const skip = SkipEventsCommand.parse({
      eventIds: ['11111111-1111-4111-8111-111111111111'],
      eventType: 'EXPENSE',
    });
    expect(skip.eventIds).toHaveLength(1);

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
});
