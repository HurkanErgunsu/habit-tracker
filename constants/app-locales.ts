export const APP_LANGUAGE_CODES = [
  'en',
  'tr',
  'es',
  'it',
  'fr',
  'ru',
  'de',
  'pt',
  'ja',
] as const;

export type AppLanguage = (typeof APP_LANGUAGE_CODES)[number];

export type ThemePreference = 'light' | 'dark' | 'system';

export const APP_LANGUAGES: { code: AppLanguage; nativeName: string; flag: string }[] = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸' },
  { code: 'tr', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
];

export const APP_LOCALE_TAGS: Record<AppLanguage, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  es: 'es-ES',
  it: 'it-IT',
  fr: 'fr-FR',
  ru: 'ru-RU',
  de: 'de-DE',
  pt: 'pt-PT',
  ja: 'ja-JP',
};

export function isAppLanguage(value: string): value is AppLanguage {
  return APP_LANGUAGE_CODES.includes(value as AppLanguage);
}

export function languageFromDeviceLocale(locale: string): AppLanguage {
  const normalized = locale.replace('_', '-').toLowerCase();
  const short = normalized.split('-')[0];
  if (short === 'jp') {
    return 'ja';
  }
  return isAppLanguage(short) ? short : 'en';
}
