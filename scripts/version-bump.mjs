import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();

// Parse arguments e.g. node scripts/version-bump.mjs --type=patch --app=all
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.split("=");
  if (key && val) {
    acc[key.replace(/^--/, "")] = val;
  }
  return acc;
}, {});

const bumpType = args.type || "patch"; // 'major' | 'minor' | 'patch' | 'beta'
const targetApp = args.app || "all";   // 'web' | 'mobile' | 'all'

function bumpSemVer(version, type) {
  const clean = version.trim().replace(/^v/, "");
  const [main, prerelease] = clean.split("-");
  let [major, minor, patch] = main.split(".").map(Number);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  } else if (type === "beta") {
    if (prerelease && prerelease.startsWith("beta.")) {
      const num = parseInt(prerelease.split(".")[1] || "0", 10) + 1;
      return `${major}.${minor}.${patch}-beta.${num}`;
    }
    return `${major}.${minor}.${patch}-beta.1`;
  } else {
    // Default patch
    patch += 1;
    return `${major}.${minor}.${patch}`;
  }
}

console.log(`🚀 Automated App Version Bump: [Type: ${bumpType}] [App Target: ${targetApp}]`);

// 1. Bump Web App Version
if (targetApp === "web" || targetApp === "all") {
  const webPkgPath = path.join(rootDir, "apps/web/package.json");
  if (fs.existsSync(webPkgPath)) {
    const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf-8"));
    const oldVer = webPkg.version || "1.0.0";
    const newVer = bumpSemVer(oldVer, bumpType);
    webPkg.version = newVer;
    fs.writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2) + "\n");
    console.log(`  ✓ Updated @money-matters/web version: ${oldVer} → ${newVer}`);
  }
}

// 2. Bump Mobile App Version & Expo config
if (targetApp === "mobile" || targetApp === "all") {
  const mobilePkgPath = path.join(rootDir, "apps/mobile/package.json");
  if (fs.existsSync(mobilePkgPath)) {
    const mobilePkg = JSON.parse(fs.readFileSync(mobilePkgPath, "utf-8"));
    const oldVer = mobilePkg.version || "1.0.0";
    const newVer = bumpSemVer(oldVer, bumpType);
    mobilePkg.version = newVer;
    fs.writeFileSync(mobilePkgPath, JSON.stringify(mobilePkg, null, 2) + "\n");
    console.log(`  ✓ Updated @money-matters/mobile package.json version: ${oldVer} → ${newVer}`);
  }

  const appJsonPath = path.join(rootDir, "apps/mobile/app.json");
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    if (appJson.expo) {
      const currentVer = appJson.expo.version || "1.0.0";
      const newVer = bumpSemVer(currentVer, bumpType);
      appJson.expo.version = newVer;
      const currentCode = appJson.expo.android?.versionCode || 100;
      if (!appJson.expo.android) appJson.expo.android = {};
      appJson.expo.android.versionCode = currentCode + 1;

      if (!appJson.expo.ios) appJson.expo.ios = {};
      appJson.expo.ios.buildNumber = `${newVer}.${currentCode + 1}`;

      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
      console.log(`  ✓ Updated Expo app.json version: ${currentVer} → ${newVer} (Build Code: ${currentCode + 1})`);
    }
  }
}

// Optional Git commit
try {
  const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" });
  if (gitStatus.includes("package.json") || gitStatus.includes("app.json")) {
    execSync('git add apps/web/package.json apps/mobile/package.json apps/mobile/app.json 2>/dev/null || true');
    console.log("  ✓ Version metadata staged for git commit.");
  }
} catch (e) {
  // Git staging optional in non-git envs
}

console.log("✅ Version bump complete!");
