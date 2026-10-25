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

module.exports = config;
