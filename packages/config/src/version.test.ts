import { describe, it, expect } from "vitest";
import { parseSemVer, isVersionOutdated, getFormattedVersionString } from "./version.js";
import { AppVersionInfo } from "@money-matters/types";

describe("Version Config Utilities", () => {
  it("correctly parses SemVer strings", () => {
    const res = parseSemVer("1.2.3-beta.1");
    expect(res.major).toBe(1);
    expect(res.minor).toBe(2);
    expect(res.patch).toBe(3);
    expect(res.prerelease).toBe("beta.1");
  });

  it("evaluates if client version is outdated against minimum version", () => {
    expect(isVersionOutdated("1.0.0", "1.1.0")).toBe(true);
    expect(isVersionOutdated("1.1.0", "1.1.0")).toBe(false);
    expect(isVersionOutdated("2.0.0", "1.9.9")).toBe(false);
    expect(isVersionOutdated("1.0.5", "1.0.10")).toBe(true);
  });

  it("formats version info into readable string", () => {
    const info: AppVersionInfo = {
      appId: "01908bde-34bb-7b19-a178-574211bc93aa",
      appName: "Money Matters",
      version: "1.0.0-beta.1",
      buildNumber: "42",
      channel: "beta",
      gitCommit: "a1b2c3d",
      platform: "web",
      formattedVersion: "v1.0.0-beta.1 (#42)",
    };

    expect(getFormattedVersionString(info)).toBe("v1.0.0-beta.1 (#42)");
  });
});
