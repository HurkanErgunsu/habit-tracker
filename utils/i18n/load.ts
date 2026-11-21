import { getAppStrings } from '@/utils/i18n';
import { loadAppPreferences } from '@/utils/app-preferences';

export async function getStoredAppStrings() {
  const { language } = await loadAppPreferences();
  return getAppStrings(language);
}
