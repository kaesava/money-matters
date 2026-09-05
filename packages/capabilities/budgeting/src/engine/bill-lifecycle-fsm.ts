import { z } from 'zod';

/**
 * Supported lifecycle states for forward-looking bill allocation and settlement.
 * 
 * Lifecycles govern how bills move from pending payday setup to full settlement:
 * - PENDING: Scheduled bill awaiting future payday ring-fencing.
 * - RING_FENCED: Payday funds successfully reserved into virtual bucket.
 * - CONFIRMED: Settlement confirmed against bank ledger transaction.
 * - OVERDUE: Due date passed without complete ring-fencing or payment.
 */
export const BillLifecycleStatusSchema = z.enum([
  'PENDING',
  'RING_FENCED',
  'CONFIRMED',
  'OVERDUE',
]);

export type BillLifecycleStatus = z.infer<typeof BillLifecycleStatusSchema>;

/**
 * Serene Finance visual tokens bound directly to lifecycle states.
 * Guarantees zero hardcoded ad-hoc styles in web/mobile renderers.
 */
export interface BillStatusVisualTokens {
  /** Serene Finance theme token reference */
  tokenName: 'sereneBlue' | 'primary' | 'success' | 'burnRed' | 'surfaceVariant';
  /** Primary Hex color code for React Native Expo elements */
  hex: string;
  /** Web Tailwind CSS color classes */
  web: {
    badge: string;
    text: string;
    border: string;
  };
}

export interface BillLifecycleStatusMeta {
  code: BillLifecycleStatus;
  labelKey: string;
  descriptionKey: string;
  isTerminal: boolean;
  visuals: BillStatusVisualTokens;
}

/**
 * Strict transition map defining valid state progressions.
 */
export const BILL_LIFECYCLE_TRANSITIONS: Record<BillLifecycleStatus, readonly BillLifecycleStatus[]> = {
  PENDING: ['RING_FENCED', 'CONFIRMED'],
  RING_FENCED: ['CONFIRMED', 'OVERDUE'],
  OVERDUE: ['CONFIRMED'],
  CONFIRMED: [],
} as const;

/**
 * Complete metadata catalog for bill lifecycle states, mapped to Serene Finance design tokens.
 */
export const BILL_LIFECYCLE_META: Record<BillLifecycleStatus, BillLifecycleStatusMeta> = {
  PENDING: {
    code: 'PENDING',
    labelKey: 'expenseStatus.pendingLabel',
    descriptionKey: 'expenseStatus.pendingDesc',
    isTerminal: false,
    visuals: {
      tokenName: 'primary',
      hex: '#1B2B4B', // Navy
      web: {
        badge: 'bg-slate-100 text-slate-800',
        text: 'text-slate-800',
        border: 'border-slate-300',
      },
    },
  },
  RING_FENCED: {
    code: 'RING_FENCED',
    labelKey: 'expenseStatus.ringFencedLabel',
    descriptionKey: 'expenseStatus.ringFencedDesc',
    isTerminal: false,
    visuals: {
      tokenName: 'sereneBlue',
      hex: '#2563eb', // Serene Blue
      web: {
        badge: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        border: 'border-blue-500',
      },
    },
  },
  CONFIRMED: {
    code: 'CONFIRMED',
    labelKey: 'expenseStatus.confirmedLabel',
    descriptionKey: 'expenseStatus.confirmedDesc',
    isTerminal: true,
    visuals: {
      tokenName: 'success',
      hex: '#22C55E', // Green
      web: {
        badge: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        border: 'border-emerald-500',
      },
    },
  },
  OVERDUE: {
    code: 'OVERDUE',
    labelKey: 'expenseStatus.overdueLabel',
    descriptionKey: 'expenseStatus.overdueDesc',
    isTerminal: false,
    visuals: {
      tokenName: 'burnRed',
      hex: '#ba1a1a', // Burn Red
      web: {
        badge: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        border: 'border-rose-500',
      },
    },
  },
};

/**
 * Validates whether a state transition from `currentStatus` to `nextStatus` is permitted.
 */
export function canTransitionBillLifecycleStatus(
  currentStatus: BillLifecycleStatus,
  nextStatus: BillLifecycleStatus
): boolean {
  const allowedTransitions = BILL_LIFECYCLE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(nextStatus);
}

/**
 * Executes a state transition, returning the new status if valid or throwing a descriptive error.
 */
export function transitionBillLifecycleStatus(
  currentStatus: BillLifecycleStatus,
  nextStatus: BillLifecycleStatus
): BillLifecycleStatus {
  if (currentStatus === nextStatus) {
    return currentStatus;
  }

  if (!canTransitionBillLifecycleStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid bill lifecycle transition: Cannot change status from '${currentStatus}' to '${nextStatus}'. Allowed target statuses: [${BILL_LIFECYCLE_TRANSITIONS[currentStatus].join(', ')}].`
    );
  }

  return nextStatus;
}
