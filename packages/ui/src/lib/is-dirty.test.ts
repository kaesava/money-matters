import { describe, it, expect } from "vitest";
import { isFormDirty, isSingleValueDirty } from "./is-dirty";

describe("isFormDirty & isSingleValueDirty Utility", () => {
  it("should return false when initial and current states are identical", () => {
    const initial = {
      name: "CBA Account",
      balance: "1000.00",
      buffer: "0.00",
      isPrivate: false,
      selectedTypes: ["EVERYDAY", "REGULAR"],
    };
    const current = {
      name: "CBA Account",
      balance: "1000.00",
      buffer: "0.00",
      isPrivate: false,
      selectedTypes: ["EVERYDAY", "REGULAR"],
    };

    expect(isFormDirty(initial, current)).toBe(false);
  });

  it("should return true when an array element is added or removed (e.g. pool checkboxes)", () => {
    const initial = {
      selectedTypes: ["EVERYDAY"],
    };
    const current = {
      selectedTypes: ["EVERYDAY", "REGULAR"],
    };

    expect(isFormDirty(initial, current)).toBe(true);
  });

  it("should return false when array elements are identical regardless of order", () => {
    const initial = {
      selectedTypes: ["EVERYDAY", "REGULAR"],
    };
    const current = {
      selectedTypes: ["REGULAR", "EVERYDAY"],
    };

    expect(isFormDirty(initial, current)).toBe(false);
  });

  it("should return true when a string input is modified", () => {
    const initial = { name: "CBA Account" };
    const current = { name: "CBA Account Modified" };

    expect(isFormDirty(initial, current)).toBe(true);
  });

  it("should treat whitespace-only changes in strings as clean if trimmed string matches", () => {
    const initial = { name: "  CBA Account  " };
    const current = { name: "CBA Account" };

    expect(isFormDirty(initial, current)).toBe(false);
  });

  it("should return false for equivalent numeric strings e.g. 1000 vs 1000.00", () => {
    const initial = { balance: "1000" };
    const current = { balance: "1000.00" };

    expect(isFormDirty(initial, current)).toBe(false);
  });

  it("should return true when a numeric string value changes", () => {
    const initial = { balance: "1000.00" };
    const current = { balance: "1050.00" };

    expect(isFormDirty(initial, current)).toBe(true);
  });

  it("should return true when a boolean toggle changes", () => {
    const initial = { isPrivate: false };
    const current = { isPrivate: true };

    expect(isFormDirty(initial, current)).toBe(true);
  });

  it("should return true if initial is null or undefined (new record)", () => {
    expect(isFormDirty(null, { name: "New" })).toBe(true);
    expect(isFormDirty(undefined, { name: "New" })).toBe(true);
  });
});
