const { createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

/**
 * Mark implied screen-orientation hardware features as optional so Google Play
 * does not filter tablets, desktops, or XR devices.
 */
function ensureOptionalFeature(androidManifest, name) {
  if (!androidManifest.manifest['uses-feature']) {
    androidManifest.manifest['uses-feature'] = [];
  }

  const features = androidManifest.manifest['uses-feature'];
  const existing = features.find((feature) => feature?.$?.['android:name'] === name);

  if (existing) {
    existing.$['android:required'] = 'false';
    return;
  }

  features.push({
    $: {
      'android:name': name,
      'android:required': 'false',
    },
  });
}

function withAndroidOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const androidManifest = cfg.modResults;
    ensureOptionalFeature(androidManifest, 'android.hardware.screen.portrait');
    ensureOptionalFeature(androidManifest, 'android.hardware.screen.landscape');
    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withAndroidOptionalScreenFeatures,
  'with-android-optional-screen-features',
  '1.0.0'
);
