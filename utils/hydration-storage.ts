import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    BEVERAGE_BY_TYPE,
    BEVERAGES,
    computeNetHydrationMl,
    type BeverageType,
} from '@/constants/beverages';
import {
  DEFAULT_HYDRATION_METRICS,
  type ActivityLevel,
  type ClimateZone,
} from '@/src/domains/hydration';

const HYDRATION_STORAGE_KEY = 'water-tracker-state-v1';

export type GenderOption = 'male' | 'female' | 'nonBinary';
export type { ActivityLevel, ClimateZone };

function normalizeGender(value: unknown): GenderOption | null {
  if (value === 'male' || value === 'female' || value === 'nonBinary') {
    return value;
  }
  // Legacy storage used "other" before non-binary rename.
  if (value === 'other') {
    return 'nonBinary';
  }
  return null;
}

function normalizeActivityLevel(value: unknown): ActivityLevel {
  if (value === 'low' || value === 'moderate' || value === 'high') {
    return value;
  }
  return DEFAULT_HYDRATION_METRICS.activityLevel;
}

function normalizeClimate(value: unknown): ClimateZone {
  if (value === 'cold' || value === 'temperate' || value === 'hot') {
    return value;
  }
  return DEFAULT_HYDRATION_METRICS.climate;
}

export type BeverageLog = {
  id: string;
  type: BeverageType;
  volumeMl: number;
  netHydrationMl: number;
  loggedAt: number;
};

export const DEFAULT_FAVORITE_BEVERAGES: BeverageType[] = ['water', 'tea', 'coffee'];

/** Bump when default favorite lineup changes so existing installs pick up new defaults once. */
export const FAVORITE_DEFAULTS_REVISION = 1;

export type FavoriteBeverageSlot = {
  type: BeverageType;
  volumeMl: number;
};

export const DEFAULT_FAVORITE_SLOTS: FavoriteBeverageSlot[] = DEFAULT_FAVORITE_BEVERAGES.map(
  (type) => ({
    type,
    volumeMl: BEVERAGE_BY_TYPE[type].defaultVolumeMl,
  })
);

const MIN_FAVORITE_VOLUME_ML = 50;
const MAX_FAVORITE_VOLUME_ML = 1000;

export type HydrationState = {
  weightKg: number;
  goalMl: number;
  recommendedMl: number;
  /** When false, daily goal follows recommendedMl automatically. */
  usesManualGoal?: boolean;
  drankMl: number;
  lastIntakeAt: number | null;
  streakCount: number;
  lastCompletedDate: string | null;
  lastProgressDate: string | null;
  todayBeverageLogs: BeverageLog[];
  /** Archived logs from prior days (rolled over on daily reset). */
  beverageLogHistory?: BeverageLog[];
  /** @deprecated Use favoriteBeverageSlots. Kept for storage migration only. */
  favoriteBeverages?: BeverageType[];
  favoriteBeverageSlots: FavoriteBeverageSlot[];
  favoriteDefaultsRevision?: number;
  gender: GenderOption | null;
  displayName?: string;
  /** Local file URI for the profile photo (set from Profile settings only). */
  profilePhotoUri?: string | null;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  climate: ClimateZone;
  wakeTime: string;
  sleepTime: string;
  onboardingCompleted: boolean;
  /** True after trial/purchase funnel is finished (or restored). */
  paywallCompleted: boolean;
  /** Days before trial end to send reminder pushes/banner (from paywall). */
  trialReminderDays?: 1 | 2;
};

export const DEFAULT_HYDRATION_STATE: HydrationState = {
  weightKg: 70,
  goalMl: 2800,
  recommendedMl: 2800,
  usesManualGoal: false,
  drankMl: 0,
  lastIntakeAt: null,
  streakCount: 0,
  lastCompletedDate: null,
  lastProgressDate: null,
  todayBeverageLogs: [],
  favoriteBeverageSlots: [...DEFAULT_FAVORITE_SLOTS],
  favoriteDefaultsRevision: FAVORITE_DEFAULTS_REVISION,
  gender: null,
  displayName: '',
  profilePhotoUri: null,
  heightCm: 170,
  age: 28,
  activityLevel: DEFAULT_HYDRATION_METRICS.activityLevel,
  climate: DEFAULT_HYDRATION_METRICS.climate,
  wakeTime: '07:00',
  sleepTime: '23:00',
  onboardingCompleted: false,
  paywallCompleted: false,
  trialReminderDays: 1,
};

export function getAllBeverageLogs(state: HydrationState): BeverageLog[] {
  return [...(state.beverageLogHistory ?? []), ...state.todayBeverageLogs];
}

export function getDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getPreviousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return getDateKey(date);
}

