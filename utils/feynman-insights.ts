import type { BeverageType } from '@/constants/beverages';
import { BEVERAGE_BY_TYPE } from '@/constants/beverages';
import { fill, type AppStrings } from '@/utils/i18n';
import type { BeverageLog } from '@/utils/hydration-storage';
import {
  getPhaseIntakeMl,
  getPhaseProgressRatio,
  getPhaseTargetMl,
  type CircadianPhase,
} from '@/utils/circadian-phases';

type ProgressBand = 'behind' | 'onTrack';

export type CircadianInsight = {
  preface: string;
  emphasis: string;
  tone: ProgressBand;
};

function getProgressBand(progressRatio: number): ProgressBand {
  return progressRatio < 0.65 ? 'behind' : 'onTrack';
}

function getLastBeverageLog(logs: BeverageLog[]): BeverageLog | null {
  if (logs.length === 0) {
    return null;
  }

  return logs[logs.length - 1];
}

function asList(value: string | readonly string[]): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  return [...value];
}

/** Stable pick so the same context doesn't flicker, but variants rotate by day/logs. */
function pickVariant(variants: string[], seed: string): string {
  const list = variants.filter((item) => item.trim().length > 0);
  if (list.length === 0) {
    return '';
  }
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return list[Math.abs(hash) % list.length] ?? list[0];
}

function getBeverageSentence(lastLog: BeverageLog | null, t: AppStrings, seed: string): string {
  if (!lastLog) {
    return pickVariant(asList(t.insights.defaultWater), `${seed}|default`);
  }

  const beverage = BEVERAGE_BY_TYPE[lastLog.type];
  const factor = `${beverage.hydrationFactor}×`;
  const drink = t.beverages[lastLog.type]?.label ?? beverage.label;

  const byType: Partial<Record<BeverageType, string | readonly string[]>> = {
    water: t.insights.lastWater,
    coffee: t.insights.lastCoffee,
    tea: t.insights.lastTea,
    sparkling: t.insights.lastSparkling,
    alcohol: t.insights.lastAlcohol,
    beer: t.insights.lastBeer,
    wine: t.insights.lastWine,
  };

  const template = pickVariant(
    asList(byType[lastLog.type] ?? t.insights.lastGeneric),
    `${seed}|bev|${lastLog.type}`
  );
  return fill(template, { factor, drink });
}

export function getCircadianInsight(
  phase: CircadianPhase,
  logs: BeverageLog[],
  dailyGoalMl: number,
  t: AppStrings,
  dateKey?: string
): CircadianInsight {
  const blockIntakeMl = getPhaseIntakeMl(logs, phase);
  const blockTargetMl = getPhaseTargetMl(dailyGoalMl, phase);
  const progressRatio = getPhaseProgressRatio(blockIntakeMl, blockTargetMl);
  const progressBand = getProgressBand(progressRatio);
  const lastLog = getLastBeverageLog(logs);
  const day = dateKey ?? new Date().toISOString().slice(0, 10);
  const seed = [
    day,
    phase.id,
    progressBand,
    lastLog?.id ?? 'none',
    String(logs.length),
    String(Math.round(progressRatio * 10)),
  ].join('|');

  const physiologyPool = {
    morning: t.insights.physiologyMorning,
    afternoon: t.insights.physiologyAfternoon,
    evening: t.insights.physiologyEvening,
  }[phase.id];

  const emphasisPool = {
    morning: {
      behind: t.insights.behindMorning,
      onTrack: t.insights.onTrackMorning,
    },
    afternoon: {
      behind: t.insights.behindAfternoon,
      onTrack: t.insights.onTrackAfternoon,
    },
    evening: {
      behind: t.insights.behindEvening,
      onTrack: t.insights.onTrackEvening,
    },
  }[phase.id][progressBand];

  const physiology = pickVariant(asList(physiologyPool), `${seed}|phys`);
  const emphasis = pickVariant(asList(emphasisPool), `${seed}|emph`);
  const beverageSentence = getBeverageSentence(lastLog, t, seed);

  return {
    preface: [physiology, beverageSentence].filter(Boolean).join(' '),
    emphasis,
    tone: progressBand,
  };
}
