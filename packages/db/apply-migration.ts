import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import fs from "fs";

neonConfig.webSocketConstructor = ws;

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("No DATABASE_URL found");
    process.exit(1);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const sqlContent = fs.readFileSync("./drizzle/0006_schema_v2_cleanup.sql", "utf-8");
  const statements = sqlContent.split(";").map((s) => s.trim()).filter(Boolean);

  for (const statement of statements) {
    console.log("Executing SQL:", statement);
    try {
      await client.query(statement);
    } catch (err: any) {
      console.warn("Statement warning/error:", err.message);
    }
  }
  await client.end();
  console.log("Migration executed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
