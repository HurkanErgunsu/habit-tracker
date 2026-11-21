import { Linking, Platform } from 'react-native';

import { openExternalUrl } from '@/utils/open-external-url';

/** Official platform help pages for viewing / changing / canceling subscriptions. */
const APPLE_SUBSCRIPTION_HELP_URL = 'https://support.apple.com/HT202039';
const GOOGLE_PLAY_SUBSCRIPTION_HELP_URL =
  'https://support.google.com/googleplay/answer/7018481';

function subscriptionHelpUrl() {
  return Platform.OS === 'ios'
    ? APPLE_SUBSCRIPTION_HELP_URL
    : GOOGLE_PLAY_SUBSCRIPTION_HELP_URL;
}

/** Opens Apple / Google Play subscription management help (not the account page). */
export async function openManageSubscriptions(_managementURL?: string | null) {
  const url = subscriptionHelpUrl();
  try {
    await openExternalUrl(url);
    return;
  } catch {
    // Fall through to Linking.
  }

  try {
    await Linking.openURL(url);
  } catch {
    // Best-effort only.
  }
}
