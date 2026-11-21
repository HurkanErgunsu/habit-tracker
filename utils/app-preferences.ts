import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import {
  isAppLanguage,
  languageFromDeviceLocale,
  type AppLanguage,
  type ThemePreference,
} from '@/constants/app-locales';
import { setHapticsEnabled } from '@/utils/haptics';

const THEME_KEY = 'water-tracker-theme-preference';
const LANGUAGE_KEY = 'water-tracker-language';
const HAPTICS_KEY = 'water-tracker-haptics-enabled';

export type AppPreferences = {
  theme: ThemePreference;
  language: AppLanguage;
  hapticsEnabled: boolean;
};

function isThemePreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function applyThemePreference(theme: ThemePreference) {
  Appearance.setColorScheme(theme === 'system' ? null : theme);
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  const [themeRaw, languageRaw, hapticsRaw] = await Promise.all([
    AsyncStorage.getItem(THEME_KEY),
    AsyncStorage.getItem(LANGUAGE_KEY),
    AsyncStorage.getItem(HAPTICS_KEY),
  ]);

  const theme = themeRaw && isThemePreference(themeRaw) ? themeRaw : 'system';
  const language =
    languageRaw && isAppLanguage(languageRaw)
      ? languageRaw
      : languageFromDeviceLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  const hapticsEnabled = hapticsRaw === null ? true : hapticsRaw === 'true';
  setHapticsEnabled(hapticsEnabled);

  return { theme, language, hapticsEnabled };
}

export async function saveThemePreference(theme: ThemePreference) {
  applyThemePreference(theme);
  await AsyncStorage.setItem(THEME_KEY, theme);
}

export async function saveLanguagePreference(language: AppLanguage) {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function saveHapticsPreference(enabled: boolean) {
  setHapticsEnabled(enabled);
  await AsyncStorage.setItem(HAPTICS_KEY, enabled ? 'true' : 'false');
}
