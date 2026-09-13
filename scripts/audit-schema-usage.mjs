#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const schemaDir = path.join(rootDir, "packages/db/src/schema");

const standardColumns = new Set([
  "id",
  "tenantId",
  "appId",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "archivedAt",
]);

// Directories to scan for references
const scanDirs = [
  path.join(rootDir, "apps/api"),
  path.join(rootDir, "apps/web"),
  path.join(rootDir, "apps/mobile"),
  path.join(rootDir, "packages/capabilities"),
  path.join(rootDir, "packages/types"),
  path.join(rootDir, "packages/core"),
  path.join(rootDir, "packages/db/src/seed.ts"),
  path.join(rootDir, "packages/db/src/create-tester.ts"),
];

function getAllFiles(dir, exts = [".ts", ".tsx", ".js", ".mjs"]) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];

  function recurse(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist" || entry.name === "coverage") {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  recurse(dir);
  return files;
}

console.log("🔍 Scanning codebase for active database schema columns...");

// Read all code content into memory
const codeFiles = scanDirs.flatMap((d) => getAllFiles(d));
let allCodeContent = "";
for (const file of codeFiles) {
  allCodeContent += "\n" + fs.readFileSync(file, "utf8");
}

const schemaFiles = fs
  .readdirSync(schemaDir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "base.ts");

let totalTables = 0;
let totalColumns = 0;
let deadColumns = [];

for (const file of schemaFiles) {
  const filePath = path.join(schemaDir, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Extract pgTable declaration
  const tableMatch = content.match(/export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["']([^"']+)["']/);
  if (!tableMatch) continue;

  const [, tableVar, tableName] = tableMatch;
  totalTables++;

  // Extract column definitions: e.g. "  columnName: text("..."
  const columnRegex = /^\s+([a-zA-Z0-9_]+):\s*(?:text|varchar|integer|numeric|boolean|timestamp|date|uuid|jsonb|pgEnum|poolTypeEnum|flowTypeEnum|roleEnum)\s*\(/gm;
  let colMatch;
  const columns = [];

  while ((colMatch = columnRegex.exec(content)) !== null) {
    const colName = colMatch[1];
    if (!standardColumns.has(colName)) {
      columns.push(colName);
    }
  }

  for (const col of columns) {
    totalColumns++;
    // Check if column identifier is referenced anywhere outside of this schema file
    // Check for colName as property access (e.g. .colName), object key (colName:), or destructuring ({ colName })
    const regex = new RegExp(`(?:\\.${col}\\b|\\b${col}\\s*:|\\b${col}\\b)`, "g");
    const occurrences = (allCodeContent.match(regex) || []).length;

    if (occurrences === 0) {
      deadColumns.push({ table: tableName, column: col, file });
    }
  }
}

console.log(`📊 Audited ${totalTables} tables and ${totalColumns} domain columns.`);

if (deadColumns.length > 0) {
  console.error("❌ Schema Audit Failed! Found dead/unreferenced columns:");
  for (const dead of deadColumns) {
    console.error(`  - Table: ${dead.table} | Column: ${dead.column} (${dead.file})`);
  }
  process.exit(1);
} else {
  console.log("✅ Zero Dead Code Policy Verified: All active schema columns are consumed.");
  process.exit(0);
}
