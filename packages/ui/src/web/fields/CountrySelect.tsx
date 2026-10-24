import { InfoTooltip } from "../InfoTooltip";
import React, { useId } from "react";

export interface CountrySelectProps {
  value: string;
  onChange: (countryCode: string) => void;
  label?: string;
  disabled?: boolean;
  tooltip?: string;
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
  { code: "GB", name: "United Kingdom 🇬🇧" },
  { code: "US", name: "United States 🇺🇸" },
];

export function CountrySelect({ value, onChange, label, disabled = false, tooltip }: CountrySelectProps) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex items-center gap-1.5">
          <label htmlFor={inputId} className="text-xs font-bold text-[#1B2B4B]">
            {label}
          </label>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
      )}
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 cursor-pointer"
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
