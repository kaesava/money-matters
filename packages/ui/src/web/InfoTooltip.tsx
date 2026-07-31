import React, { useState } from 'react';

export interface InfoTooltipProps {
  content: string;
  title?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-100 text-slate-500 hover:text-blue-600 text-[10px] font-bold flex items-center justify-center transition-colors"
        aria-label="Information"
      >
        ℹ
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none">
          {title && <p className="font-bold mb-1 text-blue-300">{title}</p>}
          <p className="leading-relaxed opacity-90">{content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
