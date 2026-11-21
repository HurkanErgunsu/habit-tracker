# Promo codes — App Store, Play Store, RevenueCat

Tapping **Have a promo code?** on the paywall opens the store redeem UI:

- **iOS:** native Offer Code sheet (`Purchases.presentCodeRedemptionSheet`).
- **Android:** `https://play.google.com/redeem` (Play redeem screen).
- Deep link with a code (`water-tracker://promo?code=XXXX`) opens the store URL with that code prefilled when possible.

After the store grants the subscription, RevenueCat updates `CustomerInfo` and the paywall unlocks `access`.

## App Store Connect

1. Subscription → **Offer Codes** → create / generate codes.
2. The product must be imported in RevenueCat and attached to entitlement `access`.
3. Optional: `EXPO_PUBLIC_IOS_APP_STORE_ID` (numeric Apple ID) so deep-linked codes open  
   `https://apps.apple.com/redeem?ctx=offercodes&id=APP_ID&code=CODE`.
4. Test on a **device** (not Simulator).

## Google Play Console

1. Monetize → **Promotions**.
2. Custom codes: redeemed in-app on the Play purchase sheet (payment method → Redeem code) after tapping Continue.
3. One-time codes: Play Store redeem URL (the promo button opens this).
4. Promotion **On**, products active.

## RevenueCat

No extra offering is required for store offer/promo codes. Keep products mapped to `access`. App Store promo IAPs from the product page are completed via `addShouldPurchasePromoProductListener`.
