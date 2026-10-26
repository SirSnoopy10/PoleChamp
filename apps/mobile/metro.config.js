// Metro w monorepo pnpm (IMP-201): pakiety `@polechamp/*` z workspace, node-linker `isolated` (README).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Pakiety workspace są ESM z importami `./x.js` (kompilowane przez tsc do dist).
config.resolver.unstable_enablePackageExports = true;
// expo-sqlite na web (podgląd trybu sędziego): wa-sqlite jako zasób `.wasm`, SharedArrayBuffer
// wymaga izolacji cross-origin serwera deweloperskiego.
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
