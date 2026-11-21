import { CIRCADIAN_INTAKE_WEIGHTS } from '@/src/domains/hydration';
import type { BeverageLog } from '@/utils/hydration-storage';
import { parseTimeToMinutes } from '@/utils/onboarding-goal-math';

export type CircadianPhaseId = 'morning' | 'afternoon' | 'evening';

/** Fraction of total awake time allocated to each block. */
const AWAKE_TIME_WEIGHTS = {
  morning: 0.35,
  afternoon: 0.4,
  evening: 0.25,
} as const;

/** Fraction of daily hydration target allocated to each block. */
const INTAKE_TARGET_WEIGHTS = CIRCADIAN_INTAKE_WEIGHTS;

const PHASE_METADATA: Record<
  CircadianPhaseId,
  { title: string; subtitle: string; emoji: string }
> = {
  morning: { title: 'Morning', subtitle: 'Reset & Hydrate', emoji: '🌅' },
  afternoon: { title: 'Afternoon', subtitle: 'Focus & Performance', emoji: '☀️' },
  evening: { title: 'Evening', subtitle: 'Wind-down & Balance', emoji: '🌙' },
};

export type CircadianPhase = {
  id: CircadianPhaseId;
  title: string;
  subtitle: string;
  emoji: string;
  /** Share of the daily hydration goal for this block. */
  goalWeight: number;
  /** Inclusive block start (epoch ms). */
  startMs: number;
  /** Exclusive block end (epoch ms). */
  endMs: number;
};

export type CircadianSchedule = {
  wakeTime: string;
  sleepTime: string;
  awakeMinutes: number;
  phases: CircadianPhase[];
};

export function getAwakeDurationMinutes(wakeTime: string, sleepTime: string) {
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  const sleepMinutes = parseTimeToMinutes(sleepTime);

  if (sleepMinutes > wakeMinutes) {
    return sleepMinutes - wakeMinutes;
  }

  return 24 * 60 - wakeMinutes + sleepMinutes;
}

function setMinutesOnDate(date: Date, totalMinutes: number) {
  const next = new Date(date);
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  next.setHours(Math.floor(normalized / 60), normalized % 60, 0, 0);
  return next;
}

function getSleepInstant(wakeInstant: Date, wakeTime: string, sleepTime: string) {
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  const sleepMinutes = parseTimeToMinutes(sleepTime);
  const sleepDate = new Date(wakeInstant);

  if (sleepMinutes > wakeMinutes) {
    return setMinutesOnDate(sleepDate, sleepMinutes);
  }

  sleepDate.setDate(sleepDate.getDate() + 1);
  return setMinutesOnDate(sleepDate, sleepMinutes);
}

function resolveCycleWakeInstant(reference: Date, wakeTime: string, sleepTime: string) {
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  const refMs = reference.getTime();

  for (const dayOffset of [-1, 0]) {
    const candidateDate = new Date(reference);
    candidateDate.setDate(candidateDate.getDate() + dayOffset);
    const wakeInstant = setMinutesOnDate(candidateDate, wakeMinutes);
    const sleepInstant = getSleepInstant(wakeInstant, wakeTime, sleepTime);

    if (refMs >= wakeInstant.getTime() && refMs < sleepInstant.getTime()) {
      return wakeInstant;
    }
  }

  const wakeToday = setMinutesOnDate(reference, wakeMinutes);
  if (refMs < wakeToday.getTime()) {
    return wakeToday;
  }

  return wakeToday;
}

export function buildCircadianSchedule(
  wakeTime: string,
  sleepTime: string,
  referenceDate: Date = new Date()
): CircadianSchedule {
  const awakeMinutes = getAwakeDurationMinutes(wakeTime, sleepTime);
  const wakeInstant = resolveCycleWakeInstant(referenceDate, wakeTime, sleepTime);
  const wakeMs = wakeInstant.getTime();

  const morningMinutes = awakeMinutes * AWAKE_TIME_WEIGHTS.morning;
  const afternoonMinutes = awakeMinutes * AWAKE_TIME_WEIGHTS.afternoon;
  const eveningMinutes = awakeMinutes * AWAKE_TIME_WEIGHTS.evening;

  const morningStartMs = wakeMs;
  const morningEndMs = morningStartMs + morningMinutes * 60_000;
  const afternoonEndMs = morningEndMs + afternoonMinutes * 60_000;
  const eveningEndMs = afternoonEndMs + eveningMinutes * 60_000;

  const phaseWindows: Array<{ id: CircadianPhaseId; startMs: number; endMs: number }> = [
    { id: 'morning', startMs: morningStartMs, endMs: morningEndMs },
    { id: 'afternoon', startMs: morningEndMs, endMs: afternoonEndMs },
    { id: 'evening', startMs: afternoonEndMs, endMs: eveningEndMs },
  ];

  const phases = phaseWindows.map((window) => ({
    id: window.id,
    ...PHASE_METADATA[window.id],
    goalWeight: INTAKE_TARGET_WEIGHTS[window.id],
    startMs: window.startMs,
    endMs: window.endMs,
  }));

  return {
    wakeTime,
    sleepTime,
    awakeMinutes,
    phases,
  };
}

export function getCurrentCircadianPhase(
  wakeTime: string,
  sleepTime: string,
  date: Date = new Date()
): CircadianPhase {
  const schedule = buildCircadianSchedule(wakeTime, sleepTime, date);
  const now = date.getTime();

  const activePhase = schedule.phases.find(
    (phase) => now >= phase.startMs && now < phase.endMs
  );
  if (activePhase) {
    return activePhase;
  }

  if (now < schedule.phases[0].startMs) {
    return schedule.phases[0];
  }

  return schedule.phases[schedule.phases.length - 1];
}

export function formatPhaseClock(timestampMs: number) {
  const date = new Date(timestampMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatPhaseTimeRange(phase: CircadianPhase) {
  return `${formatPhaseClock(phase.startMs)} – ${formatPhaseClock(phase.endMs)}`;
}

export function getNextCircadianPhase(phases: CircadianPhase[], current: CircadianPhase) {
  const index = phases.findIndex((phase) => phase.id === current.id);
  if (index < 0 || index >= phases.length - 1) {
    return null;
  }
  return phases[index + 1];
}

export function getPhaseRemainingMinutes(phase: CircadianPhase, nowMs: number = Date.now()) {
  return Math.max(0, Math.round((phase.endMs - nowMs) / 60_000));
}

export function getPhaseTargetMl(dailyGoalMl: number, phase: CircadianPhase) {
  return Math.round(dailyGoalMl * phase.goalWeight);
}

export function getPhaseIntakeMl(logs: BeverageLog[], phase: CircadianPhase) {
  return logs.reduce((total, log) => {
    if (isLogInPhase(log.loggedAt, phase)) {
      return total + log.netHydrationMl;
    }
    return total;
  }, 0);
}

export function isLogInPhase(loggedAtMs: number, phase: CircadianPhase) {
  return loggedAtMs >= phase.startMs && loggedAtMs < phase.endMs;
}

export function resolvePhaseFromSchedule(
  schedule: CircadianSchedule,
  phaseId: CircadianPhaseId
) {
  return schedule.phases.find((phase) => phase.id === phaseId) ?? schedule.phases[0];
}

export function getPhaseProgressRatio(intakeMl: number, targetMl: number) {
  if (targetMl <= 0) {
    return 0;
  }
  return Math.min(Math.max(intakeMl / targetMl, 0), 1);
}

export function getLogsInPhase(logs: BeverageLog[], phase: CircadianPhase) {
  return logs.filter((log) => isLogInPhase(log.loggedAt, phase));
}
