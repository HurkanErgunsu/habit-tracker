import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDateKey } from '@/utils/hydration-storage';

const BANNER_DISMISSED_KEY = 'trial-reminder-banner-dismissed-date';

export async function getTrialBannerDismissedDate() {
  try {
    return (await AsyncStorage.getItem(BANNER_DISMISSED_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function isTrialBannerDismissedToday() {
  const dismissed = await getTrialBannerDismissedDate();
  return dismissed === getDateKey();
}

export async function dismissTrialBannerForToday() {
  try {
    await AsyncStorage.setItem(BANNER_DISMISSED_KEY, getDateKey());
  } catch {
    // Ignore persistence failures.
  }
}

export async function clearTrialBannerDismissal() {
  try {
    await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
  } catch {
    // Ignore.
  }
}
