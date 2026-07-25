const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch files in the entire monorepo
config.watchFolders = [workspaceRoot];

// Ensure Metro resolves modules from the project's node_modules and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force Metro to resolve singleton packages and map ESM .js relative imports to .ts/.tsx files
const singletons = ["react", "react-native", "expo", "react-dom", "@tanstack/react-query"];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle singleton packages
  if (singletons.includes(moduleName)) {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, "node_modules", moduleName),
      platform
    );
  }

  // Handle ESM relative .js extensions for TypeScript source files in monorepo packages
  if (moduleName.endsWith(".js") && (moduleName.startsWith(".") || moduleName.startsWith("/"))) {
    // Strip the .js extension so Metro resolves .ts / .tsx / .js automatically using standard sourceExts
    const extensionlessName = moduleName.slice(0, -3);
    try {
      return context.resolveRequest(context, extensionlessName, platform);
    } catch (err) {
      // Fallback to original moduleName
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
