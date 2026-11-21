import { useAppPreferences } from '@/contexts/app-preferences-context';
import type { AppStrings } from '@/utils/i18n';

export function useAppStrings(): AppStrings {
  return useAppPreferences().strings;
}
