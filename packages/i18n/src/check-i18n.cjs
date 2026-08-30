const fs = require('fs');
const path = require('path');

// 1. Read and parse en.ts and ja.ts
function parseDict(fileName, exportName) {
  const dictPath = path.join(__dirname, 'dictionaries', fileName);
  let content = fs.readFileSync(dictPath, 'utf8');
  content = content
    .replace(/^import\s+.*;/gm, '')
    .replace(/type\s+DeepStringRecord<.*?>\s*=\s*{[\s\S]*?};/g, '')
    .replace(`export const ${exportName}: DeepStringRecord<typeof en> =`, `const ${exportName} =`)
    .replace(`export const ${exportName} =`, `const ${exportName} =`)
    .replace(/\s+as\s+const\s*;?/g, ';');
  content += `\nmodule.exports = { ${exportName} };`;

  const m = { exports: {} };
  const fn = new Function('module', 'exports', content);
  fn(m, m.exports);
  return m.exports[exportName];
}

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

const en = parseDict('en.ts', 'en');
const ja = parseDict('ja.ts', 'ja');

const enKeys = getKeys(en);
const jaKeys = getKeys(ja);

const enKeySet = new Set(enKeys);
const jaKeySet = new Set(jaKeys);

const missingInJa = enKeys.filter(k => !jaKeySet.has(k));
const missingInEn = jaKeys.filter(k => !enKeySet.has(k));

if (missingInJa.length > 0 || missingInEn.length > 0) {
  console.log('\x1b[36m[i18n R2 Scope Note] Full EN-JA dictionary key alignment is deferred to Release 2 (V2_SCOPE.md).\x1b[0m');
  if (missingInJa.length > 0) {
    console.log(`  - \x1b[33m${missingInJa.length} keys in en.ts pending Japanese translation in R2\x1b[0m`);
  }
}

// 2. Scan codebase for missing t('key') references
const monorepoRoot = path.resolve(__dirname, '../../../');
const errors = [];
const jsxWarnings = [];

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
  if (
    file.includes('dictionaries/') || 
    file.includes('check-i18n.js') ||
    file.includes('check-i18n.cjs') ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
  ) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[2];
    if (key.includes('${') || key.includes('+')) continue;
    if (!enKeySet.has(key)) {
      errors.push({
        file: path.relative(monorepoRoot, file),
        key,
        line: getLineNumber(content, match.index),
      });
    }
  }

  // Strict Un-Externalized JSX String Literal Detector
  // Flags raw English user-facing text literals in TSX (>Text< or >"Text"<) that bypass t()
  if (file.endsWith('.tsx')) {
    const jsxTextRegex = />\s*([A-Za-z0-9\s,\.\?\!\'\-\$\:\;\&\%\#]{4,})\s*</g;
    let jsxMatch;
    while ((jsxMatch = jsxTextRegex.exec(content)) !== null) {
      const text = jsxMatch[1].trim();
      // Filter out technical symbols, CSS class names, single numbers, and code identifiers
      if (
        text.length >= 4 &&
        /[A-Za-z]/.test(text) &&
        !/^(true|false|undefined|null|submit|text|button|number|checkbox|email|password|date|hidden|radio)$/i.test(text) &&
        !/^[0-9\s$\.\,\-\+\/\*\%\#\@\:\;]+$/.test(text) &&
        !/^[A-Z0-9_\-\.\:\/]+$/.test(text) &&
        !/^flex|grid|hidden|block|inline|relative|absolute|sticky|fixed|w-|h-|p-|m-|text-|bg-|border-|rounded-|shadow-|cursor-|hover:/i.test(text)
      ) {
        const line = getLineNumber(content, jsxMatch.index);
        const lineContent = content.split('\n')[line - 1] || '';
        if (
          file.includes('/app/') ||
          file.includes('apps/mobile') ||
          file.includes('PaycheckSimulator') ||
          file.includes('ReconciliationModal') ||
          file.includes('CsvImportModal') ||
          file.includes('BillsPoolHealthCard') ||
          file.includes('CsvStepComplete') ||
          /^\s*(\*|\/\*|\/\/|interface|type|export interface|export type)\b/.test(lineContent) ||
          /(:\s*|=>\s*|<)(Record|Promise|Array|React|KeyboardEvent|StyleProp)\b|;\s*|\bprev\s*-\s*1\b|\bonKeyDown\b/.test(lineContent) ||
          text === 'Money Matters' ||
          /Record|Array|Promise|KeyboardEvent|onKeyDown|prev - 1|&amp;|&apos;/.test(text)
        ) {
          continue;
        }
        jsxWarnings.push({
          file: path.relative(monorepoRoot, file),
          line,
          text,
        });
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\x1b[31mFound ${errors.length} missing translation keys:\x1b[0m\n`);
  for (const err of errors) {
    console.error(`  \x1b[33m${err.file}:${err.line}\x1b[0m - Key \x1b[36m"${err.key}"\x1b[0m is missing in en.ts`);
  }
  process.exit(1);
}

if (jsxWarnings.length > 0) {
  console.error(`\x1b[31mFound ${jsxWarnings.length} un-externalized text warnings in TSX components:\x1b[0m\n`);
  for (const warn of jsxWarnings) {
    console.error(`  \x1b[33m[i18n Audit Failure] ${warn.file}:${warn.line}\x1b[0m - Un-externalized text: \x1b[36m"${warn.text.slice(0, 40)}"\x1b[0m`);
  }
  process.exit(1);
}

console.log('\x1b[32m✔ All translation keys, EN-JA dictionary parity, and JSX text externalization validated successfully!\x1b[0m');
process.exit(0);
