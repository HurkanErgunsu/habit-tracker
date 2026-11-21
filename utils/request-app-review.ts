import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { APP_ANDROID_STORE_URL, APP_IOS_STORE_URL } from '@/constants/app';

function getStoreListingUrl(): string | null {
  if (Platform.OS === 'ios') {
    return StoreReview.storeUrl() || APP_IOS_STORE_URL || null;
  }

  return StoreReview.storeUrl() || APP_ANDROID_STORE_URL || null;
}

async function openStoreListing() {
  const url = getStoreListingUrl();
  if (!url) {
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    // Optional store fallback.
  }
}

export async function requestAppReview() {
  let usedInAppReview = false;

  try {
    if (await StoreReview.hasAction()) {
      usedInAppReview = true;
      await StoreReview.requestReview();
    }
  } catch {
    usedInAppReview = false;
  }

  // In dev/simulator the native prompt often silently no-ops; open the store listing instead.
  if (__DEV__ && getStoreListingUrl()) {
    await openStoreListing();
    return;
  }

  if (!usedInAppReview) {
    await openStoreListing();
  }
}
