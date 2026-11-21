export {
  ENTITLEMENT_ACCESS,
  PACKAGE_ANNUAL,
  PACKAGE_MONTHLY,
  PRODUCT_MONTHLY,
  PRODUCT_YEARLY,
} from './constants';

export { configureRevenueCatIfNeeded, isRevenueCatConfigured } from './config';

export {
  checkSubscriptionAccess,
  getCustomerInfo,
  hasAccessEntitlement,
} from './entitlements';

export { getTrialStatus, trialStatusFromCustomerInfo, type TrialStatus, type TrialPlanId } from './trial';

export { openManageSubscriptions } from './manage-subscription';

export { fetchOfferingPackages, findOfferingByPromoCode, type OfferingPackages } from './offerings';

export { fetchPaywallCatalog, getFallbackPaywallCatalog } from './catalog';

export { purchasePackage, purchasePaywallPlan, restorePurchases, setCustomerPromoCode } from './purchases';

export {
  consumePendingPromoCode,
  parsePromoCodeFromUrl,
  presentStorePromoRedemption,
  setPendingPromoCode,
  startListeningForPromoUrl,
} from './promo';

export { PaywallOfferingsProvider, usePaywallOfferings } from './paywall-offerings-provider';

export { usePaywallCatalog } from './hooks/usePaywallCatalog';
export { useSubscriptionAccess } from './hooks/useSubscriptionAccess';
export { usePurchase } from './hooks/usePurchase';

export type {
  PaywallCatalog,
  PaywallPlanInfo,
  PlanId,
  PurchaseFailureReason,
  PurchaseResult,
  RestoreResult,
} from './types';
