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
