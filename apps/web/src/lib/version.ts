import { AppVersionInfo } from "@money-matters/types";
import { getFormattedVersionString } from "@money-matters/config";

export function getWebVersionInfo(): AppVersionInfo {
  const appId = process.env.NEXT_PUBLIC_APP_ID || "01908bde-34bb-7b19-a178-574211bc93aa";
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0-beta.1";
  const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER || "1";
  const channelRaw = process.env.NEXT_PUBLIC_RELEASE_CHANNEL || "development";
  const channel = (["development", "preview", "beta", "production"].includes(channelRaw)
    ? channelRaw
    : "development") as AppVersionInfo["channel"];
  const gitCommit = process.env.NEXT_PUBLIC_GIT_COMMIT || "dev";

  const rawInfo: Omit<AppVersionInfo, "formattedVersion"> = {
    appId,
    appName: "Money Matters",
    version,
    buildNumber,
    channel,
    gitCommit,
    platform: "web",
  };

  return {
    ...rawInfo,
    formattedVersion: getFormattedVersionString(rawInfo as AppVersionInfo),
  };
}
