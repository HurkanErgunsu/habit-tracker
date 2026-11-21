import { useCallback, useState } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';

import { purchasePackage, restorePurchases } from '../purchases';
import type { PurchaseResult, RestoreResult } from '../types';

export function usePurchase() {
  const [busy, setBusy] = useState(false);

  const purchase = useCallback(async (packageToPurchase: PurchasesPackage): Promise<PurchaseResult> => {
    setBusy(true);
    try {
      return await purchasePackage(packageToPurchase);
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<RestoreResult> => {
    setBusy(true);
    try {
      return await restorePurchases();
    } finally {
      setBusy(false);
    }
  }, []);

  return { purchase, restore, busy };
}
