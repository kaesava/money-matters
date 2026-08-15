"use client";

import React, { useState } from 'react';

export interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, title, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-[#2563eb] text-[10px] font-bold inline-flex items-center justify-center transition-colors border border-slate-200 cursor-pointer"
        aria-label="Information"
      >
        ℹ
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#1B2B4B] text-white text-xs rounded-xl shadow-xl z-50 pointer-events-auto transition-opacity animate-in fade-in duration-150">
          {title && <p className="font-bold mb-1 text-teal-300">{title}</p>}
          <p className="leading-relaxed opacity-95 text-slate-200">{content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1B2B4B]" />
        </div>
      )}
    </span>
  );
};
