import { getAppColors, type AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppColors(): AppColors {
  return getAppColors(useColorScheme());
}

export function useAppTheme() {
  const colorScheme = useColorScheme();
  return { colorScheme, colors: getAppColors(colorScheme) };
}
