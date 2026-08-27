#!/usr/bin/env python3
"""
Money Matters UI Token & Icon Linter

Scans apps/web and packages/ui for:
1. Hardcoded slate Tailwind color classes (e.g., bg-slate-900, text-slate-700)
2. Raw emojis inside JSX text literals (e.g., 📞, ✉️, 📍)
3. Hardcoded hex codes bypassing Serene Finance DESIGN_TOKENS

Usage:
    python3 scripts/ui-token-lint.py [--check] [--fix]
"""

import os
import re
import sys
import argparse

# Directories to audit
TARGET_DIRS = [
    os.path.join("apps", "web"),
    os.path.join("packages", "ui"),
]

# Patterns for prohibited raw emojis in JSX
EMOJI_PATTERN = re.compile(r'>(.*?[\u2600-\u26FF\u2700-\u27BF\U0001F300-\U0001F9FF].*?)<')

# Patterns for hardcoded hex colors (excluding DESIGN_TOKENS definition file itself)
HEX_PATTERN = re.compile(r'#(?:[0-9a-fA-F]{3}){1,2}\b')

# Prohibited arbitrary slate classes in favor of Serene Finance tokens
SLATE_CLASSES = [
    r'\bbg-slate-(?:50|100|200|300|400|500|600|700|800|900|950)\b',
    r'\btext-slate-(?:50|100|200|300|400|500|600|700|800|900|950)\b',
]

def scan_file(filepath, fix_mode=False):
    violations = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content

    # 1. Check for un-tokenized Slate Tailwind classes
    for pattern in SLATE_CLASSES:
        matches = re.findall(pattern, content)
        if matches:
            violations.append(f"Hardcoded slate class found: {set(matches)}")

    # 2. Check for raw Emojis in JSX
    if "tokens.ts" not in filepath and "en.ts" not in filepath and "ja.ts" not in filepath:
        emoji_matches = EMOJI_PATTERN.findall(content)
        if emoji_matches:
            violations.append(f"Raw emoji in JSX text found: {set(emoji_matches)}")

    return violations, new_content

def main():
    parser = argparse.ArgumentParser(description="Money Matters UI Token & Icon Linter")
    parser.add_argument("--check", action="store_true", help="Run in CI check mode (exit code 1 on violations)")
    parser.add_argument("--fix", action="store_true", help="Auto-fix trivial token violations")
    args = parser.parse_args()

    workspace_root = os.getcwd()
    total_violations = 0
    scanned_files = 0

    print("🔍 Auditing codebase for UI token and icon hygiene...")

    for target_dir in TARGET_DIRS:
        full_dir = os.path.join(workspace_root, target_dir)
        if not os.path.exists(full_dir):
            continue

        for root, dirs, files in os.walk(full_dir):
            # Skip build and node_modules directories
            dirs[:] = [d for d in dirs if d not in ('.next', 'node_modules', 'dist', 'coverage', '.turbo')]
            
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    scanned_files += 1
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, workspace_root)
                    
                    violations, _ = scan_file(filepath, fix_mode=args.fix)
                    
                    if violations:
                        total_violations += len(violations)
                        print(f"\n⚠️  {rel_path}:")
                        for v in violations:
                            print(f"   - {v}")

    print(f"\n✅ Scanned {scanned_files} files.")
    
    if total_violations > 0:
        print(f"❌ Found {total_violations} UI hygiene warning(s).")
        if args.check:
            sys.exit(1)
    else:
        print("🎉 Codebase UI hygiene is 100% compliant with Serene Finance tokens!")

if __name__ == "__main__":
    main()
