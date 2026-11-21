import type { AppLanguage } from '@/constants/app-locales';
import { APP_LOCALE_TAGS } from '@/constants/app-locales';

import { en, type AppStrings } from '@/utils/i18n/en';
import { de } from '@/utils/i18n/de';
import { es } from '@/utils/i18n/es';
import { fr } from '@/utils/i18n/fr';
import { it } from '@/utils/i18n/it';
import { ja } from '@/utils/i18n/ja';
import { pt } from '@/utils/i18n/pt';
import { ru } from '@/utils/i18n/ru';
import { tr } from '@/utils/i18n/tr';

export type { AppStrings } from '@/utils/i18n/en';

const CATALOG: Record<AppLanguage, AppStrings> = {
  en,
  tr,
  es,
  it,
  fr,
  ru,
  de,
  pt,
  ja,
};

export function getAppStrings(language: AppLanguage): AppStrings {
  return CATALOG[language] ?? en;
}

export function getLocaleTag(language: AppLanguage) {
  return APP_LOCALE_TAGS[language];
}

export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
