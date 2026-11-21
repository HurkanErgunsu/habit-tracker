import { BEVERAGES, type BeverageType } from '@/constants/beverages';
import {
  buildCircadianSchedule,
  getPhaseTargetMl,
  isLogInPhase,
  type CircadianPhaseId,
} from '@/utils/circadian-phases';
import type { BeverageLog } from '@/utils/hydration-storage';

export type AnalyticsTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ChartPoint = {
  key: string;
  label: string;
  valueMl: number;
  dayOfMonth?: number;
  completionRatio?: number;
};

export type ChartBarGradient = {
  colors: [string, string];
  locations?: [number, number];
};

export type BeverageDistributionItem = {
  type: BeverageType;
  label: string;
  emoji: string;
  volumeMl: number;
  percent: number;
};

export type PhaseDistributionItem = {
  id: CircadianPhaseId;
  title: string;
  emoji: string;
  intakeMl: number;
  percent: number;
  targetMl: number;
};

export const ANALYTICS_TIMEFRAMES: AnalyticsTimeframe[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

export const MONTHLY_X_AXIS_LABELS = ['1', '8', '15', '22', '29'] as const;
export const MONTHLY_X_AXIS_LABEL_DAYS = [1, 8, 15, 22, 29] as const;

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getTimeframeRange(
  timeframe: AnalyticsTimeframe,
  anchor: Date = new Date()
): { startMs: number; endMs: number } {
  switch (timeframe) {
    case 'daily': {
      const start = startOfDay(anchor);
      const end = endOfDay(anchor);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    case 'weekly': {
      const end = endOfDay(anchor);
      const start = startOfDay(anchor);
      start.setDate(start.getDate() - 6);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    case 'monthly': {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    case 'yearly': {
      const start = new Date(anchor.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    default:
      return { startMs: 0, endMs: 0 };
  }
}

export function shiftPeriodAnchor(
  timeframe: AnalyticsTimeframe,
  anchor: Date,
  direction: -1 | 1
): Date {
  const next = new Date(anchor);

  switch (timeframe) {
    case 'daily':
      next.setDate(next.getDate() + direction);
      break;
    case 'weekly':
      next.setDate(next.getDate() + direction * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + direction, 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + direction, 0, 1);
      break;
  }

  return next;
}

export function canNavigateForward(
  timeframe: AnalyticsTimeframe,
  anchor: Date,
  now: Date = new Date()
) {
  const nextAnchor = shiftPeriodAnchor(timeframe, anchor, 1);
  const { startMs: nextStart } = getTimeframeRange(timeframe, nextAnchor);
  const { startMs: currentStart } = getTimeframeRange(timeframe, now);
  return nextStart <= currentStart;
}

export function formatPeriodTitle(
  timeframe: AnalyticsTimeframe,
  anchor: Date,
  now: Date = new Date(),
  options?: { locale?: string; todayLabel?: string }
) {
  const locale = options?.locale;
  switch (timeframe) {
    case 'daily': {
      if (startOfDay(anchor).getTime() === startOfDay(now).getTime()) {
        return options?.todayLabel ?? 'Today';
      }
      return anchor.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    case 'weekly': {
      const { startMs, endMs } = getTimeframeRange('weekly', anchor);
      const start = new Date(startMs);
      const end = new Date(endMs);
      const startLabel = start.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const endLabel = end.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startLabel} - ${endLabel}`;
    }
    case 'monthly':
      return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    case 'yearly':
      return String(anchor.getFullYear());
    default:
      return '';
  }
}

export function filterLogsInTimeframe(
  logs: BeverageLog[],
  timeframe: AnalyticsTimeframe,
  anchor: Date = new Date()
) {
  const { startMs, endMs } = getTimeframeRange(timeframe, anchor);
  return logs.filter((log) => log.loggedAt >= startMs && log.loggedAt <= endMs);
}

export function getTotalNetHydrationMl(logs: BeverageLog[]) {
  return logs.reduce((sum, log) => sum + log.netHydrationMl, 0);
}

export function formatVolumeMl(volumeMl: number, locale?: string) {
  return `${volumeMl.toLocaleString(locale)} ml`;
}

function formatHourLabel(date: Date, locale?: string) {
  return date.toLocaleTimeString(locale, { hour: 'numeric' });
}

function formatWeekdayLabel(date: Date, locale?: string) {
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

function formatMonthLabel(date: Date, locale?: string) {
  return date.toLocaleDateString(locale, { month: 'short' });
}

function sumLogsNetMl(logs: BeverageLog[], startMs: number, endMs: number) {
  return logs.reduce((sum, log) => {
    if (log.loggedAt >= startMs && log.loggedAt <= endMs) {
      return sum + log.netHydrationMl;
    }
    return sum;
  }, 0);
}

function getDaysInMonth(anchor: Date) {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
}

export function getHydrationBarGradient(
  completionRatio: number,
  hasData: boolean
): ChartBarGradient {
  if (!hasData) {
    return { colors: ['#E8EAED', '#E2E8F0'] };
  }

  const ratio = Math.min(Math.max(completionRatio, 0), 1);

  if (ratio < 0.34) {
    return { colors: ['#BFDBFE', '#93C5FD'] };
  }
  if (ratio < 0.67) {
    return { colors: ['#6BC4F5', '#2F8FE8'] };
  }
  if (ratio < 1) {
    return { colors: ['#2F8FE8', '#1A74D0'] };
  }

  return { colors: ['#1A74D0', '#0B4F8C'] };
}

export function buildHydrationChartPoints(
  logs: BeverageLog[],
  timeframe: AnalyticsTimeframe,
  anchor: Date = new Date(),
  dailyGoalMl: number = 2800,
  locale?: string
): ChartPoint[] {
  switch (timeframe) {
    case 'daily': {
      const dayStart = startOfDay(anchor);
      return Array.from({ length: 6 }, (_, index) => {
        const bucketStart = new Date(dayStart);
        bucketStart.setHours(index * 4, 0, 0, 0);
        const bucketStartMs = bucketStart.getTime();
        const bucketEndMs = bucketStartMs + 4 * 60 * 60 * 1000 - 1;
        return {
          key: `hour-${index}`,
          label: formatHourLabel(bucketStart, locale),
          valueMl: sumLogsNetMl(logs, bucketStartMs, bucketEndMs),
        };
      });
    }
    case 'weekly': {
      const endDay = startOfDay(anchor);
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(endDay);
        day.setDate(endDay.getDate() - (6 - index));
        const dayEnd = endOfDay(day);
        return {
          key: `day-${index}`,
          label: formatWeekdayLabel(day, locale),
          valueMl: sumLogsNetMl(logs, day.getTime(), dayEnd.getTime()),
        };
      });
    }
    case 'monthly': {
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const daysInMonth = getDaysInMonth(anchor);
      const labelDaySet = new Set(
        MONTHLY_X_AXIS_LABEL_DAYS.filter((day) => day <= daysInMonth)
      );

      return Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const bucketStart = new Date(year, month, day, 0, 0, 0, 0);
        const bucketEnd = endOfDay(bucketStart);
        const valueMl = sumLogsNetMl(logs, bucketStart.getTime(), bucketEnd.getTime());
        const completionRatio = dailyGoalMl > 0 ? valueMl / dailyGoalMl : 0;

        return {
          key: `day-${day}`,
          label: labelDaySet.has(day) ? String(day) : '',
          dayOfMonth: day,
          valueMl,
          completionRatio,
        };
      });
    }
    case 'yearly': {
      const year = anchor.getFullYear();

      return Array.from({ length: 12 }, (_, index) => {
        const monthStart = new Date(year, index, 1, 0, 0, 0, 0);
        const monthEnd = new Date(year, index + 1, 0, 23, 59, 59, 999);
        return {
          key: `month-${index}`,
          label: formatMonthLabel(monthStart, locale),
          valueMl: sumLogsNetMl(logs, monthStart.getTime(), monthEnd.getTime()),
        };
      });
    }
    default:
      return [];
  }
}

export function buildBeverageDistribution(logs: BeverageLog[]): BeverageDistributionItem[] {
  const totals = Object.fromEntries(
    BEVERAGES.map((beverage) => [beverage.type, 0])
  ) as Record<BeverageType, number>;

  for (const log of logs) {
    totals[log.type] += log.volumeMl;
  }

  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return BEVERAGES.filter((beverage) => totals[beverage.type] > 0)
    .map((beverage) => ({
      type: beverage.type,
      label: beverage.label,
      emoji: beverage.emoji,
      volumeMl: totals[beverage.type],
      percent: grandTotal > 0 ? Math.round((totals[beverage.type] / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.volumeMl - a.volumeMl);
}

function getPhaseIntakeForLogs(
  logs: BeverageLog[],
  phaseId: CircadianPhaseId,
  wakeTime: string,
  sleepTime: string
) {
  return logs.reduce((total, log) => {
    const schedule = buildCircadianSchedule(wakeTime, sleepTime, new Date(log.loggedAt));
    const phase = schedule.phases.find((entry) => entry.id === phaseId);
    if (!phase || !isLogInPhase(log.loggedAt, phase)) {
      return total;
    }
    return total + log.netHydrationMl;
  }, 0);
}

function getDaysInTimeframe(timeframe: AnalyticsTimeframe, anchor: Date) {
  switch (timeframe) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return getDaysInMonth(anchor);
    case 'yearly': {
      const year = anchor.getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    }
    default:
      return 1;
  }
}

export function buildPhaseDistribution(
  logs: BeverageLog[],
  timeframe: AnalyticsTimeframe,
  dailyGoalMl: number,
  wakeTime: string,
  sleepTime: string,
  anchor: Date = new Date()
): PhaseDistributionItem[] {
  const schedule = buildCircadianSchedule(wakeTime, sleepTime, anchor);
  const daysInRange = getDaysInTimeframe(timeframe, anchor);
  const totalIntake = getTotalNetHydrationMl(logs);

  return schedule.phases.map((phase) => {
    const intakeMl = getPhaseIntakeForLogs(logs, phase.id, wakeTime, sleepTime);
    const targetMl = getPhaseTargetMl(dailyGoalMl, phase) * daysInRange;
    const percent = totalIntake > 0 ? Math.round((intakeMl / totalIntake) * 100) : 0;

    return {
      id: phase.id,
      title: phase.title,
      emoji: phase.emoji,
      intakeMl,
      percent,
      targetMl,
    };
  });
}
