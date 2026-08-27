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
      expect(BillLifecycleStatusSchema.parse('UPCOMING')).toBe('UPCOMING');
      expect(BillLifecycleStatusSchema.parse('RING_FENCED')).toBe('RING_FENCED');
      expect(BillLifecycleStatusSchema.parse('PAID')).toBe('PAID');
      expect(BillLifecycleStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
      expect(BillLifecycleStatusSchema.parse('SKIPPED')).toBe('SKIPPED');
    });

    it('rejects invalid lifecycle status strings', () => {
      expect(() => BillLifecycleStatusSchema.parse('INVALID_STATUS')).toThrow();
      expect(() => BillLifecycleStatusSchema.parse('upcoming')).toThrow();
    });
  });

  describe('Transition Validation Logic', () => {
    it('allows valid transitions from UPCOMING', () => {
      expect(canTransitionBillLifecycleStatus('UPCOMING', 'RING_FENCED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('UPCOMING', 'PAID')).toBe(true);
      expect(canTransitionBillLifecycleStatus('UPCOMING', 'SKIPPED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('UPCOMING', 'OVERDUE')).toBe(false);
    });

    it('allows valid transitions from RING_FENCED', () => {
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'PAID')).toBe(true);
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'OVERDUE')).toBe(true);
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'SKIPPED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('RING_FENCED', 'UPCOMING')).toBe(false);
    });

    it('allows valid transitions from OVERDUE', () => {
      expect(canTransitionBillLifecycleStatus('OVERDUE', 'PAID')).toBe(true);
      expect(canTransitionBillLifecycleStatus('OVERDUE', 'SKIPPED')).toBe(true);
      expect(canTransitionBillLifecycleStatus('OVERDUE', 'RING_FENCED')).toBe(false);
    });

    it('prevents transitions from terminal states PAID and SKIPPED', () => {
      expect(canTransitionBillLifecycleStatus('PAID', 'UPCOMING')).toBe(false);
      expect(canTransitionBillLifecycleStatus('PAID', 'RING_FENCED')).toBe(false);
      expect(canTransitionBillLifecycleStatus('SKIPPED', 'UPCOMING')).toBe(false);
      expect(canTransitionBillLifecycleStatus('SKIPPED', 'PAID')).toBe(false);
    });

    it('returns same status when transitioning to self', () => {
      expect(transitionBillLifecycleStatus('UPCOMING', 'UPCOMING')).toBe('UPCOMING');
      expect(transitionBillLifecycleStatus('PAID', 'PAID')).toBe('PAID');
    });

    it('executes valid transitions successfully', () => {
      expect(transitionBillLifecycleStatus('UPCOMING', 'RING_FENCED')).toBe('RING_FENCED');
      expect(transitionBillLifecycleStatus('RING_FENCED', 'PAID')).toBe('PAID');
      expect(transitionBillLifecycleStatus('OVERDUE', 'PAID')).toBe('PAID');
    });

    it('throws explicit error on illegal transition', () => {
      expect(() => transitionBillLifecycleStatus('PAID', 'UPCOMING')).toThrow(
        /Invalid bill lifecycle transition/
      );
    });
  });

  describe('Design Token Mappings', () => {
    it('contains valid Serene Finance token definitions for every status', () => {
      const statuses = ['UPCOMING', 'RING_FENCED', 'PAID', 'OVERDUE', 'SKIPPED'] as const;
      
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
      expect(BILL_LIFECYCLE_META.PAID.isTerminal).toBe(true);
      expect(BILL_LIFECYCLE_META.SKIPPED.isTerminal).toBe(true);
      expect(BILL_LIFECYCLE_META.UPCOMING.isTerminal).toBe(false);
      expect(BILL_LIFECYCLE_META.RING_FENCED.isTerminal).toBe(false);
      expect(BILL_LIFECYCLE_META.OVERDUE.isTerminal).toBe(false);
    });
  });
});
