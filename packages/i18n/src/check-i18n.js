const fs = require('fs');
const path = require('path');

// 1. Read and parse en.ts
const enTsPath = path.join(__dirname, 'dictionaries/en.ts');
let enTsContent = fs.readFileSync(enTsPath, 'utf8');

// Strip TypeScript exports and type assertions to evaluate as JS
enTsContent = enTsContent.replace('export const en =', 'const en =').replace(/\s+as\s+const\s*;?/g, ';');
enTsContent += '\nmodule.exports = { en };';

// Evaluate JS safely
const m = { exports: {} };
const fn = new Function('module', 'exports', enTsContent);
fn(m, m.exports);
const en = m.exports.en;

// Helper to get nested keys
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const dictionaryKeys = new Set(getKeys(en));

// 2. Scan codebase
const monorepoRoot = path.resolve(__dirname, '../../../');
const errors = [];

function findJsTsFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        file !== 'node_modules' &&
        file !== '.next' &&
        file !== '.expo' &&
        file !== 'dist' &&
        file !== '.gemini' &&
        file !== 'build' &&
        file !== 'coverage'
      ) {
        findJsTsFiles(fullPath, files);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      files.push(fullPath);
    }
  }
  return files;
}

function getLineNumber(content, index) {
  const before = content.substring(0, index);
  return before.split('\n').length;
}

const files = [];
const appsDir = path.join(monorepoRoot, 'apps');
const packagesDir = path.join(monorepoRoot, 'packages');

if (fs.existsSync(appsDir)) findJsTsFiles(appsDir, files);
if (fs.existsSync(packagesDir)) findJsTsFiles(packagesDir, files);

const tRegex = /\bt\(\s*(['"`])(.*?)\1/g;

for (const file of files) {
  // Skip dictionaries/en.ts itself, check-i18n.js, and any test files
  if (
    file.includes('dictionaries/en.ts') || 
    file.includes('check-i18n.js') ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
  ) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[2];
    // Skip dynamic keys containing variables or expressions
    if (key.includes('${') || key.includes('+')) {
      continue;
    }
    if (!dictionaryKeys.has(key)) {
      errors.push({
        file: path.relative(monorepoRoot, file),
        key,
        line: getLineNumber(content, match.index),
      });
    }
  }
}

// 3. Output results
if (errors.length > 0) {
  console.error(`\x1b[31mFound ${errors.length} missing translation keys:\x1b[0m\n`);
  for (const err of errors) {
    console.error(`  \x1b[33m${err.file}:${err.line}\x1b[0m - Key \x1b[36m"${err.key}"\x1b[0m is missing in en.ts`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m✔ All translation keys validated successfully!\x1b[0m');
  process.exit(0);
}
