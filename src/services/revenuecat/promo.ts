import { Linking, Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { configureRevenueCatIfNeeded } from './config';

/** Numeric App Store ID from App Store Connect → App Information. Used when a deep-link includes a code. */
export const IOS_APP_STORE_ID =
  process.env.EXPO_PUBLIC_IOS_APP_STORE_ID?.trim() || '';

let pendingPromoCode: string | null = null;

export function setPendingPromoCode(code: string) {
  const next = code.trim();
  pendingPromoCode = next || null;
}

export function consumePendingPromoCode(): string | null {
  const next = pendingPromoCode;
  pendingPromoCode = null;
  return next;
}

export function parsePromoCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const fromQuery =
      parsed.searchParams.get('code') ??
      parsed.searchParams.get('promo') ??
      parsed.searchParams.get('promoCode');
    if (fromQuery?.trim()) {
      return fromQuery.trim();
    }

    if (parsed.hostname === 'promo' || parsed.pathname.replace(/^\//, '') === 'promo') {
      const pathCode = parsed.pathname.split('/').filter(Boolean).pop();
      if (pathCode && pathCode !== 'promo') {
        return pathCode.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Opens the native App Store offer-code sheet (iOS) or Play redeem URL (Android). */
export async function presentStorePromoRedemption(code?: string): Promise<void> {
  const trimmed = code?.trim();

  if (Platform.OS === 'ios') {
    const configured = await configureRevenueCatIfNeeded();
    if (trimmed && IOS_APP_STORE_ID) {
      const redeemUrl = `https://apps.apple.com/redeem?ctx=offercodes&id=${IOS_APP_STORE_ID}&code=${encodeURIComponent(trimmed)}`;
      if (await Linking.canOpenURL(redeemUrl)) {
        await Linking.openURL(redeemUrl);
        return;
      }
    }
    if (!configured) {
      throw new Error('missing_api_key');
    }
    await Purchases.presentCodeRedemptionSheet();
    return;
  }

  if (Platform.OS === 'android') {
    const redeemUrl = trimmed
      ? `https://play.google.com/redeem?code=${encodeURIComponent(trimmed)}`
      : 'https://play.google.com/redeem';
    await Linking.openURL(redeemUrl);
  }
}

export async function startListeningForPromoUrl(onCode?: (code: string) => void) {
  const handleUrl = (url: string | null) => {
    const parsedCode = parsePromoCodeFromUrl(url);
    if (!parsedCode) {
      return;
    }
    setPendingPromoCode(parsedCode);
    onCode?.(parsedCode);
  };

  const initial = await Linking.getInitialURL();
  handleUrl(initial);

  const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
  return () => sub.remove();
}
