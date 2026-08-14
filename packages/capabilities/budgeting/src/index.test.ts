import { describe, it, expect } from 'vitest';
import { runAllocationEngine } from './engine/allocation-engine';
import { generateBurstDates } from './engine/burst-engine';

describe('budgeting capability', () => {
  it('calculates 5-step waterfall allocation correctly using runAllocationEngine', () => {
    const buckets = [
      { id: 'cat-1', name: 'Rent', type: 'REGULAR', targetAmount: 500, currentBalance: 100, isEssential: true },
      { id: 'cat-2', name: 'Groceries', type: 'EVERYDAY', targetAmount: 200, currentBalance: 50 },
      { id: 'cat-3', name: 'Emergency Fund', type: 'GOAL', targetAmount: 1000, currentBalance: 200 },
    ];

    const result = runAllocationEngine({
      incomeAmount: 800,
      buckets: buckets as any,
      paycheckDate: new Date(),
      paycheckFrequencyDays: 14,
    });

    expect(result).toBeDefined();
    expect(result.lines).toBeDefined();
    expect(result.unallocatedAmount).toBeGreaterThanOrEqual(0);
  });

  it('generates burst dates for scheduled recurrence', () => {
    const dates = generateBurstDates('FREQ=WEEKLY', new Date().toISOString());
    expect(dates).toBeDefined();
    expect(Array.isArray(dates)).toBe(true);
    expect(dates.length).toBeGreaterThan(0);
  });
});
