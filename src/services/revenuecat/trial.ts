import type { CustomerInfo } from 'react-native-purchases';

import { SKIP_LAUNCH_GATES } from '@/constants/app';

import { PRODUCT_MONTHLY, PRODUCT_YEARLY } from './constants';
import { getCustomerInfo } from './entitlements';

export type TrialPlanId = 'yearly' | 'monthly' | 'unknown';

export type TrialStatus = {
  isTrial: boolean;
  expiresAt: number | null;
  daysRemaining: number;
  productIdentifier: string | null;
  planId: TrialPlanId;
  willRenew: boolean;
  managementURL: string | null;
};

function planIdFromProduct(productIdentifier: string | null): TrialPlanId {
  if (!productIdentifier) return 'unknown';
  if (productIdentifier === PRODUCT_YEARLY || productIdentifier.includes('yearly')) {
    return 'yearly';
  }
  if (productIdentifier === PRODUCT_MONTHLY || productIdentifier.includes('monthly')) {
    return 'monthly';
  }
  return 'unknown';
}

function daysRemainingFrom(expiresAtMs: number | null) {
  if (!expiresAtMs) return 0;
  const ms = expiresAtMs - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Dev/test mock: 1 day left so it sits inside the default reminder window. */
function mockTrialStatus(): TrialStatus {
  const daysRemaining = 1;
  const expiresAt = Date.now() + daysRemaining * 24 * 60 * 60 * 1000;
  return {
    isTrial: true,
    expiresAt,
    daysRemaining,
    productIdentifier: PRODUCT_YEARLY,
    planId: 'yearly',
    willRenew: true,
    managementURL: null,
  };
}

export function trialStatusFromCustomerInfo(customerInfo: CustomerInfo | null): TrialStatus {
  if (!customerInfo) {
    return SKIP_LAUNCH_GATES
      ? mockTrialStatus()
      : {
          isTrial: false,
          expiresAt: null,
          daysRemaining: 0,
          productIdentifier: null,
          planId: 'unknown',
          willRenew: false,
          managementURL: null,
        };
  }

  const entitlement = Object.values(customerInfo.entitlements.active)[0];
  if (!entitlement || entitlement.periodType !== 'TRIAL') {
    if (SKIP_LAUNCH_GATES) {
      return mockTrialStatus();
    }
    return {
      isTrial: false,
      expiresAt: null,
      daysRemaining: 0,
      productIdentifier: null,
      planId: 'unknown',
      willRenew: false,
      managementURL: customerInfo.managementURL,
    };
  }

  const expiresAt = entitlement.expirationDateMillis;
  return {
    isTrial: true,
    expiresAt,
    daysRemaining: daysRemainingFrom(expiresAt),
    productIdentifier: entitlement.productIdentifier,
    planId: planIdFromProduct(entitlement.productIdentifier),
    willRenew: entitlement.willRenew,
    managementURL: customerInfo.managementURL,
  };
}

export async function getTrialStatus(): Promise<TrialStatus> {
  const customerInfo = await getCustomerInfo();
  return trialStatusFromCustomerInfo(customerInfo);
}
