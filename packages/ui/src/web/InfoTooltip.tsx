"use client";

import React, { useState, useRef } from 'react';
import { useIconVisibility } from '../hooks/IconVisibilityContext';

export interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, title, className = '' }) => {
  const { showIcons } = useIconVisibility();
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<{ position: 'top' | 'bottom'; align: 'left' | 'center' | 'right' }>({
    position: 'top',
    align: 'center',
  });
  const containerRef = useRef<HTMLSpanElement>(null);

  if (!showIcons) return null;

  const handleOpen = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isNearTop = rect.top < 160;
      const isNearLeft = rect.left < 140;
      const isNearRight = typeof window !== 'undefined' && window.innerWidth - rect.right < 140;

      setPlacement({
        position: isNearTop ? 'bottom' : 'top',
        align: isNearLeft ? 'left' : isNearRight ? 'right' : 'center',
      });
    }
    setIsOpen(true);
  };

  const popoverPosClasses =
    placement.position === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2';

  const popoverAlignClasses =
    placement.align === 'left'
      ? 'left-0 translate-x-0'
      : placement.align === 'right'
      ? 'right-0 left-auto translate-x-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowClasses =
    placement.position === 'bottom'
      ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-[#1B2B4B]'
      : 'top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1B2B4B]';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) setIsOpen(false);
          else handleOpen();
        }}
        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-[#2563eb] text-[10px] font-bold inline-flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shrink-0"
        aria-label="Information"
      >
        ℹ
      </button>

      {isOpen && (
        <div className={`absolute ${popoverPosClasses} ${popoverAlignClasses} w-64 p-3 bg-[#1B2B4B] text-white text-xs rounded-xl shadow-xl z-50 pointer-events-auto transition-opacity animate-in fade-in duration-150`}>
          {title && <p className="font-bold mb-1 text-blue-300">{title}</p>}
          <p className="leading-relaxed opacity-95 text-slate-200">{content}</p>
          <div className={arrowClasses} />
        </div>
      )}
    </span>
  );
};
