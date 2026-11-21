import { Platform } from 'react-native';

/** Consumer-facing brand name shown in product UI and support flows. */
export const APP_BRAND_NAME = 'WaterSync';

/** iOS bundle ID and Android application ID. */
export const APP_BUNDLE_ID = 'com.ergunsu.watertracker';

export const APP_LEGAL_PRIVACY_URL = 'https://ergunsu.com/apps/water-tracker/privacy/';
/** Android / web terms page (create before shipping). */
export const APP_LEGAL_TERMS_URL = 'https://ergunsu.com/apps/water-tracker/terms/';
/** Apple Standard EULA — use for iOS Terms of Use links. */
export const APP_APPLE_STANDARD_EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const APP_DEVELOPER_APPS_URL =
  'https://apps.apple.com/de/developer/turan-hurkan-ergunsu/id1842106410';

/**
 * Set when the iOS listing is live (App Store Connect → App Information → Apple ID).
 * Format: https://apps.apple.com/app/idXXXXXXXXX
 * Country/slug variants also work, e.g. https://apps.apple.com/de/app/watersync/idXXXXXXXXX
 */
export const APP_IOS_STORE_URL = 'https://apps.apple.com/app/id6806382164';

export const APP_ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ergunsu.watertracker';

export const APP_SUPPORT_EMAIL = 'ergunsu.apps@gmail.com';
export const APP_SUPPORT_SUBJECT = 'WaterSync Support';
export const APP_SUPPORT_BODY_TEMPLATE =
  'Hello, I am reaching out regarding the WaterSync app. [Please describe your issue or feedback here]';

/** Skip onboarding/paywall while developing. */
export const SKIP_LAUNCH_GATES = __DEV__;

/** iOS → Apple Standard EULA; Android → custom terms URL. */
export function getTermsOfUseUrl() {
  return Platform.OS === 'ios' ? APP_APPLE_STANDARD_EULA_URL : APP_LEGAL_TERMS_URL;
}
