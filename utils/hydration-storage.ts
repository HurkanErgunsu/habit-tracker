import AsyncStorage from '@react-native-async-storage/async-storage';

const HYDRATION_STORAGE_KEY = 'water-tracker-state-v1';

export type HydrationState = {
  weightKg: number;
  goalMl: number;
  recommendedMl: number;
  drankMl: number;
  lastIntakeAt: number | null;
  streakCount: number;
  lastCompletedDate: string | null;
  lastProgressDate: string | null;
};

export const DEFAULT_HYDRATION_STATE: HydrationState = {
  weightKg: 70,
  goalMl: 2450,
  recommendedMl: 2450,
  drankMl: 0,
  lastIntakeAt: null,
  streakCount: 0,
  lastCompletedDate: null,
  lastProgressDate: null,
};

export function getDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getPreviousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return getDateKey(date);
}

export async function loadHydrationState() {
  try {
    const rawValue = await AsyncStorage.getItem(HYDRATION_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_HYDRATION_STATE;
    }

    const parsed = JSON.parse(rawValue) as Partial<HydrationState>;
    return {
      ...DEFAULT_HYDRATION_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_HYDRATION_STATE;
  }
}

export async function saveHydrationState(state: HydrationState) {
  await AsyncStorage.setItem(HYDRATION_STORAGE_KEY, JSON.stringify(state));
}
