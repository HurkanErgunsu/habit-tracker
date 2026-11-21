import Purchases, {
  PACKAGE_TYPE,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { configureRevenueCatIfNeeded } from './config';
import {
  PACKAGE_ANNUAL,
  PACKAGE_MONTHLY,
  PRODUCT_MONTHLY,
  PRODUCT_YEARLY,
} from './constants';

export type OfferingPackages = {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  offering: PurchasesOffering | null;
};

function isAnnualPackage(pkg: PurchasesPackage): boolean {
  return (
    pkg.identifier === PACKAGE_ANNUAL ||
    pkg.product.identifier === PRODUCT_YEARLY ||
    pkg.packageType === PACKAGE_TYPE.ANNUAL ||
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('year')
  );
}

function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  return (
    pkg.identifier === PACKAGE_MONTHLY ||
    pkg.product.identifier === PRODUCT_MONTHLY ||
    pkg.packageType === PACKAGE_TYPE.MONTHLY ||
    pkg.identifier.toLowerCase().includes('month')
  );
}

function resolveAnnualPackage(offering: PurchasesOffering): PurchasesPackage | null {
  const packages = offering.availablePackages;

  return (
    packages.find((pkg) => pkg.identifier === PACKAGE_ANNUAL) ??
    packages.find((pkg) => pkg.product.identifier === PRODUCT_YEARLY) ??
    offering.annual ??
    packages.find(isAnnualPackage) ??
    null
  );
}

function resolveMonthlyPackage(offering: PurchasesOffering): PurchasesPackage | null {
  const packages = offering.availablePackages;

  return (
    packages.find((pkg) => pkg.identifier === PACKAGE_MONTHLY) ??
    packages.find((pkg) => pkg.product.identifier === PRODUCT_MONTHLY) ??
    offering.monthly ??
    packages.find(isMonthlyPackage) ??
    null
  );
}

export async function fetchOfferingPackages(offeringId?: string): Promise<OfferingPackages> {
  const empty: OfferingPackages = { annual: null, monthly: null, offering: null };

  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return empty;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const promoOffering = offeringId ? findOfferingInList(offerings.all, offeringId) : null;
    const current = promoOffering ?? offerings.current ?? offerings.all.default ?? null;
    if (!current) {
      return empty;
    }

    return {
      annual: resolveAnnualPackage(current),
      monthly: resolveMonthlyPackage(current),
      offering: current,
    };
  } catch {
    return empty;
  }
}

function metadataValues(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const values: unknown[] = [
    metadata.promo_code,
    metadata.promoCode,
    metadata.code,
  ];

  if (Array.isArray(metadata.promo_codes)) {
    values.push(...metadata.promo_codes);
  }
  if (Array.isArray(metadata.codes)) {
    values.push(...metadata.codes);
  }

  return values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

function offeringMatchesPromoCode(offering: PurchasesOffering, code: string): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (offering.identifier.toLowerCase() === normalized) {
    return true;
  }

  return metadataValues(offering.metadata).includes(normalized);
}

function findOfferingInList(
  all: Record<string, PurchasesOffering>,
  code: string
): PurchasesOffering | null {
  const normalized = code.trim();
  if (!normalized) {
    return null;
  }

  return Object.values(all).find((offering) => offeringMatchesPromoCode(offering, normalized)) ?? null;
}

export async function findOfferingByPromoCode(code: string): Promise<PurchasesOffering | null> {
  const configured = await configureRevenueCatIfNeeded();
  if (!configured) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return findOfferingInList(offerings.all, code);
  } catch {
    return null;
  }
}
