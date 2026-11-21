export const LightColors = {
  background: '#F2F4F7',
  backgroundAlt: '#E8EBEE',
  surface: '#FFFFFF',
  surfaceStrong: '#FFFFFF',
  /** Mid panel tone (between white surface and deep chrome). */
  panel: '#DDE3EC',
  // Water-first sky→ocean blue (no indigo/violet cast).
  primary: '#2F8FE8',
  primaryDark: '#1A74D0',
  text: '#101828',
  textMuted: '#667085',
  border: '#E4E7EC',
  /** Slightly stronger than `border` for drink chips in light mode. */
  chipBorder: '#C8D0DA',
  rowPressed: '#E2E8F0',
  success: '#1E8E5A',
  warning: '#C76A1B',
  overlay: 'rgba(15, 23, 42, 0.16)',
  overlayStrong: 'rgba(15, 23, 42, 0.28)',
  ringTrack: '#E4E7EC',
  tintSubtle: '#E4F3FC',
  dangerSubtle: '#FEF2F2',
} as const;

export const DarkColors = {
  background: '#121417',
  backgroundAlt: '#0E1012',
  surface: '#252A31',
  surfaceStrong: '#252A31',
  /** Mid panel tone (between elevated surface and near-black). */
  panel: '#1C2229',
  primary: '#5BB8F5',
  primaryDark: '#2F8FE8',
  text: '#E6EAEF',
  textMuted: '#9AA3AD',
  border: '#3F4752',
  chipBorder: '#3F4752',
  rowPressed: '#3A424C',
  success: '#3AC885',
  warning: '#E8A657',
  overlay: 'rgba(5, 8, 12, 0.45)',
  overlayStrong: 'rgba(5, 8, 12, 0.62)',
  ringTrack: '#3F4752',
  tintSubtle: '#153048',
  dangerSubtle: '#3A2224',
} as const;

export const WaterColors = LightColors;

export type AppColors = typeof LightColors | typeof DarkColors;

export function getAppColors(colorScheme?: 'light' | 'dark' | null): AppColors {
  return colorScheme === 'dark' ? DarkColors : LightColors;
}
