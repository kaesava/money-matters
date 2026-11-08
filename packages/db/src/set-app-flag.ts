import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const flagArg = args.find((a) => a.startsWith("--flag="))?.split("=")[1];
const valueArg = args.find((a) => a.startsWith("--value="))?.split("=")[1];
const appSlug = args.find((a) => a.startsWith("--app="))?.split("=")[1] || "money-matters";
const envTarget = (args.find((a) => a.startsWith("--env="))?.split("=")[1] || "dev").toLowerCase();

if (!flagArg || valueArg === undefined) {
  console.log("Usage: pnpm app:set-flag --flag=<flagName> --value=<true|false|number> [--env=dev|prod|all] [--app=<slug>]");
  process.exit(1);
}

let parsedValue: boolean | number | string = valueArg;
if (valueArg === "true") parsedValue = true;
else if (valueArg === "false") parsedValue = false;
else if (!isNaN(Number(valueArg))) parsedValue = Number(valueArg);

function getDbUrlForEnv(target: "dev" | "prod"): string {
  const envFile = target === "prod" ? "../../../.env" : "../../../.env.development";
  const fullPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(fullPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(fullPath));
    if (envConfig.DATABASE_URL) return envConfig.DATABASE_URL;
  }
  return process.env.DATABASE_URL || "";
}

async function updateFlagOnDb(dbUrl: string, targetLabel: string) {
  if (!dbUrl) {
    console.error(`❌ [${targetLabel}] DATABASE_URL could not be found.`);
    return;
  }

  const client = new Client(dbUrl);
  await client.connect();

  try {
    const res = await client.query(
      `UPDATE apps
       SET feature_flags = jsonb_set(
         COALESCE(feature_flags, '{}'::jsonb),
         ARRAY[$1],
         to_jsonb($2::jsonb)
       ),
       updated_at = NOW()
       WHERE slug = $3
       RETURNING id, name, slug, feature_flags`,
      [flagArg, JSON.stringify(parsedValue), appSlug]
    );

    if (res.rows.length === 0) {
      console.error(`❌ [${targetLabel}] App with slug '${appSlug}' not found.`);
      process.exit(1);
    }

    console.log(`✅ [${targetLabel}] Updated app flag '${flagArg}' to ${JSON.stringify(parsedValue)} on app '${appSlug}':`, res.rows[0].feature_flags);
  } finally {
    await client.end();
  }
}

async function main() {
  if (envTarget === "all") {
    const devUrl = getDbUrlForEnv("dev");
    const prodUrl = getDbUrlForEnv("prod");
    await updateFlagOnDb(devUrl, "DEV");
    await updateFlagOnDb(prodUrl, "PROD");
  } else if (envTarget === "prod") {
    const prodUrl = getDbUrlForEnv("prod");
    await updateFlagOnDb(prodUrl, "PROD");
  } else {
    const devUrl = getDbUrlForEnv("dev");
    await updateFlagOnDb(devUrl, "DEV");
  }
}

main().catch((err) => {
  console.error("❌ Failed to update app feature flag:", err);
  process.exit(1);
});
