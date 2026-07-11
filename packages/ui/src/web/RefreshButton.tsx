'use client';

import { RotateCcw } from 'lucide-react';
import React from 'react';

interface RefreshButtonProps {
  /** Called when the user clicks refresh. Can be async. */
  onRefresh: () => void | Promise<void>;
  /** When true, the icon animates with a spin. */
  isRefreshing?: boolean;
  /** Tooltip label. */
  title?: string;
  className?: string;
}

/**
 * Reusable header refresh button that animates while data is being fetched.
 *
 * Usage replaces `onClick={() => window.location.reload()}` calls across all
 * dashboard views. The button calls `onRefresh` (typically a tRPC `refetch()`)
 * and shows a spinning icon to communicate activity without a full page reload.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  title = 'Refresh',
  className = '',
}: RefreshButtonProps) {
  const handleClick = async () => {
    await onRefresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      title={title}
      type="button"
      className={`p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <RotateCcw className={`w-5 h-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}
