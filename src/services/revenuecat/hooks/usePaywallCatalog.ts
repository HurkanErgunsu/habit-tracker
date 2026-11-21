import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchPaywallCatalog, getFallbackPaywallCatalog } from '../catalog';
import type { PaywallCatalog } from '../types';

export function usePaywallCatalog() {
  const [catalog, setCatalog] = useState<PaywallCatalog>(() => getFallbackPaywallCatalog());
  const [loading, setLoading] = useState(true);
  const offeringIdRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(async (offeringId?: string) => {
    if (offeringId !== undefined) {
      offeringIdRef.current = offeringId.trim() || undefined;
    }

    setLoading(true);
    try {
      const next = await fetchPaywallCatalog(offeringIdRef.current);
      setCatalog(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      catalog,
      loading,
      refresh,
    }),
    [catalog, loading, refresh]
  );
}
