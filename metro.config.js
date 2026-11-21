const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const tslibCjs = path.resolve(__dirname, 'node_modules/tslib/tslib.js');

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Metro + package exports can load tslib/modules/index.js, which breaks
  // (`tslib.default` is undefined → framer-motion/moti crash on launch).
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: tslibCjs };
  }
  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
