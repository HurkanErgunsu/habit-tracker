import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AppLanguage, ThemePreference } from '@/constants/app-locales';
import { getAppStrings, type AppStrings } from '@/utils/i18n';
import {
  applyThemePreference,
  loadAppPreferences,
  saveHapticsPreference,
  saveLanguagePreference,
  saveThemePreference,
} from '@/utils/app-preferences';

type AppPreferencesContextValue = {
  ready: boolean;
  theme: ThemePreference;
  language: AppLanguage;
  hapticsEnabled: boolean;
  strings: AppStrings;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadAppPreferences().then((stored) => {
      if (cancelled) {
        return;
      }
      setThemeState(stored.theme);
      setLanguageState(stored.language);
      setHapticsEnabledState(stored.hapticsEnabled);
      applyThemePreference(stored.theme);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    setThemeState(next);
    await saveThemePreference(next);
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await saveLanguagePreference(next);
  }, []);

  const setHapticsEnabled = useCallback(async (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    await saveHapticsPreference(enabled);
  }, []);

  const strings = useMemo(() => getAppStrings(language), [language]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      ready,
      theme,
      language,
      hapticsEnabled,
      strings,
      setTheme,
      setLanguage,
      setHapticsEnabled,
    }),
    [hapticsEnabled, language, ready, setHapticsEnabled, setLanguage, setTheme, strings, theme]
  );

  return (
    <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return value;
}

export function useAppPreferencesOptional() {
  return useContext(AppPreferencesContext);
}
