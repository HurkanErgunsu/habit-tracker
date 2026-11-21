import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export type PlanId = 'yearly' | 'monthly';

export type PaywallPlanInfo = {
  id: PlanId;
  title: string;
  priceString: string;
  pricePerPeriodLabel: string;
  subtitle: string;
  hasFreeTrial: boolean;
  trialDays: number;
  package: PurchasesPackage | null;
};

export type PaywallCatalog = {
  yearly: PaywallPlanInfo;
  monthly: PaywallPlanInfo;
  discountPercent: number | null;
  trialCtaLabel: string;
  trialDays: number;
  currencyCode: string;
};

export type PurchaseFailureReason =
  | 'missing_api_key'
  | 'cancelled'
  | 'not_purchased'
  | 'purchase_failed'
  | 'network_error'
  | 'package_not_available';

export type PurchaseResult =
  | { success: true; customerInfo?: CustomerInfo }
  | { success: false; reason: PurchaseFailureReason };

export type RestoreResult =
  | { success: true; customerInfo: CustomerInfo; alreadyActive?: boolean }
  | {
      success: false;
      reason: 'missing_api_key' | 'nothing_to_restore' | 'restore_failed' | 'network_error';
    };
