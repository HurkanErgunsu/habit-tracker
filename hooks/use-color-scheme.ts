import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppPreferencesOptional } from '@/contexts/app-preferences-context';

export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const prefs = useAppPreferencesOptional();
  const resolvedSystem = system === 'dark' ? 'dark' : 'light';

  if (!prefs || prefs.theme === 'system') {
    return resolvedSystem;
  }

  return prefs.theme;
}
