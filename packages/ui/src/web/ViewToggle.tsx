import React from 'react';

interface ViewToggleProps {
  viewMode: 'list' | 'board';
  onChange: (mode: 'list' | 'board') => void;
  showBoardOption?: boolean; // Default to true
  listLabel?: string;
  boardLabel?: string;
}

export function ViewToggle({
  viewMode,
  onChange,
  showBoardOption = true,
  listLabel = 'List',
  boardLabel = 'Board',
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-max">
      <button
        onClick={() => onChange('list')}
        className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
          viewMode === 'list'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        type="button"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{listLabel}</span>
      </button>
      {showBoardOption && (
        <button
          onClick={() => onChange('board')}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            viewMode === 'board'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          type="button"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span>{boardLabel}</span>
        </button>
      )}
    </div>
  );
}
