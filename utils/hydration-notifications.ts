import * as Notifications from 'expo-notifications';

const SMART_REMINDER_KEY = 'smart-hydration-reminder';
const DAILY_SUMMARY_KEY = 'daily-hydration-summary';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const LEVEL_25_MESSAGES = [
  "Hey! You've had a slow start today. Let's aim for a few more glasses before bedtime! 🥤",
  "Still plenty of time to reach your goal! Don't give up, let's hydrate! 💦",
];

const LEVEL_50_MESSAGES = [
  "Halfway there! You're doing great, but let's push for more! 🎯",
  "You've made it halfway! Keep that water bottle close! 💧✨",
];

const LEVEL_75_MESSAGES = [
  "Amazing! You're so close to your goal! Just a little bit more! 🚀",
  "Fantastic progress! A few more sips and you've nailed it! 🌟",
];

const LEVEL_100_MESSAGES = [
  'You crushed it! Goal achieved, hydration master! 🏆🔥',
  'Perfect day! Your body loves you for this! Amazing job! 🎉',
];

function pickRandom(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getDailySummaryMessage(percentage: number) {
  if (percentage >= 100) {
    return pickRandom(LEVEL_100_MESSAGES);
  }
  if (percentage >= 75) {
    return pickRandom(LEVEL_75_MESSAGES);
  }
  if (percentage >= 50) {
    return pickRandom(LEVEL_50_MESSAGES);
  }
  return pickRandom(LEVEL_25_MESSAGES);
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

  const now = Date.now();
  const baseTime = lastIntakeAt ?? now;
  const triggerDate = new Date(baseTime + TWO_HOURS_MS);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hydration Check-In',
      body: 'Time for a hydration break! 💧',
      data: { key: SMART_REMINDER_KEY },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function scheduleDailySummaryNotification(percentage: number) {
  await cancelByKey(DAILY_SUMMARY_KEY);

  const now = new Date();
  const triggerDate = new Date(now);
  triggerDate.setHours(20, 30, 0, 0);
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hydration Summary',
      body: getDailySummaryMessage(percentage),
      data: { key: DAILY_SUMMARY_KEY },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}
