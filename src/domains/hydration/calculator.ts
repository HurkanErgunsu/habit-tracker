export type ActivityLevel = 'low' | 'moderate' | 'high';
export type ClimateZone = 'cold' | 'temperate' | 'hot';
export type HydrationGender = 'male' | 'female' | 'nonBinary';
export type CircadianWindowId = 'morning' | 'afternoon' | 'evening';

export type UserHydrationMetrics = {
  gender: HydrationGender | null;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  climate: ClimateZone;
  wakeTime: string;
  sleepTime: string;
};

export type CircadianWindowTargets = Record<CircadianWindowId, number> & {
  peak: number;
  ideal: number;
  windDown: number;
};

export type HydrationBreakdown = {
  baselineMl: number;
  genderMultiplier: number;
  afterGenderMl: number;
  fatFreeMassKg: number;
  ffmFactor: number;
  afterFfmMl: number;
  ageFactor: number;
  afterAgeMl: number;
  activityBonusMl: number;
  afterActivityMl: number;
  climateMultiplier: number;
  windows: CircadianWindowTargets;
};

export type HydrationTargetResult = {
  targetMl: number;
  breakdown: HydrationBreakdown;
};

/** Weight-based starting volume before biometric refinements. */
export const BASE_ML_PER_KG = 32;

export const GENDER_MULTIPLIERS: Record<HydrationGender, number> = {
  male: 1.05,
  female: 0.95,
  nonBinary: 1.0,
};

export const REFERENCE_HEIGHT_CM = 170;
export const REFERENCE_AGE = 30;
export const REFERENCE_FFM_RATIO: Record<HydrationGender, number> = {
  male: 0.8,
  female: 0.7,
  nonBinary: 0.75,
};

export const ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
  low: 0,
  moderate: 350,
  high: 700,
};

export const CLIMATE_MULTIPLIERS: Record<ClimateZone, number> = {
  cold: 1.0,
  temperate: 1.05,
  hot: 1.15,
};

/** Share of the daily target allocated to Peak / Ideal / Wind-down windows. */
export const CIRCADIAN_INTAKE_WEIGHTS: Record<CircadianWindowId, number> = {
  morning: 0.4,
  afternoon: 0.45,
  evening: 0.15,
};

export const DEFAULT_HYDRATION_METRICS: UserHydrationMetrics = {
  gender: null,
  age: 25,
  weightKg: 70,
  heightCm: 175,
  activityLevel: 'moderate',
  climate: 'temperate',
  wakeTime: '07:00',
  sleepTime: '23:00',
};

export const AGE_RANGE = { min: 13, max: 80 } as const;
export const WEIGHT_RANGE = { min: 30, max: 180 } as const;
export const HEIGHT_RANGE = { min: 140, max: 220 } as const;

export const ACTIVITY_LEVELS: ActivityLevel[] = ['low', 'moderate', 'high'];
export const CLIMATE_ZONES: ClimateZone[] = ['cold', 'temperate', 'hot'];
export const GENDER_OPTIONS: HydrationGender[] = ['male', 'female', 'nonBinary'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step = 50) {
  return Math.round(value / step) * step;
}

function resolveGender(gender: HydrationGender | null): HydrationGender {
  return gender ?? 'nonBinary';
}

/**
 * Boer fat-free mass estimate (kg).
 * Male: 0.407W + 0.267H − 19.2
 * Female: 0.252W + 0.473H − 48.3
 */
export function estimateFatFreeMassKg(
  gender: HydrationGender,
  weightKg: number,
  heightCm: number
): number {
  const maleFfm = 0.407 * weightKg + 0.267 * heightCm - 19.2;
  const femaleFfm = 0.252 * weightKg + 0.473 * heightCm - 48.3;
  if (gender === 'male') {
    return maleFfm;
  }
  if (gender === 'female') {
    return femaleFfm;
  }
  return (maleFfm + femaleFfm) / 2;
}

