import { describe, expect, it } from 'vitest';
import {
  BillLifecycleStatusSchema,
  BILL_LIFECYCLE_META,
  canTransitionBillLifecycleStatus,
  transitionBillLifecycleStatus,
} from './bill-lifecycle-fsm.js';

describe('BillLifecycleFSM Engine', () => {
  describe('Zod Schema Validation', () => {
    it('validates correct lifecycle status strings', () => {
      expect(BillLifecycleStatusSchema.parse('PENDING')).toBe('PENDING');
      expect(BillLifecycleStatusSchema.parse('RING_FENCED')).toBe('RING_FENCED');
      expect(BillLifecycleStatusSchema.parse('CONFIRMED')).toBe('CONFIRMED');
      expect(BillLifecycleStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
    });

    it('rejects invalid lifecycle status strings', () => {
      expect(() => BillLifecycleStatusSchema.parse('INVALID_STATUS')).toThrow();
      expect(() => BillLifecycleStatusSchema.parse('upcoming')).toThrow();
    });
  });

  describe('Transition Validation Logic', () => {
    it('allows valid transitions from PENDING', () => {
      expect(canTransitionBillLifecycleStatus('PENDING', 'RING_FENCED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('PENDING', 'CONFIRMED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('PENDING', 'OVERDUE')).toBe(false);
    });

    it('allows valid transitions from RING_FENCED', () => {
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'CONFIRMED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'OVERDUE')).toBe(true);
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'PENDING')).toBe(false);
    });

    it('allows valid transitions from OVERDUE', () => {
      expect(canTransitionBillLifecycleStatus('OVERDUE', 'CONFIRMED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('OVERDUE', 'RING_FENCED')).toBe(false);
    });

    it('prevents transitions from terminal state CONFIRMED', () => {
      expect(canTransitionBillLifecycleStatus('CONFIRMED', 'PENDING')).toBe(false);
      expect(canTransitionBillLifecycleStatus('CONFIRMED', 'RING_FENCED')).toBe(false);
    });

    it('returns same status when transitioning to self', () => {
      expect(transitionBillLifecycleStatus('PENDING', 'PENDING')).toBe('PENDING');
      expect(transitionBillLifecycleStatus('CONFIRMED', 'CONFIRMED')).toBe('CONFIRMED');
    });

    it('executes valid transitions successfully', () => {
      expect(transitionBillLifecycleStatus('PENDING', 'RING_FENCED')).toBe('RING_FENCED');
      expect(transitionBillLifecycleStatus('RING_FENCED', 'CONFIRMED')).toBe('CONFIRMED');
      expect(transitionBillLifecycleStatus('OVERDUE', 'CONFIRMED')).toBe('CONFIRMED');
    });

    it('throws explicit error on illegal transition', () => {
      expect(() => transitionBillLifecycleStatus('CONFIRMED', 'PENDING')).toThrow(
        /Invalid bill lifecycle transition/
      );
    });
  });

  describe('Design Token Mappings', () => {
    it('contains valid Serene Finance token definitions for every status', () => {
      const statuses = ['PENDING', 'RING_FENCED', 'CONFIRMED', 'OVERDUE'] as const;
      
      for (const status of statuses) {
        const meta = BILL_LIFECYCLE_META[status];
        expect(meta).toBeDefined();
        expect(meta.code).toBe(status);
        expect(meta.visuals.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(meta.visuals.web.badge).toBeTypeOf('string');
        expect(meta.visuals.web.text).toBeTypeOf('string');
      }
    });

    it('correctly flags terminal states', () => {
      expect(BILL_LIFECYCLE_META.CONFIRMED.isTerminal).toBe(true);
      expect(BILL_LIFECYCLE_META.PENDING.isTerminal).toBe(false);
      expect(BILL_LIFECYCLE_META.RING_FENCED.isTerminal).toBe(false);
      expect(BILL_LIFECYCLE_META.OVERDUE.isTerminal).toBe(false);
    });
  });
});
