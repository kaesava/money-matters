import React from "react";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className = "", showText = false }: LogoProps) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-16 h-16",
  };

  const imageSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Brand Icon Image */}
      <img
        src="/icon-512x512.png"
        alt="Money Matters Logo"
        className={`${imageSizeClass} rounded-xl object-contain shadow-sm border border-white/10 shrink-0 transition-transform duration-300 hover:scale-105`}
      />
      {showText && (
        <span className="font-extrabold tracking-tight text-[#1B2B4B] dark:text-white select-none">
          Money Matters
        </span>
      )}
    </div>
  );
}

export default Logo;
