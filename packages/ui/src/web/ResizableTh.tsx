"use client";

import React from "react";

export interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: number;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export function ResizableTh({
  width,
  onResizeMouseDown,
  children,
  className = "",
  style,
  ...props
}: ResizableThProps) {
  return (
    <th
      {...props}
      style={{
        width: width ? `${width}px` : style?.width,
        minWidth: width ? `${width}px` : style?.minWidth,
        maxWidth: width ? `${width}px` : style?.maxWidth,
        ...style,
      }}
      className={`relative select-none group ${className}`}
    >
      <div className="flex items-center justify-between overflow-hidden text-ellipsis">
        {children}
      </div>
      {onResizeMouseDown && (
        <div
          onMouseDown={onResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#2563eb]/40 group-hover:bg-zinc-300/60 transition-colors z-10"
          title="Drag to resize column"
        />
      )}
    </th>
  );
}
