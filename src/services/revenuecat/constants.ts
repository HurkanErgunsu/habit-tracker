import { APP_BUNDLE_ID } from '@/constants/app';

/** RevenueCat entitlement that unlocks the main app. */
export const ENTITLEMENT_ACCESS = 'access';

/** App Store / Play Store product identifiers. */
export const PRODUCT_YEARLY = `${APP_BUNDLE_ID}.yearly`;
export const PRODUCT_MONTHLY = `${APP_BUNDLE_ID}.monthly`;

/** RevenueCat offering package identifiers. */
export const PACKAGE_ANNUAL = '$rc_annual';
export const PACKAGE_MONTHLY = '$rc_monthly';

export const FALLBACK_MONTHLY_PRICE = 9.99;
export const FALLBACK_YEARLY_PRICE = 39.99;
export const FALLBACK_CURRENCY = 'EUR';
export const FALLBACK_TRIAL_DAYS = 3;
