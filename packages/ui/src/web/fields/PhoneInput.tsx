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

const COUNTRY_LIST = [
  { id: "+61", dialCode: "+61", flag: "🇦🇺", label: "Australia (+61)" },
  { id: "+64", dialCode: "+64", flag: "🇳🇿", label: "New Zealand (+64)" },
  { id: "+1-US", dialCode: "+1", flag: "🇺🇸", label: "United States (+1)" },
  { id: "+1-CA", dialCode: "+1", flag: "🇨🇦", label: "Canada (+1)" },
  { id: "+44", dialCode: "+44", flag: "🇬🇧", label: "United Kingdom (+44)" },
  { id: "+91", dialCode: "+91", flag: "🇮🇳", label: "India (+91)" },
  { id: "+81", dialCode: "+81", flag: "🇯🇵", label: "Japan (+81)" },
  { id: "+65", dialCode: "+65", flag: "🇸🇬", label: "Singapore (+65)" },
  { id: "+49", dialCode: "+49", flag: "🇩🇪", label: "Germany (+49)" },
  { id: "+33", dialCode: "+33", flag: "🇫🇷", label: "France (+33)" },
  { id: "+39", dialCode: "+39", flag: "🇮🇹", label: "Italy (+39)" },
  { id: "+34", dialCode: "+34", flag: "🇪🇸", label: "Spain (+34)" },
  { id: "+31", dialCode: "+31", flag: "🇳🇱", label: "Netherlands (+31)" },
  { id: "+55", dialCode: "+55", flag: "🇧🇷", label: "Brazil (+55)" },
  { id: "+52", dialCode: "+52", flag: "🇲🇽", label: "Mexico (+52)" },
  { id: "+27", dialCode: "+27", flag: "🇿🇦", label: "South Africa (+27)" },
  { id: "+852", dialCode: "+852", flag: "🇭🇰", label: "Hong Kong (+852)" },
  { id: "+886", dialCode: "+886", flag: "🇹🇼", label: "Taiwan (+886)" },
  { id: "+82", dialCode: "+82", flag: "🇰🇷", label: "South Korea (+82)" },
  { id: "+60", dialCode: "+60", flag: "🇲🇾", label: "Malaysia (+60)" },
  { id: "+63", dialCode: "+63", flag: "🇵🇭", label: "Philippines (+63)" },
  { id: "+62", dialCode: "+62", flag: "🇮🇩", label: "Indonesia (+62)" },
  { id: "+66", dialCode: "+66", flag: "🇹🇭", label: "Thailand (+66)" },
  { id: "+84", dialCode: "+84", flag: "🇻🇳", label: "Vietnam (+84)" },
  { id: "+971", dialCode: "+971", flag: "🇦🇪", label: "UAE (+971)" },
  { id: "+966", dialCode: "+966", flag: "🇸🇦", label: "Saudi Arabia (+966)" },
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

  // Find matching country item by dial code or id
  const selectedItem = COUNTRY_LIST.find((c) => c.id === countryCode || c.dialCode === countryCode) || COUNTRY_LIST[0];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-[#1B2B4B]">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <select
          value={selectedItem.id}
          onChange={(e) => {
            const found = COUNTRY_LIST.find((c) => c.id === e.target.value);
            onCountryCodeChange(found ? found.dialCode : e.target.value);
          }}
          disabled={disabled}
          className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
        >
          {COUNTRY_LIST.map((item) => (
            <option key={item.id} value={item.id}>
              {item.flag} {item.label}
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
