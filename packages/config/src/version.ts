import { AppVersionInfo } from "@money-matters/types";

/**
 * Parses a Semantic Version string into numerical components.
 * Format: MAJOR.MINOR.PATCH[-PRERELEASE]
 *
 * @param version - SemVer string e.g. "1.2.3" or "1.0.0-beta.1"
 */
export function parseSemVer(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const clean = version.trim().replace(/^v/, "");
  const [mainPart, prerelease] = clean.split("-");
  const parts = mainPart.split(".").map((num) => parseInt(num, 10));

  return {
    major: isNaN(parts[0]) ? 0 : parts[0],
    minor: isNaN(parts[1]) ? 0 : parts[1],
    patch: isNaN(parts[2]) ? 0 : parts[2],
    prerelease: prerelease || undefined,
  };
}

/**
 * Checks if client version is older than minimum supported API version.
 * Returns true if client version < minVersion.
 */
export function isVersionOutdated(clientVersion: string, minVersion: string): boolean {
  const vClient = parseSemVer(clientVersion);
  const vMin = parseSemVer(minVersion);

  if (vClient.major !== vMin.major) return vClient.major < vMin.major;
  if (vClient.minor !== vMin.minor) return vClient.minor < vMin.minor;
  return vClient.patch < vMin.patch;
}

/**
 * Formats AppVersionInfo into a user-facing concise string.
 * e.g. "v1.0.0-beta.1 (#42)"
 */
export function getFormattedVersionString(version: AppVersionInfo): string {
  return `v${version.version} (#${version.buildNumber})`;
}
