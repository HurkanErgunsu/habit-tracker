import type { ActivityLevel, ClimateZone, GenderOption } from '@/utils/hydration-storage';
import { fill, type AppStrings } from '@/utils/i18n';

export function getDisplayName(displayName: string | undefined, fallback: string) {
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function formatGender(gender: GenderOption | null, t: AppStrings) {
  if (gender === 'male') {
    return t.common.gender.male;
  }
  if (gender === 'female') {
    return t.common.gender.female;
  }
  if (gender === 'nonBinary') {
    return t.common.gender.nonBinary;
  }
  return t.common.notSet;
}

export function formatActivityLevel(activityLevel: ActivityLevel, t: AppStrings) {
  return t.screens.onboarding.lifestyle.activity[activityLevel].title;
}

export function formatClimate(climate: ClimateZone, t: AppStrings) {
  return t.screens.onboarding.lifestyle.climate[climate].title;
}

export function formatClockTime(time: string) {
  return time;
}

export function formatGoalMl(goalMl: number, t: AppStrings, locale?: string) {
  return fill(t.screens.profile.dailyGoalValue, { ml: goalMl.toLocaleString(locale) });
}
