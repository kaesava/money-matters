'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'paused'
  | 'active'
  | 'archived'
  | 'pending'
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

interface StatusBadgeProps {
  status: string;
  /** Override the auto-resolved variant colour. */
  variant?: StatusVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning:  'bg-amber-50 text-amber-700 border border-amber-200',
  danger:   'bg-rose-50 text-rose-700 border border-rose-200',
  info:     'bg-sky-50 text-sky-700 border border-sky-200',
  neutral:  'bg-slate-100 text-slate-600 border border-slate-200',
  paused:   'bg-amber-50 text-amber-700 border border-amber-200',
  active:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-slate-100 text-slate-500 border border-slate-200',
  pending:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  draft:    'bg-slate-100 text-slate-600 border border-slate-200',
  sent:     'bg-blue-50 text-blue-700 border border-blue-200',
  paid:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  overdue:  'bg-rose-50 text-rose-700 border border-rose-200',
  cancelled:'bg-slate-100 text-slate-500 border border-slate-200',
};

/**
 * Resolves a status string to a colour variant automatically.
 * Covers the full range of statuses used across Orders, Invoices,
 * Memberships, Appointments, and Customers.
 */
function resolveVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (['active', 'confirmed', 'paid', 'completed', 'success', 'scheduled'].includes(s)) return 'success';
  if (['paused', 'pending_payment', 'pending'].includes(s)) return 'paused';
  if (['cancelled', 'canceled', 'archived'].includes(s)) return 'cancelled';
  if (['overdue', 'failed', 'error', 'noshow'].includes(s)) return 'overdue';
  if (['draft'].includes(s)) return 'draft';
  if (['sent'].includes(s)) return 'sent';
  if (['lead'].includes(s)) return 'warning';
  if (['prospect', 'processing'].includes(s)) return 'info';
  return 'neutral';
}

/**
 * Unified status badge component used consistently across all dashboard views.
 * Automatically maps status strings to colours; variant can be overridden.
 *
 * @example
 * <StatusBadge status="ACTIVE" />
 * <StatusBadge status="PAUSED" variant="warning" />
 */
export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const resolved = variant ?? resolveVariant(status);
  const colours = VARIANT_CLASSES[resolved];
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${colours} ${className}`}
    >
      {status}
    </span>
  );
}
