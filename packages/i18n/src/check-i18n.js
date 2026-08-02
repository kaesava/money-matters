#!/usr/bin/env node
// check-i18n.js — i18n compliance linter for Money Matters.
// Validates that dictionary source files exist and that they are non-empty.
//
// Currently exits 0 as a scaffold — extend with regex-based AST scanning
// once all strings are fully externalised (AGENTS.md §13: 100% string externalisation).

const path = require('path');
const fs = require('fs');

const dictionaryPath = path.join(__dirname, 'dictionaries');

if (!fs.existsSync(dictionaryPath)) {
  console.warn('[check-i18n] No dictionaries directory found — skipping check.');
  process.exit(0);
}

const files = fs.readdirSync(dictionaryPath).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

if (files.length === 0) {
  console.warn('[check-i18n] No dictionary .ts files found — skipping check.');
  process.exit(0);
}

let hasErrors = false;

for (const file of files) {
  const fullPath = path.join(dictionaryPath, file);
  const content = fs.readFileSync(fullPath, 'utf8').trim();
  if (content.length < 10) {
    console.error(`[check-i18n] Dictionary file ${file} appears empty.`);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(`[check-i18n] ${files.length} dictionary file(s) validated OK.`);
process.exit(0);
