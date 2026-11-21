import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN =
  process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? process.env.MIXPANEL_TOKEN ?? 'YOUR_MIXPANEL_TOKEN';

// Must match project data residency (eu.mixpanel.com → api-eu.mixpanel.com).
const MIXPANEL_SERVER_URL =
  process.env.EXPO_PUBLIC_MIXPANEL_SERVER_URL ?? 'https://api-eu.mixpanel.com';

let mixpanel: Mixpanel | null = null;
let initPromise: Promise<Mixpanel | null> | null = null;

export async function initMixpanel(): Promise<Mixpanel | null> {
  if (mixpanel) {
    return mixpanel;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!MIXPANEL_TOKEN || MIXPANEL_TOKEN === 'YOUR_MIXPANEL_TOKEN') {
      console.warn('[Mixpanel] Missing token. Set EXPO_PUBLIC_MIXPANEL_TOKEN in .env');
      return null;
    }

    // Expo / JS mode: avoid native module bridge.
    const instance = new Mixpanel(MIXPANEL_TOKEN, false, false);
    await instance.init(false, {}, MIXPANEL_SERVER_URL);
    mixpanel = instance;
    return mixpanel;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const instance = await initMixpanel();
  if (!instance) return;
  instance.track(eventName, properties);
}

export async function identifyUser(userId: string): Promise<void> {
  const instance = await initMixpanel();
  if (!instance) return;
  instance.identify(userId);
}
