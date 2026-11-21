import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_HYDRATION_METRICS,
  type ActivityLevel,
  type ClimateZone,
} from '@/src/domains/hydration';
import type { GenderOption } from '@/utils/hydration-storage';
import { getRecommendedMl } from '@/utils/onboarding-goal-math';

export type OnboardingDraft = {
  gender: GenderOption | null;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  climate: ClimateZone;
  wakeTime: string;
  sleepTime: string;
  goalMl: number;
};

type OnboardingContextValue = {
  draft: OnboardingDraft;
  setGender: (gender: GenderOption) => void;
  setWeightKg: (weightKg: number) => void;
  setHeightCm: (heightCm: number) => void;
  setAge: (age: number) => void;
  setActivityLevel: (activityLevel: ActivityLevel) => void;
  setClimate: (climate: ClimateZone) => void;
  setWakeTime: (wakeTime: string) => void;
  setSleepTime: (sleepTime: string) => void;
  setGoalMl: (goalMl: number) => void;
  recommendedMl: number;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  gender: null,
  weightKg: 70,
  heightCm: 170,
  age: 28,
  activityLevel: DEFAULT_HYDRATION_METRICS.activityLevel,
  climate: DEFAULT_HYDRATION_METRICS.climate,
  wakeTime: '07:00',
  sleepTime: '23:00',
  goalMl: 2800,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const recommendedMl = useMemo(
    () =>
      getRecommendedMl({
        gender: draft.gender,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        age: draft.age,
        activityLevel: draft.activityLevel,
        climate: draft.climate,
      }),
    [draft.gender, draft.weightKg, draft.heightCm, draft.age, draft.activityLevel, draft.climate]
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      recommendedMl,
      setGender: (gender) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, gender };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setWeightKg: (weightKg) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, weightKg };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setHeightCm: (heightCm) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, heightCm };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setAge: (age) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, age };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setActivityLevel: (activityLevel) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, activityLevel };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setClimate: (climate) =>
        setDraft((prev) => {
          const prevRecommended = getRecommendedMl(prev);
          const next = { ...prev, climate };
          const nextRecommended = getRecommendedMl(next);
          const shouldSyncGoal = prev.goalMl === prevRecommended;
          return {
            ...next,
            goalMl: shouldSyncGoal ? nextRecommended : prev.goalMl,
          };
        }),
      setWakeTime: (wakeTime) => setDraft((prev) => ({ ...prev, wakeTime })),
      setSleepTime: (sleepTime) => setDraft((prev) => ({ ...prev, sleepTime })),
      setGoalMl: (goalMl) => setDraft((prev) => ({ ...prev, goalMl })),
    }),
    [draft, recommendedMl]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
