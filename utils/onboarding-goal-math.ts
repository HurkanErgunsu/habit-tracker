import {
  calculateDailyHydrationTarget,
  DEFAULT_HYDRATION_METRICS,
  type ActivityLevel,
  type ClimateZone,
  type HydrationGender,
} from '@/src/domains/hydration';

export const RECOMMENDED_FACTOR = 40;
export const MIN_WEIGHT_KG = 20;
export const MIN_GOAL = 0;
export const ONBOARDING_H_PADDING = 16;
export const ONBOARDING_TOTAL_STEPS = 6;
export const ONBOARDING_BG = '#FCFCFD';
/** Brand sky→ocean gradient for onboarding CTAs (water-first, no violet). */
export const ONBOARDING_BRAND_GRADIENT = ['#6BC4F5', '#2F8FE8', '#1A74D0'] as const;

export type HydrationZone = 'low' | 'perfect' | 'high';

/** Inputs that scientifically change daily target volume (not wake/sleep windows). */
export type RecommendedMlInput = {
  gender: HydrationGender | null;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  climate: ClimateZone;
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Daily recommendation from the full biometric + lifestyle calculator.
 * Weight → gender → FFM/height → age → activity bonus → climate multiplier.
 * Wake/sleep only redistribute windows; they do not change target volume.
 */
export function getRecommendedMl(input: RecommendedMlInput) {
  return calculateDailyHydrationTarget({
    ...DEFAULT_HYDRATION_METRICS,
    gender: input.gender,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
    activityLevel: input.activityLevel,
    climate: input.climate,
  }).targetMl;
}

export function getMaxGoalMl(recommendedMl: number) {
  return Math.round((recommendedMl * 2) / 50) * 50;
}

export function getZoneForGoal(goal: number, recommendedMl: number): HydrationZone {
  const lowThreshold = recommendedMl * 0.85;
  const highThreshold = recommendedMl * 1.35;
  if (goal < lowThreshold) return 'low';
  if (goal > highThreshold) return 'high';
  return 'perfect';
}

export function getGoalMessageColorByMeter(meterPercent: number) {
  if (meterPercent < 20) return 'rgb(252, 165, 165)';
  if (meterPercent < 40) return 'rgb(253, 186, 116)';
  if (meterPercent < 60) return 'rgb(134, 239, 172)';
  if (meterPercent < 80) return 'rgb(253, 186, 116)';
  return 'rgb(252, 165, 165)';
}

export function getMeterFillPercent(currentGoal: number, maxGoalMl: number) {
  return clamp((currentGoal / Math.max(maxGoalMl, 1)) * 100, 0, 100);
}

export function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function shiftTime(time: string, deltaMinutes: number) {
  return formatMinutesToTime(parseTimeToMinutes(time) + deltaMinutes);
}
