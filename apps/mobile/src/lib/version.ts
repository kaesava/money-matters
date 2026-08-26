import Constants from "expo-constants";
import { Platform } from "react-native";
import { AppVersionInfo } from "@money-matters/types";
import { getFormattedVersionString } from "@money-matters/config";

export function getMobileVersionInfo(): AppVersionInfo {
  const appId = process.env.EXPO_PUBLIC_APP_ID || "01908bde-34bb-7b19-a178-574211bc93aa";
  const version = Constants.expoConfig?.version || process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0-beta.1";
  
  const buildNumberRaw =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;

  const buildNumber = buildNumberRaw ? String(buildNumberRaw) : process.env.EXPO_PUBLIC_BUILD_NUMBER || "1";
  const channelRaw = process.env.EXPO_PUBLIC_RELEASE_CHANNEL || "development";
  const channel = (["development", "preview", "beta", "production"].includes(channelRaw)
    ? channelRaw
    : "development") as AppVersionInfo["channel"];
  const gitCommit = process.env.EXPO_PUBLIC_GIT_COMMIT || "dev";
  const platform = Platform.OS === "ios" ? "ios" : "android";

  const rawInfo: Omit<AppVersionInfo, "formattedVersion"> = {
    appId,
    appName: "Money Matters Mobile",
    version,
    buildNumber,
    channel,
    gitCommit,
    platform,
  };

  return {
    ...rawInfo,
    formattedVersion: getFormattedVersionString(rawInfo as AppVersionInfo),
  };
}
