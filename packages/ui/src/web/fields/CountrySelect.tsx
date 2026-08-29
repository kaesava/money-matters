import React, { useId } from "react";

export interface CountrySelectProps {
  value: string;
  onChange: (countryCode: string) => void;
  label?: string;
  disabled?: boolean;
}

export const FEATURED_COUNTRIES = [
  { code: "AU", name: "Australia 🇦🇺" },
  { code: "NZ", name: "New Zealand 🇳🇿" },
];

export const WORLD_COUNTRIES = [
  { code: "US", name: "United States 🇺🇸" },
  { code: "UK", name: "United Kingdom 🇬🇧" },
  { code: "CA", name: "Canada 🇨🇦" },
  { code: "IN", name: "India 🇮🇳" },
  { code: "SG", name: "Singapore 🇸🇬" },
  { code: "JP", name: "Japan 🇯🇵" },
  { code: "DE", name: "Germany 🇩🇪" },
  { code: "FR", name: "France 🇫🇷" },
  { code: "IE", name: "Ireland 🇮🇪" },
  { code: "NL", name: "Netherlands 🇳🇱" },
  { code: "ZA", name: "South Africa 🇿🇦" },
  { code: "AE", name: "United Arab Emirates 🇦🇪" },
].sort((a, b) => a.name.localeCompare(b.name));

export function CountrySelect({ value, onChange, label, disabled = false }: CountrySelectProps) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-[#1B2B4B]">
          {label}
        </label>
      )}
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50 cursor-pointer"
      >
        <optgroup label="Featured / Local">
          {FEATURED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="All World Countries">
          {WORLD_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
