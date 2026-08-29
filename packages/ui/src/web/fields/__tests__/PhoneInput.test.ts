import { describe, it, expect } from "vitest";
import { validateMobileNumber } from "../PhoneInput";

describe("validateMobileNumber", () => {
  it("allows empty phone number as valid (optional field)", () => {
    expect(validateMobileNumber("+61", "")).toEqual({ isValid: true });
    expect(validateMobileNumber("+61", "   ")).toEqual({ isValid: true });
  });

  it("validates Australian mobile numbers with no spaces (0412345678)", () => {
    const res = validateMobileNumber("+61", "0412345678");
    expect(res.isValid).toBe(true);
  });

  it("validates Australian mobile numbers with spaces (0412 345 678)", () => {
    const res = validateMobileNumber("+61", "0412 345 678");
    expect(res.isValid).toBe(true);
  });

  it("validates Australian mobile numbers with hyphens and parentheses (0412-345-678 / (0412) 345 678)", () => {
    expect(validateMobileNumber("+61", "0412-345-678").isValid).toBe(true);
    expect(validateMobileNumber("+61", "(0412) 345 678").isValid).toBe(true);
  });

  it("validates 9-digit Australian mobile numbers omitting initial 0 (412345678)", () => {
    expect(validateMobileNumber("+61", "412345678").isValid).toBe(true);
  });

  it("rejects invalid Australian mobile numbers", () => {
    expect(validateMobileNumber("+61", "0312345678").isValid).toBe(false); // Landline 03
    expect(validateMobileNumber("+61", "04123").isValid).toBe(false); // Too short
    expect(validateMobileNumber("+61", "041234567899").isValid).toBe(false); // Too long
    expect(validateMobileNumber("+61", "abc").isValid).toBe(false);
  });
});
