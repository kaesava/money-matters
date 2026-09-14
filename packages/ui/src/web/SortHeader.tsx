'use client';

import React from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortHeaderProps<T extends string = string> {
  label: string;
  sortKey: T;
  currentKey: T;
  dir: SortDirection;
  onSort: (key: T) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function SortHeader<T extends string = string>({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  align = 'left',
  className = '',
}: SortHeaderProps<T>) {
  const isActive = currentKey === sortKey;

  let alignClass = 'text-left';
  if (align === 'right') {
    alignClass = 'text-right ml-auto justify-end';
  } else if (align === 'center') {
    alignClass = 'text-center mx-auto justify-center';
  }

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors select-none group cursor-pointer ${alignClass} ${className}`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`ml-0.5 transition-opacity font-mono font-bold ${
          isActive ? 'opacity-100 text-[#2563eb]' : 'opacity-0 group-hover:opacity-40'
        }`}
      >
        {isActive && dir === 'asc' ? '↑' : '↓'}
      </span>
    </button>
  );
}

export default SortHeader;
