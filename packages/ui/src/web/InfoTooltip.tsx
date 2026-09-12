"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIconVisibility } from '../hooks/IconVisibilityContext';

export interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  position?: 'top' | 'bottom';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  className = '',
  align: overrideAlign,
  position: overridePosition,
}) => {
  const { showIcons } = useIconVisibility();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    arrowLeft: number;
    isBottom: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const isNearTop =
      overridePosition === 'bottom' ||
      (overridePosition !== 'top' && rect.top < 260);

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (overrideAlign === 'left') {
      left = rect.left;
    } else if (overrideAlign === 'right') {
      left = rect.right - tooltipWidth;
    }

    const minLeft = 16;
    const maxLeft =
      typeof window !== 'undefined' ? window.innerWidth - tooltipWidth - 16 : 300;
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));
    const triggerCenter = rect.left + rect.width / 2;
    const arrowLeft = Math.max(
      12,
      Math.min(triggerCenter - clampedLeft, tooltipWidth - 12)
    );

    if (isNearTop) {
      setCoords({
        top: rect.bottom + 8,
        left: clampedLeft,
        arrowLeft,
        isBottom: true,
      });
    } else {
      setCoords({
        bottom:
          (typeof window !== 'undefined' ? window.innerHeight : 800) -
          rect.top +
          8,
        left: clampedLeft,
        arrowLeft,
        isBottom: false,
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  if (!showIcons) return null;

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isOpen) setIsOpen(false);
          else handleOpen();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) setIsOpen(false);
            else handleOpen();
          }
        }}
        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-[#2563eb] text-[10px] font-bold inline-flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shrink-0 select-none"
        aria-label="Information"
      >
        ℹ
      </span>

      {isOpen &&
        mounted &&
        coords &&
        createPortal(
          <div
            style={{
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom:
                coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: '280px',
            }}
            className="fixed p-3 bg-[#1B2B4B] text-white text-xs rounded-xl shadow-2xl z-[9999] pointer-events-none transition-opacity animate-in fade-in duration-150"
          >
            {title && <p className="font-bold mb-1 text-blue-300">{title}</p>}
            <p className="leading-relaxed opacity-95 text-slate-200">
              {content}
            </p>
            <div
              style={{ left: `${coords.arrowLeft}px` }}
              className={`absolute -translate-x-1/2 border-4 border-transparent ${
                coords.isBottom
                  ? 'bottom-full -mb-1 border-b-[#1B2B4B]'
                  : 'top-full -mt-1 border-t-[#1B2B4B]'
              }`}
            />
          </div>,
          document.body
        )}
    </span>
  );
};
