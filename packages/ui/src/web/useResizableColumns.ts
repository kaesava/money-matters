"use client";

import React, { useState, useCallback, useRef } from "react";

export function useResizableColumns<T extends string>(
  initialWidths: Record<T, number>
) {
  const [widths, setWidths] = useState<Record<T, number>>(initialWidths);
  const resizingCol = useRef<T | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const onMouseDown = useCallback(
    (col: T, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingCol.current = col;
      startX.current = e.clientX;
      startWidth.current = widths[col] || 100;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingCol.current) return;
        const deltaX = moveEvent.clientX - startX.current;
        const newWidth = Math.max(60, startWidth.current + deltaX);
        const colKey = resizingCol.current;

        setWidths((prev) => ({
          ...prev,
          [colKey]: newWidth,
        }));
      };

      const onMouseUp = () => {
        resizingCol.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [widths]
  );

  return { widths, setWidths, onMouseDown };
}
