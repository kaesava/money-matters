import { describe, it, expect } from 'vitest';
import {
  calculateShortfall,
  calculateTotalAllocated,
  validateShortfallAllocations,
} from './shortfall-allocation';

describe('shortfall-allocation engine', () => {
  describe('calculateShortfall', () => {
    it('returns 0 when pool balance covers expense', () => {
      expect(calculateShortfall(100, 150)).toBe(0);
      expect(calculateShortfall(100, 100)).toBe(0);
    });

    it('returns exact difference when balance is less than expense', () => {
      expect(calculateShortfall(100, 40)).toBe(60);
      expect(calculateShortfall(150.5, 50.25)).toBe(100.25);
    });

    it('handles negative or zero balances', () => {
      expect(calculateShortfall(100, -20)).toBe(120);
      expect(calculateShortfall(100, 0)).toBe(100);
    });
  });

  describe('calculateTotalAllocated', () => {
    it('sums string and number values', () => {
      const allocations = {
        pool1: '25.50',
        pool2: 30.25,
        pool3: '0',
        pool4: '',
      };
      expect(calculateTotalAllocated(allocations)).toBe(55.75);
    });
  });

  describe('validateShortfallAllocations', () => {
    it('is valid when there is no shortfall', () => {
      const res = validateShortfallAllocations(0, {});
      expect(res.isValid).toBe(true);
      expect(res.hasShortfall).toBe(false);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(false);
    });

    it('is valid when total allocated exactly matches shortfall', () => {
      const res = validateShortfallAllocations(75.5, {
        p1: '50.00',
        p2: '25.50',
      });
      expect(res.isValid).toBe(true);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(false);
      expect(res.difference).toBe(0);
    });

    it('flags over-allocation when total exceeds shortfall', () => {
      const res = validateShortfallAllocations(50, {
        p1: '40.00',
        p2: '20.00',
      });
      expect(res.isValid).toBe(false);
      expect(res.isOverAllocated).toBe(true);
      expect(res.isUnderAllocated).toBe(false);
      expect(res.difference).toBe(10);
    });

    it('flags under-allocation when total is less than shortfall', () => {
      const res = validateShortfallAllocations(50, {
        p1: '30.00',
      });
      expect(res.isValid).toBe(false);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(true);
      expect(res.difference).toBe(20);
    });
  });
});
