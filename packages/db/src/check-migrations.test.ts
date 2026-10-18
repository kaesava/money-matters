import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Database Migration Monotonicity and Journal Integrity", () => {
  const drizzleDir = path.resolve(__dirname, "../drizzle");
  const journalPath = path.join(drizzleDir, "meta/_journal.json");

  it("ensures _journal.json exists and is valid JSON", () => {
    expect(fs.existsSync(journalPath)).toBe(true);
    const content = fs.readFileSync(journalPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.version).toBeDefined();
    expect(Array.isArray(parsed.entries)).toBe(true);
  });

  it("ensures every SQL file matches an entry in _journal.json with strict monotonic ordering", () => {
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as { entries: { idx: number; tag: string }[] };
    const sqlFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();

    expect(journal.entries.length).toBe(sqlFiles.length);

    sqlFiles.forEach((file, index) => {
      const tag = file.replace(".sql", "");
      const entry = journal.entries[index];
      expect(entry).toBeDefined();
      expect(entry.idx).toBe(index);
      expect(entry.tag).toBe(tag);

      // Verify naming convention: 4 digits followed by underscore
      expect(file).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
      const fileNumber = parseInt(file.slice(0, 4), 10);
      expect(fileNumber).toBe(index + 1);
    });
  });
});
