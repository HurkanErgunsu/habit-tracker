import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { configureRevenueCatIfNeeded } from './config';
import { ENTITLEMENT_ACCESS } from './constants';

export function hasAccessEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ACCESS] !== undefined;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return null;
  }

  return Purchases.getCustomerInfo();
}

export async function checkSubscriptionAccess(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) {
    return false;
  }

  return hasAccessEntitlement(customerInfo);
}