export function getGenderMultiplier(gender: HydrationGender | null) {
  return GENDER_MULTIPLIERS[resolveGender(gender)];
}

export function getFfmFactor(gender: HydrationGender, weightKg: number, heightCm: number) {
  const ffmKg = Math.max(estimateFatFreeMassKg(gender, weightKg, heightCm), 1);
  const expectedFfm = weightKg * REFERENCE_FFM_RATIO[gender];
  return clamp(ffmKg / Math.max(expectedFfm, 1), 0.9, 1.12);
}

/** Metabolic taper after 30, slight boost for younger adults. */
export function getAgeFactor(age: number) {
  const yearsOver = Math.max(age - REFERENCE_AGE, 0);
  const yearsUnder = Math.max(25 - age, 0);
  return clamp(1 - yearsOver * 0.004 + yearsUnder * 0.002, 0.88, 1.08);
}

export function distributeHydrationAcrossWindows(dailyTargetMl: number): CircadianWindowTargets {
  const morning = Math.round(dailyTargetMl * CIRCADIAN_INTAKE_WEIGHTS.morning);
  const afternoon = Math.round(dailyTargetMl * CIRCADIAN_INTAKE_WEIGHTS.afternoon);
  const evening = Math.max(dailyTargetMl - morning - afternoon, 0);

  return {
    morning,
    afternoon,
    evening,
    peak: morning,
    ideal: afternoon,
    windDown: evening,
  };
}

export function calculateDailyHydrationTarget(
  userMetrics: UserHydrationMetrics
): HydrationTargetResult {
  const gender = resolveGender(userMetrics.gender);
  const weightKg = clamp(userMetrics.weightKg, WEIGHT_RANGE.min, WEIGHT_RANGE.max);
  const heightCm = clamp(userMetrics.heightCm, HEIGHT_RANGE.min, HEIGHT_RANGE.max);
  const age = clamp(userMetrics.age, AGE_RANGE.min, AGE_RANGE.max);

  const baselineMl = weightKg * BASE_ML_PER_KG;
  const genderMultiplier = getGenderMultiplier(gender);
  const afterGenderMl = baselineMl * genderMultiplier;

  const fatFreeMassKg = estimateFatFreeMassKg(gender, weightKg, heightCm);
  const ffmFactor = getFfmFactor(gender, weightKg, heightCm);
  const afterFfmMl = afterGenderMl * ffmFactor;

  const ageFactor = getAgeFactor(age);
  const afterAgeMl = afterFfmMl * ageFactor;

  const activityBonusMl = ACTIVITY_BONUS_ML[userMetrics.activityLevel] ?? ACTIVITY_BONUS_ML.moderate;
  const afterActivityMl = afterAgeMl + activityBonusMl;

  const climateMultiplier = CLIMATE_MULTIPLIERS[userMetrics.climate] ?? CLIMATE_MULTIPLIERS.temperate;
  const targetMl = roundToStep(afterActivityMl * climateMultiplier);
  const windows = distributeHydrationAcrossWindows(targetMl);

  return {
    targetMl,
    breakdown: {
      baselineMl: Math.round(baselineMl),
      genderMultiplier,
      afterGenderMl: Math.round(afterGenderMl),
      fatFreeMassKg: Math.round(fatFreeMassKg * 10) / 10,
      ffmFactor: Math.round(ffmFactor * 1000) / 1000,
      afterFfmMl: Math.round(afterFfmMl),
      ageFactor: Math.round(ageFactor * 1000) / 1000,
      afterAgeMl: Math.round(afterAgeMl),
      activityBonusMl,
      afterActivityMl: Math.round(afterActivityMl),
      climateMultiplier,
      windows,
    },
  };
}

export function windowTargetMl(dailyTargetMl: number, windowId: CircadianWindowId) {
  return Math.round(dailyTargetMl * CIRCADIAN_INTAKE_WEIGHTS[windowId]);
}
