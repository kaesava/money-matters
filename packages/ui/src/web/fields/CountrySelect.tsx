import React, { useId } from "react";

export interface CountrySelectProps {
  value: string;
  onChange: (countryCode: string) => void;
  label?: string;
  disabled?: boolean;
}

export const ALL_COUNTRIES = [
  { code: "AU", name: "Australia 🇦🇺" },
  { code: "CA", name: "Canada 🇨🇦" },
  { code: "FR", name: "France 🇫🇷" },
  { code: "DE", name: "Germany 🇩🇪" },
  { code: "IN", name: "India 🇮🇳" },
  { code: "IE", name: "Ireland 🇮🇪" },
  { code: "JP", name: "Japan 🇯🇵" },
  { code: "NL", name: "Netherlands 🇳🇱" },
  { code: "NZ", name: "New Zealand 🇳🇿" },
  { code: "SG", name: "Singapore 🇸🇬" },
  { code: "ZA", name: "South Africa 🇿🇦" },
  { code: "AE", name: "United Arab Emirates 🇦🇪" },
  { code: "UK", name: "United Kingdom 🇬🇧" },
  { code: "US", name: "United States 🇺🇸" },
];

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
        {ALL_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
