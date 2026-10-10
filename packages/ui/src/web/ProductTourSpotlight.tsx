'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ProductTourSpotlightProps {
  targetRect: DOMRect | null;
  onDismiss: () => void;
}

export function ProductTourSpotlight({ targetRect, onDismiss }: ProductTourSpotlightProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const padding = 8;
  const radius = 12;

  return createPortal(
    <div
      className="fixed inset-0 z-40 pointer-events-auto transition-opacity duration-300"
      onClick={onDismiss}
      aria-hidden="true"
    >
      <svg className="w-full h-full block" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={radius}
                ry={radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#spotlight-mask)"
        />
        {targetRect && (
          <rect
            x={Math.max(0, targetRect.left - padding)}
            y={Math.max(0, targetRect.top - padding)}
            width={targetRect.width + padding * 2}
            height={targetRect.height + padding * 2}
            rx={radius}
            ry={radius}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>,
    document.body
  );
}
