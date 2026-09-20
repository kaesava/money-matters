const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all workspace packages so Metro hot-reloads on any source change
// without requiring `expo start --clear` or a dev server restart.
config.watchFolders = [monorepoRoot];

// Resolve workspace packages from the monorepo node_modules first,
// then fall back to the app's own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
