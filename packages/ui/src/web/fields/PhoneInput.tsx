import React, { useId } from "react";

export interface PhoneInputProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (number: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

const COUNTRY_CODES = [
  { code: "+61", flag: "🇦🇺", label: "Australia (+61)" },
  { code: "+64", flag: "🇳🇿", label: "New Zealand (+64)" },
  { code: "+1", flag: "🇺🇸", label: "US / Canada (+1)" },
  { code: "+44", flag: "🇬🇧", label: "United Kingdom (+44)" },
  { code: "+81", flag: "🇯🇵", label: "Japan (+81)" },
  { code: "+65", flag: "🇸🇬", label: "Singapore (+65)" },
];

export function PhoneInput({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  label,
  error,
  disabled = false,
}: PhoneInputProps) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-[#1B2B4B]">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          disabled={disabled}
          className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
        >
          {COUNTRY_CODES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.code}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          placeholder="0412 345 678"
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50 ${
            error ? "border-red-500 focus:ring-red-500" : "border-slate-200"
          }`}
        />
      </div>
      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
