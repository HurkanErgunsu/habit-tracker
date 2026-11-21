import * as Notifications from 'expo-notifications';

import { getStoredAppStrings } from '@/utils/i18n/load';

const SMART_REMINDER_KEY = 'smart-hydration-reminder';
const DAILY_SUMMARY_KEY = 'daily-hydration-summary';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MIN_TRIGGER_DELAY_MS = 60 * 1000;

function toFutureTriggerDate(targetMs: number) {
  return new Date(Math.max(targetMs, Date.now() + MIN_TRIGGER_DELAY_MS));
}

async function scheduleDateNotification(
  key: string,
  title: string,
  body: string,
  triggerDate: Date
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { key },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch (error) {
    console.warn(`Failed to schedule ${key} notification`, error);
  }
}

function pickRandom(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export async function getDailySummaryMessage(percentage: number) {
  const t = await getStoredAppStrings();
  const pool =
    percentage >= 100
      ? t.notifications.level100
      : percentage >= 75
        ? t.notifications.level75
        : percentage >= 50
          ? t.notifications.level50
          : t.notifications.level25;
  return pickRandom(pool);
}

export async function requestHydrationNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  let nextStatus = status;
  if (nextStatus !== 'granted') {
    const requestResult = await Notifications.requestPermissionsAsync();
    nextStatus = requestResult.status;
  }
  return nextStatus === 'granted';
}

async function cancelByKey(key: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matches = scheduled.filter((item) => item.content.data?.key === key);
  await Promise.all(matches.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

export async function scheduleSmartHydrationReminder(lastIntakeAt: number | null) {
  await cancelByKey(SMART_REMINDER_KEY);
  const t = await getStoredAppStrings();

  const now = Date.now();
  const baseTime = lastIntakeAt ?? now;
  const triggerDate = toFutureTriggerDate(baseTime + TWO_HOURS_MS);

  await scheduleDateNotification(
    SMART_REMINDER_KEY,
    t.notifications.reminderTitle,
    t.notifications.reminderBody,
    triggerDate
  );
}

export async function scheduleDailySummaryNotification(percentage: number) {
  await cancelByKey(DAILY_SUMMARY_KEY);
  const t = await getStoredAppStrings();

  const now = new Date();
  const triggerDate = new Date(now);
  triggerDate.setHours(20, 30, 0, 0);
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const safeTriggerDate = toFutureTriggerDate(triggerDate.getTime());

  await scheduleDateNotification(
    DAILY_SUMMARY_KEY,
    t.notifications.summaryTitle,
    await getDailySummaryMessage(percentage),
    safeTriggerDate
  );
}
