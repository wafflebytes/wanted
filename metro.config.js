// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// tslib's ESM entry (modules/index.js) default-imports its CJS build, which Metro's interop
// hands back as undefined ("Cannot destructure property '__extends' of 'tslib.default'").
// Point every import at the self-contained ES build instead. Pulled in by deck.gl's
// apache-arrow and by Radix (via @expo/ui).
const TSLIB = require.resolve('tslib/tslib.es6.mjs');
const resolveRequest = config.resolver.resolveRequest;
// MX Icons exposes per-icon folders only under the "import" export condition, which Metro
// doesn't match here. Resolve `mx-icons/components/<name>` to the folder's file directly so
// the bundle carries only the icons Wanted uses (src/ui/icons/names.ts).
const MX_ROOT = path.join(__dirname, 'node_modules', 'mx-icons', 'dist');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') return { type: 'sourceFile', filePath: TSLIB };
  if (moduleName.startsWith('mx-icons/components/')) return { type: 'sourceFile', filePath: path.join(MX_ROOT, moduleName.slice('mx-icons/'.length), 'index.js') };
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
