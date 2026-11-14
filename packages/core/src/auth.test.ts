import { describe, it, expect } from "vitest";
import { verifyJwt } from "./auth.js";

describe("verifyJwt", () => {
  it("returns null for empty token", async () => {
    expect(await verifyJwt("")).toBeNull();
  });

  it("returns null immediately for opaque non-JWT session tokens without 3 dot-separated parts", async () => {
    expect(await verifyJwt("opaque-session-token-123")).toBeNull();
    expect(await verifyJwt("two.parts")).toBeNull();
  });

  it("returns null gracefully when NEON_AUTH_BASE_URL is missing for a 3-part JWT", async () => {
    const prev = process.env["NEON_AUTH_BASE_URL"];
    delete process.env["NEON_AUTH_BASE_URL"];
    const result = await verifyJwt("header.payload.signature", { NEON_AUTH_BASE_URL: "" });
    expect(result).toBeNull();
    if (prev !== undefined) process.env["NEON_AUTH_BASE_URL"] = prev;
  });
});