export function getEffectiveGoalMl(
  state: Pick<HydrationState, 'goalMl' | 'recommendedMl' | 'usesManualGoal'>
) {
  return state.usesManualGoal ? state.goalMl : state.recommendedMl;
}

export async function loadHydrationState() {
  try {
    const rawValue = await AsyncStorage.getItem(HYDRATION_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_HYDRATION_STATE;
    }

    const parsed = JSON.parse(rawValue) as Partial<HydrationState>;
    const favoriteBeverageSlots =
      parsed.favoriteDefaultsRevision === FAVORITE_DEFAULTS_REVISION
        ? normalizeFavoriteBeverageSlots(
            parsed.favoriteBeverageSlots,
            parsed.favoriteBeverages
          )
        : [...DEFAULT_FAVORITE_SLOTS];

    const usesManualGoal = parsed.usesManualGoal ?? false;
    const recommendedMl = parsed.recommendedMl ?? DEFAULT_HYDRATION_STATE.recommendedMl;
    const goalMl = usesManualGoal
      ? (parsed.goalMl ?? DEFAULT_HYDRATION_STATE.goalMl)
      : recommendedMl;

    return {
      ...DEFAULT_HYDRATION_STATE,
      ...parsed,
      gender: normalizeGender(parsed.gender),
      activityLevel: normalizeActivityLevel(parsed.activityLevel),
      climate: normalizeClimate(parsed.climate),
      favoriteBeverageSlots,
      favoriteDefaultsRevision: FAVORITE_DEFAULTS_REVISION,
      usesManualGoal,
      recommendedMl,
      goalMl,
    };
  } catch {
    return DEFAULT_HYDRATION_STATE;
  }
}

export async function saveHydrationState(state: HydrationState) {
  await AsyncStorage.setItem(HYDRATION_STORAGE_KEY, JSON.stringify(state));
  hydrationListeners.forEach((listener) => listener(state));
}

type HydrationListener = (state: HydrationState) => void;
const hydrationListeners = new Set<HydrationListener>();

export function subscribeHydrationState(listener: HydrationListener) {
  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
}

export function clampFavoriteVolumeMl(volumeMl: number) {
  return Math.max(
    MIN_FAVORITE_VOLUME_ML,
    Math.min(MAX_FAVORITE_VOLUME_ML, Math.round(volumeMl))
  );
}

export function normalizeFavoriteBeverageSlots(
  slots?: FavoriteBeverageSlot[],
  legacyTypes?: BeverageType[]
): FavoriteBeverageSlot[] {
  const source =
    slots && slots.length > 0
      ? slots
      : (legacyTypes ?? DEFAULT_FAVORITE_BEVERAGES).map((type) => ({
          type,
          volumeMl: BEVERAGE_BY_TYPE[type].defaultVolumeMl,
        }));

  const validTypes = new Set(BEVERAGES.map((beverage) => beverage.type));
  const normalized: FavoriteBeverageSlot[] = [];

  for (const slot of source) {
    if (!validTypes.has(slot.type)) {
      continue;
    }
    if (normalized.some((entry) => entry.type === slot.type)) {
      continue;
    }
    normalized.push({
      type: slot.type,
      volumeMl: clampFavoriteVolumeMl(slot.volumeMl),
    });
  }

  for (const type of DEFAULT_FAVORITE_BEVERAGES) {
    if (normalized.length >= 3) {
      break;
    }
    if (!normalized.some((entry) => entry.type === type)) {
      normalized.push({
        type,
        volumeMl: BEVERAGE_BY_TYPE[type].defaultVolumeMl,
      });
    }
  }

  for (const beverage of BEVERAGES) {
    if (normalized.length >= 3) {
      break;
    }
    if (!normalized.some((entry) => entry.type === beverage.type)) {
      normalized.push({
        type: beverage.type,
        volumeMl: beverage.defaultVolumeMl,
      });
    }
  }

  return normalized.slice(0, 3);
}

export function normalizeFavoriteBeverages(favorites?: BeverageType[]): BeverageType[] {
  return normalizeFavoriteBeverageSlots(undefined, favorites).map((slot) => slot.type);
}

export function setFavoriteBeverageSlotAtIndex(
  slots: FavoriteBeverageSlot[],
  slotIndex: number,
  update: Partial<FavoriteBeverageSlot>
) {
  const next = normalizeFavoriteBeverageSlots(slots);
  const safeIndex = Math.max(0, Math.min(2, slotIndex));
  const current = next[safeIndex];
  const nextType = update.type ?? current.type;
  const nextVolume = clampFavoriteVolumeMl(update.volumeMl ?? current.volumeMl);
  const duplicateIndex = next.findIndex(
    (entry, index) => entry.type === nextType && index !== safeIndex
  );

  if (duplicateIndex >= 0) {
    next[duplicateIndex] = { ...next[safeIndex] };
  }

  next[safeIndex] = { type: nextType, volumeMl: nextVolume };
  return normalizeFavoriteBeverageSlots(next);
}

