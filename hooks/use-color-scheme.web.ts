import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useAppPreferencesOptional } from '@/contexts/app-preferences-context';

export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const system = useRNColorScheme();
  const prefs = useAppPreferencesOptional();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  const resolvedSystem = system === 'dark' ? 'dark' : 'light';
  if (!prefs || prefs.theme === 'system') {
    return resolvedSystem;
  }

  return prefs.theme;
}
