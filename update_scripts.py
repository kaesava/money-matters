import json
import os

def update_package(path):
    try:
        with open(path, 'r') as f:
            data = json.load(f)

        scripts = data.get('scripts', {})
        if 'build' not in scripts:
            scripts['build'] = 'echo "No build script yet"'
        if 'lint' not in scripts:
            scripts['lint'] = 'eslint .'
        if 'test' not in scripts:
            scripts['test'] = 'vitest run'
        if 'typecheck' not in scripts:
            scripts['typecheck'] = 'tsc --noEmit'

        data['scripts'] = scripts

        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Updated {path}")
    except Exception as e:
        print(f"Error updating {path}: {e}")

paths = [
    'apps/mobile/package.json',
    'packages/db/package.json',
    'packages/i18n/package.json',
    'packages/types/package.json',
    'packages/ui/package.json',
]

for p in paths:
    if os.path.exists(p):
        update_package(p)
    else:
        # Create package.json if it doesn't exist
        print(f"{p} doesn't exist, creating basic one")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        name = os.path.basename(os.path.dirname(p))
        if name in ['types', 'ui', 'i18n', 'db']:
            name = f"@money-matters/{name}"
        data = {
            "name": name,
            "version": "0.1.0",
            "scripts": {
                "build": "echo \"No build script yet\"",
                "lint": "eslint .",
                "test": "vitest run",
                "typecheck": "tsc --noEmit"
            }
        }
        with open(p, 'w') as f:
            json.dump(data, f, indent=2)

capabilities = ['allocation', 'household']
for cap in capabilities:
    p = f'packages/capabilities/{cap}/package.json'
    if os.path.exists(p):
        update_package(p)
    else:
        print(f"{p} doesn't exist, creating basic one")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        data = {
            "name": f"@money-matters/{cap}",
            "version": "0.1.0",
            "scripts": {
                "build": "echo \"No build script yet\"",
                "lint": "eslint .",
                "test": "vitest run",
                "typecheck": "tsc --noEmit"
            }
        }
        with open(p, 'w') as f:
            json.dump(data, f, indent=2)
