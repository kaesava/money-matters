import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * i18n Verification Script (Zero-Dependency Node.js ESM)
 *
 * Verifies that all t("key") calls across web, mobile, and UI packages reference valid,
 * existing dictionary keys in packages/i18n/src/dictionaries/en.ts.
 */

const enTsPath = path.join(__dirname, 'dictionaries/en.ts');
const enContent = fs.readFileSync(enTsPath, 'utf-8');

// Extract keys from en.ts by parsing object keys
function extractKeysFromEnTs(content) {
  const keys = new Set();
  const stack = [];
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    // Check for closing brace
    if (line.startsWith('}') || line.startsWith('},')) {
      stack.pop();
      continue;
    }

    // Match object property definition: foo: { or "foo": {
    const objectPropMatch = line.match(/^["']?([a-zA-Z0-9_]+)["']?:\s*\{/);
    if (objectPropMatch) {
      stack.push(objectPropMatch[1]);
      continue;
    }

    // Match leaf string key definition: foo: "bar" or "foo": "bar"
    const leafPropMatch = line.match(/^["']?([a-zA-Z0-9_]+)["']?:\s*["'`]/);
    if (leafPropMatch) {
      const fullKey = [...stack, leafPropMatch[1]].join('.');
      if (fullKey) {
        keys.add(fullKey);
      }
    }
  }

  return keys;
}

const validKeys = extractKeysFromEnTs(enContent);

const monorepoRoot = path.resolve(__dirname, '../../..');
const targetDirs = [
  path.join(monorepoRoot, 'apps/web/src'),
  path.join(monorepoRoot, 'apps/mobile/src'),
  path.join(monorepoRoot, 'packages/ui/src'),
];

let totalFilesChecked = 0;
let errorsFound = 0;

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) {
        continue;
      }
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  totalFilesChecked++;
  const content = fs.readFileSync(filePath, 'utf-8');

  // Match t('key') or t("key")
  const tKeyRegex = /\bt\(\s*["']([^"']+)["']/g;
  let match;

  while ((match = tKeyRegex.exec(content)) !== null) {
    const key = match[1];
    if (key.includes('${') || key.includes('+')) continue;

    if (!validKeys.has(key)) {
      const charIndex = match.index;
      const lineNumber = content.substring(0, charIndex).split('\n').length;
      const relPath = path.relative(monorepoRoot, filePath);
      console.error(`❌ [i18n Verification Error] Invalid key "${key}" at ${relPath}:${lineNumber}`);
      errorsFound++;
    }
  }
}

console.log(`🔍 [i18n Check] Verifying ${validKeys.size} dictionary keys against UI codebase...`);
for (const dir of targetDirs) {
  scanDir(dir);
}

if (errorsFound > 0) {
  console.error(`\n❌ i18n Check Failed: ${errorsFound} invalid or missing key(s) detected across ${totalFilesChecked} files.`);
  process.exit(1);
} else {
  console.log(`\n✅ i18n Check Passed: All translation keys across ${totalFilesChecked} UI files verified in locale dictionary!`);
  process.exit(0);
}
