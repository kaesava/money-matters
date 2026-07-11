'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { t } from '@money-matters/i18n';

export interface SearchSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  searchKeywords?: string;
}

export interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  renderOption?: (option: SearchSelectOption, isSelected: boolean) => React.ReactNode;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query)) ||
        (opt.searchKeywords && opt.searchKeywords.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);


  // Reset highlight index when query changes or dropdown opens
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery, isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle trigger button click
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    setSearchQuery('');
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small timeout to ensure element is mounted and styled
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev + 1 >= filteredOptions.length ? 0 : prev + 1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (opt) {
            onChange(opt.value);
            setIsOpen(false);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="w-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between text-left ui-input bg-white min-h-[46px] transition-all duration-200 ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-400'
        } ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : ''} ${
          error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : ''
        }`}
      >
        <div className="truncate flex flex-col justify-center flex-1 pr-2">
          {selectedOption ? (
            <>
              <span className="text-slate-900 font-medium text-sm leading-tight">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-slate-400 text-xs truncate mt-0.5 leading-none">
                  {selectedOption.subLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 text-sm">
              {placeholder || t('searchSelect.searchPlaceholder', { defaultValue: 'Select option...' })}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Error Message */}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-100 flex items-center bg-slate-50 gap-2">
            <svg className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-1 text-sm text-slate-900 placeholder-slate-400"
              placeholder={t('searchSelect.searchPlaceholder', { defaultValue: 'Search...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-56 py-1 flex-1">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 border-b border-slate-50 transition-colors"
              >
                ✕ {t('searchSelect.clearSelection', { defaultValue: 'Clear Selection' })}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {t('searchSelect.noResults', { defaultValue: 'No options found' })}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50/70 text-indigo-900 font-medium' : 'text-slate-700'
                    } ${isHighlighted ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <div className="flex flex-col flex-1 truncate pr-2">
                        <span className="text-sm truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-xs text-slate-400 truncate mt-0.5">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
