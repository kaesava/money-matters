'use client';

import React from 'react';
import { getStatusColor, type StatusWorkflowConfig } from '@money-matters/types';

interface StatusBadgeProps {
  status: string;
  config?: StatusWorkflowConfig;
  className?: string;
}

/**
 * Unified status badge component used consistently across all dashboard views.
 * Driven by the status workflow engine.
 */
export function StatusBadge({ status, config, className = '' }: StatusBadgeProps) {
  const colours = getStatusColor(status, 'web', config);
  const colorClasses = `${colours.bg} border ${colours.border || 'border-slate-200'}`;
  
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
}

