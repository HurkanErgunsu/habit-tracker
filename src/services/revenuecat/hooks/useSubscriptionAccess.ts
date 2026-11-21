import { useCallback, useEffect, useState } from 'react';

import { configureRevenueCatIfNeeded } from '../config';
import { checkSubscriptionAccess } from '../entitlements';

export function useSubscriptionAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const configured = await configureRevenueCatIfNeeded();
      if (!configured) {
        setHasAccess(false);
        return false;
      }

      const access = await checkSubscriptionAccess();
      setHasAccess(access);
      return access;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { hasAccess, loading, refresh };
}
