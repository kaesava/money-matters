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

export function validateMobileNumber(countryCode: string, phoneNumber: string): { isValid: boolean; errorMessage?: string } {
  const trimmed = phoneNumber.trim();
  if (!trimmed) return { isValid: true };

  const clean = trimmed.replace(/[\s\-()]/g, "");

  if (countryCode === "+61") {
    // Australian mobile numbers must be 10 digits starting with 04 or 9 digits starting with 4
    const isAuMobile = /^04\d{8}$/.test(clean) || /^4\d{8}$/.test(clean);
    if (!isAuMobile) {
      return {
        isValid: false,
        errorMessage: "Please enter a valid 10-digit Australian mobile number (e.g. 0412 345 678).",
      };
    }
  } else if (countryCode === "+64") {
    // NZ mobile numbers start with 02 or 2 and are 8-10 digits
    const isNzMobile = /^(02|2)\d{7,9}$/.test(clean);
    if (!isNzMobile) {
      return {
        isValid: false,
        errorMessage: "Please enter a valid New Zealand mobile number.",
      };
    }
  } else {
    // General digit check for other countries
    if (!/^\d{5,15}$/.test(clean)) {
      return {
        isValid: false,
        errorMessage: "Please enter a valid phone number (digits only).",
      };
    }
  }

  return { isValid: true };
}

const FEATURED_COUNTRY_CODES = [
  { code: "+61", flag: "🇦🇺", label: "Australia (+61)" },
  { code: "+64", flag: "🇳🇿", label: "New Zealand (+64)" },
];

const OTHER_COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", label: "United States (+1)" },
  { code: "+1-CA", flag: "🇨🇦", label: "Canada (+1)" },
  { code: "+44", flag: "🇬🇧", label: "United Kingdom (+44)" },
  { code: "+91", flag: "🇮🇳", label: "India (+91)" },
  { code: "+81", flag: "🇯🇵", label: "Japan (+81)" },
  { code: "+65", flag: "🇸🇬", label: "Singapore (+65)" },
  { code: "+49", flag: "🇩🇪", label: "Germany (+49)" },
  { code: "+33", flag: "🇫🇷", label: "France (+33)" },
  { code: "+39", flag: "🇮🇹", label: "Italy (+39)" },
  { code: "+34", flag: "🇪🇸", label: "Spain (+34)" },
  { code: "+31", flag: "🇳🇱", label: "Netherlands (+31)" },
  { code: "+55", flag: "🇧🇷", label: "Brazil (+55)" },
  { code: "+52", flag: "🇲🇽", label: "Mexico (+52)" },
  { code: "+27", flag: "🇿🇦", label: "South Africa (+27)" },
  { code: "+852", flag: "🇭🇰", label: "Hong Kong (+852)" },
  { code: "+886", flag: "🇹🇼", label: "Taiwan (+886)" },
  { code: "+82", flag: "🇰🇷", label: "South Korea (+82)" },
  { code: "+60", flag: "🇲🇾", label: "Malaysia (+60)" },
  { code: "+63", flag: "🇵🇭", label: "Philippines (+63)" },
  { code: "+62", flag: "🇮🇩", label: "Indonesia (+62)" },
  { code: "+66", flag: "🇹🇭", label: "Thailand (+66)" },
  { code: "+84", flag: "🇻🇳", label: "Vietnam (+84)" },
  { code: "+971", flag: "🇦🇪", label: "UAE (+971)" },
  { code: "+966", flag: "🇸🇦", label: "Saudi Arabia (+966)" },
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
          <optgroup label="Featured / Local">
            {FEATURED_COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.flag} {item.code}
              </option>
            ))}
          </optgroup>
          <optgroup label="All International Codes">
            {OTHER_COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code.split("-")[0]}>
                {item.flag} {item.label}
              </option>
            ))}
          </optgroup>
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
