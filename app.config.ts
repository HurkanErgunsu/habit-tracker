import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

// Keep static fields in app.json; this file adds Android R8 + AD_ID blocking.
const appJson = require('./app.json') as { expo: ExpoConfig };

const ANDROID_BLOCKED_PERMISSIONS = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_ADSERVICES_AD_ID',
  'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
] as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const proguardRules = fs.readFileSync(
    path.join(__dirname, 'proguard-rules.pro'),
    'utf8'
  );

  const plugins = (appJson.expo.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== 'expo-build-properties';
  });

  plugins.push([
    'expo-build-properties',
    {
      android: {
        enableMinifyInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        extraProguardRules: proguardRules,
      },
    },
  ]);

  return {
    ...config,
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      blockedPermissions: [...ANDROID_BLOCKED_PERMISSIONS],
    },
    plugins,
  };
};
