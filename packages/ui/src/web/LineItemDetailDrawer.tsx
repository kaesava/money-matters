'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { GenericDetailDrawer } from './GenericDetailDrawer';

export interface LineItem {
  id?: string;
  name?: string;
  description?: string;
  quantity: number;
  unitPriceCents: number;
  gstRate?: number;
  gstAmountCents?: number;
  totalAmountCents?: number;
}

interface LineItemDetailDrawerProps {
  lineItem: LineItem | null;
  onClose: () => void;
  onBack: () => void;
}

export function LineItemDetailDrawer({
  lineItem,
  onClose,
  onBack,
}: LineItemDetailDrawerProps) {
  if (!lineItem) return null;

  const formatCents = (cents: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
  };

  const title = lineItem.name || lineItem.description || t('neo.lineItemDetail.defaultTitle');
  const subtotal = lineItem.quantity * lineItem.unitPriceCents;
  const gstRate = lineItem.gstRate ?? 10; // Default 10%
  const gstAmount = lineItem.gstAmountCents ?? Math.round(subtotal * (gstRate / 100));
  const total = lineItem.totalAmountCents ?? (subtotal + gstAmount);

  const fields = [
    { label: t('common.description'), value: title, isImportant: true },
    { label: t('common.quantity'), value: lineItem.quantity.toString() },
    { label: t('common.unitPrice'), value: formatCents(lineItem.unitPriceCents) },
    { label: t('common.subtotal'), value: formatCents(subtotal) },
    { label: t('common.gst', { rate: gstRate }), value: formatCents(gstAmount) },
    { label: t('common.totalAmount'), value: formatCents(total), isImportant: true },
  ];

  return (
    <GenericDetailDrawer
      title={t('neo.lineItemDetail.title')}
      subtitle={title}
      onClose={onClose}
      onBack={onBack}
      fields={fields}
    />
  );
}
