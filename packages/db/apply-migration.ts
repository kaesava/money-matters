import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import fs from "fs";
import path from "path";

neonConfig.webSocketConstructor = ws;

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("No DATABASE_URL found");
    process.exit(1);
  }
  const fileArg = process.argv[2] || path.join(__dirname, "drizzle/0015_schema_identity_fix.sql");
  console.log(`Reading SQL file: ${fileArg}`);
  const sqlContent = fs.readFileSync(fileArg, "utf-8");
  
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("Executing migration SQL file...");
  try {
    await client.query(sqlContent);
    console.log("Migration executed successfully!");
  } catch (err: any) {
    console.error("Migration error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
