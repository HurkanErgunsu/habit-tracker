import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

let isConfigured = false;
let promoProductListenerAttached = false;

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? null;
  }
  return null;
}

export function isRevenueCatConfigured(): boolean {
  return isConfigured;
}

export async function configureRevenueCatIfNeeded(): Promise<boolean> {
  if (isConfigured) return true;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return false;
  }

  await Purchases.configure({ apiKey });
  isConfigured = true;

  if (!promoProductListenerAttached) {
    Purchases.addShouldPurchasePromoProductListener((deferredPurchase) => {
      void deferredPurchase();
    });
    promoProductListenerAttached = true;
  }

  return true;
}
