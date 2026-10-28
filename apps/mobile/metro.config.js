// Metro w monorepo pnpm (IMP-201): pakiety `@polechamp/*` z workspace, node-linker `isolated` (README).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot, ...(process.env.PNPM_STORE_DIR ? [process.env.PNPM_STORE_DIR] : [])];
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

// IMP-501 (zimny start): inline requires – moduł wykonywany przy pierwszym użyciu, nie przy starcie
// bundla (trasy `(org)`/`(judge)` dopiero przy renderze). Bajtkod rośnie o ~27% (8,4 → 10,5 MB),
// więc tylko do pomiaru A/B na urządzeniu: `METRO_INLINE_REQUIRES=1` (docs-dev/perf/cold-start.md).
if (process.env.METRO_INLINE_REQUIRES === '1') {
  config.transformer.getTransformOptions = async () => ({
    transform: { experimentalImportSupport: true, inlineRequires: true },
  });
}

module.exports = config;
