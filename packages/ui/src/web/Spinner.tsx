import React from "react";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: string;
  label?: string;
}

export function Spinner({ size = "md", className = "", color, label }: SpinnerProps) {
  const dimensions = {
    xs: { outer: "w-4 h-4", inner: "w-2 h-2", text: "text-[10px]" },
    sm: { outer: "w-5 h-5", inner: "w-2.5 h-2.5", text: "text-xs" },
    md: { outer: "w-8 h-8", inner: "w-4 h-4", text: "text-xs" },
    lg: { outer: "w-12 h-12", inner: "w-6 h-6", text: "text-sm" },
    xl: { outer: "w-16 h-16", inner: "w-8 h-8", text: "text-base" },
  };

  const currentDim = dimensions[size] || dimensions.md;
  const accentColor = color || "var(--dash-teal, #00B4A6)";
  const primaryColor = "var(--dash-navy, #1B2B4B)";

  return (
    <div
      className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}
      role="status"
      aria-label={label || "Loading"}
    >
      <div className={`relative flex items-center justify-center shrink-0 ${currentDim.outer}`}>
        {/* Outer Ring / Ripple */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-ping opacity-30"
          style={{ borderColor: accentColor }}
        />
        {/* Main Orbiting Coin Ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: `${accentColor}33`, // 20% opacity track
            borderTopColor: accentColor,
            animationDuration: "0.85s",
          }}
        />
        {/* Inner Pulsing Money Core ($) */}
        <div
          className={`rounded-full flex items-center justify-center font-bold text-white shadow-sm animate-pulse ${currentDim.inner}`}
          style={{ backgroundColor: primaryColor }}
        >
          <span className="text-[9px] leading-none font-mono font-black">$</span>
        </div>
      </div>

      {label && (
        <span
          className={`font-semibold tracking-tight text-slate-500 animate-pulse ${currentDim.text}`}
        >
          {label}
        </span>
      )}
      <span className="sr-only">{label || "Loading..."}</span>
    </div>
  );
}

export default Spinner;
