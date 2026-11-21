import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { configureRevenueCatIfNeeded } from './config';
import { getCustomerInfo, hasAccessEntitlement } from './entitlements';
import { fetchOfferingPackages } from './offerings';
import type { PaywallPlanInfo, PlanId, PurchaseResult, RestoreResult } from './types';

async function resolvePackageForPlan(planId: PlanId): Promise<PurchasesPackage | null> {
  const { annual, monthly } = await fetchOfferingPackages();
  return planId === 'yearly' ? annual : monthly;
}

function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const message =
    'message' in error && typeof (error as { message?: string }).message === 'string'
      ? (error as { message: string }).message.toLowerCase()
      : '';

  return (
    message.includes('network') ||
    message.includes('internet') ||
    message.includes('offline') ||
    message.includes('timed out')
  );
}

function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    (error as { userCancelled?: boolean }).userCancelled === true
  );
}

export async function purchasePackage(packageToPurchase: PurchasesPackage): Promise<PurchaseResult> {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return { success: false, reason: 'missing_api_key' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    if (hasAccessEntitlement(customerInfo)) {
      return { success: true, customerInfo };
    }
    return { success: false, reason: 'not_purchased' };
  } catch (error: unknown) {
    if (isUserCancelled(error)) {
      return { success: false, reason: 'cancelled' };
    }
    if (isNetworkError(error)) {
      return { success: false, reason: 'network_error' };
    }
    return { success: false, reason: 'purchase_failed' };
  }
}

/** Purchase a paywall plan. Annual triggers store trial; monthly is immediate subscription. */
export async function purchasePaywallPlan(plan: PaywallPlanInfo): Promise<PurchaseResult> {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return { success: false, reason: 'missing_api_key' };
  }

  const packageToPurchase = plan.package ?? (await resolvePackageForPlan(plan.id));
  if (!packageToPurchase) {
    return { success: false, reason: 'package_not_available' };
  }

  return purchasePackage(packageToPurchase);
}

export async function setCustomerPromoCode(code: string) {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return;
  }

  try {
    await Purchases.setAttributes({ promo_code: code.trim() });
  } catch {
    // Attribute sync is best-effort and should not block the paywall.
  }
}

export async function restorePurchases(): Promise<RestoreResult> {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return { success: false, reason: 'missing_api_key' };
  }

  try {
    const existing = await getCustomerInfo();
    if (existing && hasAccessEntitlement(existing)) {
      return { success: true, customerInfo: existing, alreadyActive: true };
    }

    const customerInfo = await Purchases.restorePurchases();
    if (hasAccessEntitlement(customerInfo)) {
      return { success: true, customerInfo };
    }
    return { success: false, reason: 'nothing_to_restore' };
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      return { success: false, reason: 'network_error' };
    }
    return { success: false, reason: 'restore_failed' };
  }
}
