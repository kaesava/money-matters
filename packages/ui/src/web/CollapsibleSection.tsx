'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface WebCollapsibleSectionProps {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export const CollapsibleSection: React.FC<WebCollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  children,
  action,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {action ? <div onClick={(e) => e.stopPropagation()}>{action}</div> : null}
      </button>
      {isOpen ? <div className="p-4">{children}</div> : null}
    </div>
  );
};

export default CollapsibleSection;
