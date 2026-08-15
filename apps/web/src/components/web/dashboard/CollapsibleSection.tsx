'use client';

import React, { useState, useEffect } from 'react';
import { useIconVisibility } from '@money-matters/ui';

export interface CollapsibleSectionProps {
  readonly title: string;
  readonly storageKey: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
  readonly action?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  storageKey,
  defaultOpen = true,
  children,
  action,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { showIcons } = useIconVisibility();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`collapsible_${storageKey}`);
      if (saved !== null) {
        setIsOpen(saved === 'true');
      }
    } catch {
      // Ignore localstorage errors
    }
  }, [storageKey]);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    try {
      localStorage.setItem(`collapsible_${storageKey}`, String(nextState));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden transition-all">
      <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-gray-100">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex items-center gap-2 text-left font-bold text-xs uppercase tracking-wider text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
        >
          {showIcons && (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
          <span>{title}</span>
          <span className="text-[10px] text-gray-400 font-normal normal-case">
            ({isOpen ? 'Collapse' : 'Expand'})
          </span>
        </button>

        {action && <div>{action}</div>}
      </div>

      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
