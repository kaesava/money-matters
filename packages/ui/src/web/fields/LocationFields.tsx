import React from "react";
import { CountrySelect } from "./CountrySelect";

export interface LocationFieldsProps {
  country: string;
  onCountryChange: (val: string) => void;
  state: string;
  onStateChange: (val: string) => void;
  postcode: string;
  onPostcodeChange: (val: string) => void;
  disabled?: boolean;
}

export const AU_STATES = [
  { code: "NSW", name: "New South Wales (NSW)" },
  { code: "VIC", name: "Victoria (VIC)" },
  { code: "QLD", name: "Queensland (QLD)" },
  { code: "SA", name: "South Australia (SA)" },
  { code: "WA", name: "Western Australia (WA)" },
  { code: "TAS", name: "Tasmania (TAS)" },
  { code: "NT", name: "Northern Territory (NT)" },
  { code: "ACT", name: "Australian Capital Territory (ACT)" },
];

export function validateAustralianPostcode(postcode: string): boolean {
  if (!postcode.trim()) return true;
  return /^\d{4}$/.test(postcode.trim());
}

export function validateAustralianMobile(phone: string): boolean {
  if (!phone.trim()) return true;
  const clean = phone.replace(/[\s\-()]/g, "");
  return /^(\+614|04)\d{8}$/.test(clean);
}

export function LocationFields({
  country,
  onCountryChange,
  state,
  onStateChange,
  postcode,
  onPostcodeChange,
  disabled = false,
}: LocationFieldsProps) {
  const isAustralia = country === "AU";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Country Select */}
      <CountrySelect
        label="Country"
        value={country}
        onChange={onCountryChange}
        disabled={disabled}
      />

      {/* State / Province */}
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-bold text-[#1B2B4B]">State / Province</label>
        {isAustralia ? (
          <select
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50 cursor-pointer"
          >
            <option value="">Select State...</option>
            {AU_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            placeholder="State / Region"
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
          />
        )}
      </div>

      {/* Postcode / ZIP */}
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-bold text-[#1B2B4B]">Postcode / ZIP</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => onPostcodeChange(e.target.value)}
          placeholder={isAustralia ? "e.g. 2000" : "Postal Code"}
          maxLength={isAustralia ? 4 : 10}
          disabled={disabled}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
        />
        {isAustralia && postcode && !validateAustralianPostcode(postcode) && (
          <p className="text-[11px] font-bold text-red-600">Postcode must be exactly 4 digits</p>
        )}
      </div>
    </div>
  );
}
