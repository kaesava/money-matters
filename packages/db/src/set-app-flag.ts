import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const args = process.argv.slice(2);
const flagArg = args.find((a) => a.startsWith("--flag="))?.split("=")[1];
const valueArg = args.find((a) => a.startsWith("--value="))?.split("=")[1];
const appSlug = args.find((a) => a.startsWith("--app="))?.split("=")[1] || "money-matters";

if (!flagArg || valueArg === undefined) {
  console.log("Usage: pnpm app:set-flag --flag=<flagName> --value=<true|false|number> [--app=<slug>]");
  process.exit(1);
}

let parsedValue: boolean | number | string = valueArg;
if (valueArg === "true") parsedValue = true;
else if (valueArg === "false") parsedValue = false;
else if (!isNaN(Number(valueArg))) parsedValue = Number(valueArg);

async function main() {
  const client = new Client(DATABASE_URL);
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
      console.error(`❌ App with slug '${appSlug}' not found.`);
      process.exit(1);
    }

    console.log(`✅ Updated app flag '${flagArg}' to ${JSON.stringify(parsedValue)} on app '${appSlug}':`, res.rows[0].feature_flags);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Failed to update app feature flag:", err);
  process.exit(1);
});