/** @deprecated Use setFavoriteBeverageSlotAtIndex */
export function setFavoriteBeverageAtIndex(
  favorites: BeverageType[],
  slotIndex: number,
  type: BeverageType
) {
  return normalizeFavoriteBeverages(
    setFavoriteBeverageSlotAtIndex(
      normalizeFavoriteBeverageSlots(undefined, favorites),
      slotIndex,
      { type }
    ).map((slot) => slot.type)
  );
}

/** Total net hydration as a percentage of the daily goal (uncapped). */
export function getDailyHydrationPercent(totalNetHydrationMl: number, dailyGoalMl: number) {
  return Math.round((totalNetHydrationMl / Math.max(dailyGoalMl, 1)) * 100);
}

/** Remaining volume toward the daily goal; never negative. */
export function getRemainingHydrationMl(totalNetHydrationMl: number, dailyGoalMl: number) {
  return Math.max(dailyGoalMl - totalNetHydrationMl, 0);
}

/** Progress ratio for ring visuals, capped at 100%. */
export function getDailyHydrationProgressRatio(totalNetHydrationMl: number, dailyGoalMl: number) {
  return Math.min(Math.max(totalNetHydrationMl / Math.max(dailyGoalMl, 1), 0), 1);
}

export function createBeverageLog(type: BeverageType, volumeMl: number, loggedAt: number = Date.now()) {
  return {
    id: `${loggedAt}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    volumeMl,
    netHydrationMl: computeNetHydrationMl(type, volumeMl),
    loggedAt,
  } satisfies BeverageLog;
}

export function applyBeverageIntake(
  state: HydrationState,
  type: BeverageType,
  volumeMl: number,
  dateKey: string = getDateKey()
) {
  const log = createBeverageLog(type, volumeMl);
  const nextDrank = state.drankMl + log.netHydrationMl;
  const effectiveGoalMl = getEffectiveGoalMl(state);
  const reachedGoalNow = state.drankMl < effectiveGoalMl && nextDrank >= effectiveGoalMl;

  return {
    state: {
      ...state,
      drankMl: nextDrank,
      lastIntakeAt: log.loggedAt,
      lastProgressDate: dateKey,
      todayBeverageLogs: [...state.todayBeverageLogs, log],
      streakCount: reachedGoalNow ? state.streakCount + 1 : state.streakCount,
      lastCompletedDate: reachedGoalNow ? dateKey : state.lastCompletedDate,
    } satisfies HydrationState,
    log,
  };
}

export function revertBeverageLog(state: HydrationState, logId: string, dateKey: string = getDateKey()) {
  const log = state.todayBeverageLogs.find((entry) => entry.id === logId);
  if (!log) {
    return state;
  }

  const nextLogs = state.todayBeverageLogs.filter((entry) => entry.id !== logId);
  const nextDrank = Math.max(0, state.drankMl - log.netHydrationMl);
  const effectiveGoalMl = getEffectiveGoalMl(state);
  const hadReachedGoal = state.drankMl >= effectiveGoalMl;
  const stillAtGoal = nextDrank >= effectiveGoalMl;

  let nextStreak = state.streakCount;
  let nextCompletedDate = state.lastCompletedDate;

  if (hadReachedGoal && !stillAtGoal && state.lastCompletedDate === dateKey) {
    nextStreak = Math.max(0, state.streakCount - 1);
    nextCompletedDate = null;
  }

  const lastIntakeAt =
    nextLogs.length > 0 ? nextLogs[nextLogs.length - 1].loggedAt : null;

  return {
    ...state,
    drankMl: nextDrank,
    lastIntakeAt,
    todayBeverageLogs: nextLogs,
    streakCount: nextStreak,
    lastCompletedDate: nextCompletedDate,
  } satisfies HydrationState;
}

export function resetDailyHydrationProgress(state: HydrationState, dateKey: string) {
  if (state.lastProgressDate === dateKey) {
    return state;
  }

  const yesterdayKey = getPreviousDateKey(dateKey);
  let nextStreak = state.streakCount;

  if (
    state.lastCompletedDate &&
    state.lastCompletedDate !== dateKey &&
    state.lastCompletedDate !== yesterdayKey
  ) {
    nextStreak = 0;
  }

  return {
    ...state,
    drankMl: 0,
    lastIntakeAt: null,
    lastProgressDate: dateKey,
    beverageLogHistory: [...(state.beverageLogHistory ?? []), ...state.todayBeverageLogs],
    todayBeverageLogs: [],
    streakCount: nextStreak,
  } satisfies HydrationState;
}
