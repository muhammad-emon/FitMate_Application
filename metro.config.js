const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// firebase ships some .cjs files and metro ignores them by default
config.resolver.sourceExts.push('cjs');

// metro doesn't fully support package "exports", which breaks firebase auth
// ("Component auth has not been registered yet"). turning it off fixes that
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
