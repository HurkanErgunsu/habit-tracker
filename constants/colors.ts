export const LightColors = {
  background: '#F8F9FA',
  backgroundAlt: '#EFF2F5',
  surface: '#FFFFFF',
  surfaceStrong: '#FFFFFF',
  primary: '#007AFF',
  primaryDark: '#0067D6',
  text: '#101828',
  textMuted: '#667085',
  border: '#E8EDF3',
  success: '#1E8E5A',
  warning: '#C76A1B',
  overlay: 'rgba(15, 23, 42, 0.16)',
  ringTrack: '#E8EEF5',
} as const;

export const DarkColors = {
  background: '#1E2228',
  backgroundAlt: '#262B31',
  surface: '#2B3138',
  surfaceStrong: '#313840',
  primary: '#0A84FF',
  primaryDark: '#006EE6',
  text: '#F4F7FA',
  textMuted: '#B5C0CD',
  border: '#3A424C',
  success: '#3AC885',
  warning: '#E8A657',
  overlay: 'rgba(5, 8, 12, 0.46)',
  ringTrack: '#414A56',
} as const;

export const WaterColors = LightColors;

export type AppColors = typeof LightColors | typeof DarkColors;

export function getAppColors(colorScheme?: 'light' | 'dark' | null): AppColors {
  return colorScheme === 'dark' ? DarkColors : LightColors;
}
