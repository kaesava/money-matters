import json

with open('package.json', 'r') as f:
    data = json.load(f)

scripts = data.get('scripts', {})
scripts['test'] = 'turbo run test'
data['scripts'] = scripts

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
