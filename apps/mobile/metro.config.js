const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro see the monorepo root so workspace packages (@nakshtra/shared) resolve.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  "@nakshtra/shared": path.resolve(workspaceRoot, "packages/shared"),
};

// Force a single copy of React (root and apps/mobile each have one), otherwise
// hooks fail with "Invalid hook call".
const singleCopy = ["react", "react-dom"];
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pkg = singleCopy.find(
    (p) => moduleName === p || moduleName.startsWith(p + "/"),
  );
  if (pkg) {
    const forced = path.resolve(projectRoot, "node_modules", moduleName);
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, "index.ts") },
      forced,
      platform,
    );
  }
  return defaultResolve
    ? defaultResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
