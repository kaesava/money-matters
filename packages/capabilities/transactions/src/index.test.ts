import { describe, it, expect } from 'vitest';
import { parseCsvBankStatement } from './csv-import';

describe('transactions capability', () => {
  it('parses CBA bank CSV statement format accurately', () => {
    const csvContent = `01/08/2026,-50.00,"WOOLWORTHS SYDNEY AU",123456`;
    const result = parseCsvBankStatement(csvContent, 'CBA');

    expect(result).toBeDefined();
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].amount).toBe('50.00');
    expect(result.rows[0].flowType).toBe('DEBIT');
  });

  it('handles empty CSV input gracefully', () => {
    const result = parseCsvBankStatement('', 'CBA');
    expect(result.rows.length).toBe(0);
  });
});
