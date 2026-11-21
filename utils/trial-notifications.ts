import * as Notifications from 'expo-notifications';

import type { TrialStatus } from '@/src/services/revenuecat/trial';
import { fill } from '@/utils/i18n';
import { getStoredAppStrings } from '@/utils/i18n/load';

export const TRIAL_DAILY_NOTIFICATION_KEY = 'trial-daily-reminder';
export const TRIAL_NOTIFICATION_OPEN = 'trial_sheet';

export type TrialReminderDays = 1 | 2;

function parseWakeTime(wakeTime: string) {
  const [hourRaw, minuteRaw] = wakeTime.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 7,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

function normalizeReminderDays(value: number | null | undefined): TrialReminderDays {
  return value === 2 ? 2 : 1;
}

async function cancelByKey(key: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matches = scheduled.filter((item) => item.content.data?.key === key);
  await Promise.all(
    matches.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function cancelTrialDailyNotifications() {
  await cancelByKey(TRIAL_DAILY_NOTIFICATION_KEY);
}

export function isWithinTrialReminderWindow(
  daysRemaining: number,
  reminderDays: number | null | undefined
) {
  const window = normalizeReminderDays(reminderDays);
  return daysRemaining > 0 && daysRemaining <= window;
}

/**
 * Schedules wake-time pushes only for the last N trial days
 * (N = paywall reminder selection: 1 or 2).
 */
export async function scheduleTrialDailyNotifications(
  wakeTime: string,
  trial: Pick<TrialStatus, 'isTrial' | 'daysRemaining' | 'expiresAt'>,
  reminderDays: number | null | undefined
) {
  await cancelTrialDailyNotifications();

  const windowDays = normalizeReminderDays(reminderDays);
  if (!trial.isTrial || !trial.expiresAt || trial.daysRemaining <= 0) {
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  const t = await getStoredAppStrings();
  const { hour, minute } = parseWakeTime(wakeTime);
  const now = Date.now();

  for (let daysBeforeEnd = windowDays; daysBeforeEnd >= 1; daysBeforeEnd -= 1) {
    const fireDate = new Date(trial.expiresAt);
    fireDate.setDate(fireDate.getDate() - daysBeforeEnd);
    fireDate.setHours(hour, minute, 0, 0);

    if (fireDate.getTime() <= now) {
      continue;
    }

    const daysLeftAtFire = Math.max(1, daysBeforeEnd);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t.notifications.trialTitle,
          body: fill(t.notifications.trialBody, { days: daysLeftAtFire }),
          data: {
            key: TRIAL_DAILY_NOTIFICATION_KEY,
            open: TRIAL_NOTIFICATION_OPEN,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
        },
      });
    } catch (error) {
      console.warn('Failed to schedule trial reminder notification', error);
    }
  }
}

export function isTrialNotificationResponse(
  data: Record<string, unknown> | undefined | null
): boolean {
  if (!data) return false;
  return data.key === TRIAL_DAILY_NOTIFICATION_KEY || data.open === TRIAL_NOTIFICATION_OPEN;
}

export { normalizeReminderDays };
