import React from "react";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: string;
}

export function Spinner({ size = "md", className = "", color }: SpinnerProps) {
  const sizeClasses = {
    xs: "w-3 h-3 border-[2px]",
    sm: "w-4 h-4 border-[2px]",
    md: "w-6 h-6 border-[2.5px]",
    lg: "w-8 h-8 border-[3px]",
    xl: "w-12 h-12 border-[4px]",
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`${selectedSizeClass} rounded-full border-current opacity-20`}
        style={{ color: color || "currentColor" }}
      />
      <div
        className={`absolute inset-0 ${selectedSizeClass} rounded-full border-t-transparent border-r-transparent animate-spin`}
        style={{
          borderColor: color || "currentColor",
          borderTopColor: "transparent",
          borderRightColor: "transparent",
        }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
