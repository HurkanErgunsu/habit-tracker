import type { PurchasesPackage } from 'react-native-purchases';

import {
  FALLBACK_CURRENCY,
  FALLBACK_MONTHLY_PRICE,
  FALLBACK_TRIAL_DAYS,
  FALLBACK_YEARLY_PRICE,
} from './constants';
import { fetchOfferingPackages } from './offerings';
import type { PaywallCatalog } from './types';

function formatFallbackPrice(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2).replace('.', ',')} €`;
  }
}

function getTrialDaysFromPackage(pkg: PurchasesPackage | null | undefined): number {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return FALLBACK_TRIAL_DAYS;

  const unit = intro.periodUnit;
  const count = intro.periodNumberOfUnits || 1;
  if (unit === 'DAY') return count;
  if (unit === 'WEEK') return count * 7;
  if (unit === 'MONTH') return count * 30;
  return FALLBACK_TRIAL_DAYS;
}

export function getFallbackPaywallCatalog(): PaywallCatalog {
  return buildFallbackCatalog();
}

function buildFallbackCatalog(): PaywallCatalog {
  const monthlyPrice = formatFallbackPrice(FALLBACK_MONTHLY_PRICE, FALLBACK_CURRENCY);
  const yearlyPrice = formatFallbackPrice(FALLBACK_YEARLY_PRICE, FALLBACK_CURRENCY);
  const trialCta = formatFallbackPrice(0, FALLBACK_CURRENCY);
  const discountPercent = Math.round(
    (1 - FALLBACK_YEARLY_PRICE / (FALLBACK_MONTHLY_PRICE * 12)) * 100
  );

  return {
    yearly: {
      id: 'yearly',
      title: 'Yearly',
      priceString: yearlyPrice,
      pricePerPeriodLabel: `${yearlyPrice}/yr`,
      subtitle: `${yearlyPrice}/yr after free trial.`,
      hasFreeTrial: true,
      trialDays: FALLBACK_TRIAL_DAYS,
      package: null,
    },
    monthly: {
      id: 'monthly',
      title: 'Monthly',
      priceString: monthlyPrice,
      pricePerPeriodLabel: `${monthlyPrice}/mo`,
      subtitle: 'No free trial.',
      hasFreeTrial: false,
      trialDays: 0,
      package: null,
    },
    discountPercent,
    trialCtaLabel: trialCta,
    trialDays: FALLBACK_TRIAL_DAYS,
    currencyCode: FALLBACK_CURRENCY,
  };
}

function buildCatalogFromPackages(
  yearlyPkg: PurchasesPackage | null,
  monthlyPkg: PurchasesPackage | null
): PaywallCatalog {
  const fallback = buildFallbackCatalog();
  const trialDays = getTrialDaysFromPackage(yearlyPkg) || FALLBACK_TRIAL_DAYS;
  const currencyCode =
    yearlyPkg?.product.currencyCode || monthlyPkg?.product.currencyCode || FALLBACK_CURRENCY;

  const monthlyPriceString = monthlyPkg?.product.priceString ?? fallback.monthly.priceString;
  const monthlyPrice = monthlyPkg?.product.price ?? FALLBACK_MONTHLY_PRICE;
  const yearlyDisplayPriceString = yearlyPkg?.product.priceString ?? fallback.yearly.priceString;
  const yearlyForDiscount = yearlyPkg?.product.price ?? FALLBACK_YEARLY_PRICE;
  const discountPercent =
    monthlyPrice > 0
      ? Math.max(0, Math.round((1 - yearlyForDiscount / (monthlyPrice * 12)) * 100))
      : fallback.discountPercent;

  const intro = yearlyPkg?.product.introPrice;
  const trialCtaLabel =
    intro && intro.price === 0
      ? intro.priceString
      : formatFallbackPrice(0, currencyCode);

  return {
    yearly: {
      id: 'yearly',
      title: 'Yearly',
      priceString: yearlyDisplayPriceString,
      pricePerPeriodLabel: `${yearlyDisplayPriceString}/yr`,
      subtitle: `${yearlyDisplayPriceString}/yr after free trial.`,
      hasFreeTrial: true,
      trialDays,
      package: yearlyPkg,
    },
    monthly: {
      id: 'monthly',
      title: 'Monthly',
      priceString: monthlyPriceString,
      pricePerPeriodLabel: `${monthlyPriceString}/mo`,
      subtitle: 'No free trial.',
      hasFreeTrial: false,
      trialDays: 0,
      package: monthlyPkg,
    },
    discountPercent,
    trialCtaLabel,
    trialDays,
    currencyCode,
  };
}

export async function fetchPaywallCatalog(offeringId?: string): Promise<PaywallCatalog> {
  const fallback = buildFallbackCatalog();

  try {
    const { annual, monthly } = await fetchOfferingPackages(offeringId);
    if (!annual && !monthly) {
      return fallback;
    }

    return buildCatalogFromPackages(annual, monthly);
  } catch {
    return fallback;
  }
}
