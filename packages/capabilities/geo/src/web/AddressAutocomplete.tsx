import { Loader2, WifiOff } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useGeoService } from '../context.js';
import { StructuredAddress } from '../types.js';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: StructuredAddress) => void;
  countries?: string[];
  placeholder?: string;
  error?: string;
  id?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  countries = ['AU', 'NZ'],
  placeholder = 'Type address to search...',
  error,
  id = 'address-autocomplete',
}: AddressAutocompleteProps) {
  const LoadingIcon = Loader2 as any;
  const OffIcon = WifiOff as any;

  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fallbackMode, setFallbackMode] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { usePlaceSuggestions, usePlaceDetails } = useGeoService();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = usePlaceSuggestions(
    query,
    countries
  );

  const { data: detailsData } = usePlaceDetails(selectedPlaceId || '');

  useEffect(() => {
    if (detailsData) {
      onSelect({
        street: detailsData.street || '',
        suburb: detailsData.suburb || '',
        state: detailsData.state,
        postcode: detailsData.postcode || '',
        country: detailsData.country || 'Australia',
        formattedAddress: detailsData.formattedAddress || '',
        placeId: detailsData.placeId || '',
        lat: detailsData.lat ?? null,
        lng: detailsData.lng ?? null,
      });
      setQuery(detailsData.street || '');
      setSelectedPlaceId(null);
      setShowDropdown(false);
    }
  }, [detailsData, onSelect]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isFetchingSuggestions && query.length >= 3 && !fallbackMode) {
      fallbackTimerRef.current = setTimeout(() => {
        setFallbackMode(true);
        setShowDropdown(false);
      }, 2500);
    } else {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [isFetchingSuggestions, query, fallbackMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setShowDropdown(true);
    setActiveIndex(-1);
    if (fallbackMode && val.length < 3) setFallbackMode(false);
  };

  const handleSelectSuggestion = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[activeIndex].placeId);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const shouldShowDropdown =
    showDropdown &&
    query.length >= 3 &&
    !fallbackMode &&
    (isFetchingSuggestions || suggestions.length > 0 || (!isFetchingSuggestions && suggestions.length === 0));

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-lg p-3 text-sm pr-10 focus:outline-none focus:border-slate-900 ${error ? 'border-rose-300 focus:border-rose-500' : ''}`}
          autoComplete="off"
        />
        {isFetchingSuggestions && !fallbackMode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <LoadingIcon className="animate-spin h-4 w-4 text-slate-400" />
          </div>
        )}
      </div>

      {fallbackMode && (
        <p className="flex items-center gap-1 mt-1 text-xs text-amber-600">
          <OffIcon className="w-3 h-3 flex-shrink-0" />
          Address lookup unavailable — please enter manually
        </p>
      )}

      {shouldShowDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {isFetchingSuggestions ? (
            <div className="px-4 py-3 text-xs text-slate-400 italic">
              Searching addresses...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion: { placeId: string; description: string }, idx: number) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion.placeId)}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors duration-150 border-b border-slate-50 last:border-0 ${
                    idx === activeIndex
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {suggestion.description}
                </button>
              ))}
              <div className="px-4 py-1.5 text-[10px] text-slate-300 border-t border-slate-50">
                Powered by OpenStreetMap
              </div>
            </>
          ) : (
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs text-slate-500">
                No addresses found — try entering manually
              </p>
              <p className="text-[10px] text-slate-300">
                Powered by OpenStreetMap
              </p>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

export default AddressAutocomplete;
