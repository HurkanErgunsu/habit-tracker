import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { usePaywallCatalog } from './hooks/usePaywallCatalog';
import type { PaywallCatalog } from './types';

type PaywallOfferingsContextValue = {
  catalog: PaywallCatalog;
  loading: boolean;
  refresh: (offeringId?: string) => Promise<void>;
};

const PaywallOfferingsContext = createContext<PaywallOfferingsContextValue | null>(null);

export function PaywallOfferingsProvider({ children }: { children: ReactNode }) {
  const { catalog, loading, refresh } = usePaywallCatalog();

  const value = useMemo<PaywallOfferingsContextValue>(
    () => ({
      catalog,
      loading,
      refresh,
    }),
    [catalog, loading, refresh]
  );

  return (
    <PaywallOfferingsContext.Provider value={value}>{children}</PaywallOfferingsContext.Provider>
  );
}

export function usePaywallOfferings() {
  const ctx = useContext(PaywallOfferingsContext);
  if (!ctx) {
    throw new Error('usePaywallOfferings must be used within PaywallOfferingsProvider');
  }
  return ctx;
}
