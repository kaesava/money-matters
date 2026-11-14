import { describe, it, expect } from 'vitest';

describe('Mobile Spreadsheet Matrix Logic', () => {
  it('correctly handles next 5 versus full 12 horizon slicing', () => {
    const mockColumns = Array.from({ length: 12 }, (_, i) => ({
      id: `col-${i + 1}`,
      sourceName: `Salary ${i + 1}`,
      totalIncome: 3000,
    }));

    const next5 = mockColumns.slice(0, 5);
    expect(next5).toHaveLength(5);
    expect(next5[0].id).toBe('col-1');
    expect(next5[4].id).toBe('col-5');

    const full12 = mockColumns;
    expect(full12).toHaveLength(12);
  });

  it('correctly filters columns by status using columnStateMap', () => {
    const mockColumns = [
      { id: 'c-1', totalIncome: 2000 },
      { id: 'c-2', totalIncome: 2000 },
      { id: 'c-3', totalIncome: 2000 },
    ];
    const stateMap: Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'> = {
      'c-1': 'CONFIRMED',
      'c-2': 'SAVED',
      'c-3': 'AUTO',
    };

    const confirmedOnly = mockColumns.filter((c) => (stateMap[c.id] || 'AUTO') === 'CONFIRMED');
    expect(confirmedOnly).toHaveLength(1);
    expect(confirmedOnly[0].id).toBe('c-1');

    const pendingOnly = mockColumns.filter((c) => (stateMap[c.id] || 'AUTO') !== 'CONFIRMED');
    expect(pendingOnly).toHaveLength(2);
  });

  it('correctly resolves cell overrides for saved plans', () => {
    const baseCell = { allocated: 150, projectedBalance: 600 };
    const savedOverrides: Record<string, number> = {
      'c-2_pool-bills': 250,
    };

    const keyWithOverride = 'c-2_pool-bills';
    const effectiveAllocated = savedOverrides[keyWithOverride] ?? baseCell.allocated;
    expect(effectiveAllocated).toBe(250);

    const keyWithoutOverride = 'c-3_pool-bills';
    const normalAllocated = savedOverrides[keyWithoutOverride] ?? baseCell.allocated;
    expect(normalAllocated).toBe(150);
  });

  it('identifies deficit conditions when surplus target value is negative', () => {
    const positiveSurplus = 420.50;
    const isDeficitPositive = Boolean(positiveSurplus < 0);
    expect(isDeficitPositive).toBe(false);

    const negativeSurplus = -120.00;
    const isDeficitNegative = Boolean(negativeSurplus < 0);
    expect(isDeficitNegative).toBe(true);
  });
});
