import * as Notifications from 'expo-notifications';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useHydrationFab } from '@/components/home/hydration-fab';
import { TrialReminderBanner } from '@/components/trial/trial-reminder-banner';
import { TrialReminderSheet } from '@/components/trial/trial-reminder-sheet';
import { useAppStrings } from '@/hooks/use-app-strings';
import { usePaywallCatalog } from '@/src/services/revenuecat/hooks/usePaywallCatalog';
import { openManageSubscriptions } from '@/src/services/revenuecat/manage-subscription';
import { getTrialStatus, type TrialStatus } from '@/src/services/revenuecat/trial';
import { loadHydrationState } from '@/utils/hydration-storage';
import { fill } from '@/utils/i18n';
import {
  cancelTrialDailyNotifications,
  isTrialNotificationResponse,
  isWithinTrialReminderWindow,
  normalizeReminderDays,
  scheduleTrialDailyNotifications,
  type TrialReminderDays,
} from '@/utils/trial-notifications';
import {
  dismissTrialBannerForToday,
  isTrialBannerDismissedToday,
} from '@/utils/trial-reminder-storage';

type TrialReminderContextValue = {
  trial: TrialStatus;
  reminderDays: TrialReminderDays;
  refresh: () => Promise<void>;
  openSheet: () => void;
};

const TrialReminderContext = createContext<TrialReminderContextValue | null>(null);

let pendingOpenSheetFromNotification = false;

export function consumePendingTrialSheetOpen() {
  const pending = pendingOpenSheetFromNotification;
  pendingOpenSheetFromNotification = false;
  return pending;
}

export function markPendingTrialSheetOpen() {
  pendingOpenSheetFromNotification = true;
}

function formatExpiresLabel(expiresAt: number | null, localeTag: string) {
  if (!expiresAt) return '—';
  try {
    return new Intl.DateTimeFormat(localeTag, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(expiresAt));
  } catch {
    const date = new Date(expiresAt);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${date.getFullYear()}`;
  }
}

export function TrialReminderProvider({ children }: { children: React.ReactNode }) {
  const t = useAppStrings();
  const { catalog } = usePaywallCatalog();
  const { setHideFab, closeBottomSheet } = useHydrationFab();
  const [trial, setTrial] = useState<TrialStatus>({
    isTrial: false,
    expiresAt: null,
    daysRemaining: 0,
    productIdentifier: null,
    planId: 'unknown',
    willRenew: false,
    managementURL: null,
  });
  const [reminderDays, setReminderDays] = useState<TrialReminderDays>(1);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const openedFromNotificationRef = useRef(false);
  const sheetVisibleRef = useRef(false);
  const handledResponseIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextTrial, hydration] = await Promise.all([getTrialStatus(), loadHydrationState()]);
    const nextReminderDays = normalizeReminderDays(hydration.trialReminderDays);
    setTrial(nextTrial);
    setReminderDays(nextReminderDays);

    if (nextTrial.isTrial) {
      await scheduleTrialDailyNotifications(
        hydration.wakeTime || '07:00',
        nextTrial,
        nextReminderDays
      );
    } else {
      await cancelTrialDailyNotifications();
    }

    const inWindow =
      nextTrial.isTrial && isWithinTrialReminderWindow(nextTrial.daysRemaining, nextReminderDays);

    const openFromNotification = consumePendingTrialSheetOpen();
    if (openFromNotification && inWindow) {
      openedFromNotificationRef.current = true;
      setSheetVisible(true);
      sheetVisibleRef.current = true;
      closeBottomSheet();
      setHideFab(true);
    }

    if (!inWindow) {
      setBannerVisible(false);
      return;
    }

    const dismissed = await isTrialBannerDismissedToday();
    if (!dismissed) {
      setBannerVisible(true);
    }
  }, [closeBottomSheet, setHideFab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    const openFromNotification = (responseId: string | undefined) => {
      if (responseId && handledResponseIdRef.current === responseId) return;
      if (responseId) handledResponseIdRef.current = responseId;
      markPendingTrialSheetOpen();
      openedFromNotificationRef.current = true;
      setSheetVisible(true);
      sheetVisibleRef.current = true;
      closeBottomSheet();
      setHideFab(true);
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (!isTrialNotificationResponse(data)) return;
      openFromNotification(response.notification.request.identifier);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (!response || !isTrialNotificationResponse(data)) return;
      openFromNotification(response.notification.request.identifier);
    });

    return () => responseSub.remove();
  }, [closeBottomSheet, setHideFab]);

  const openSheet = useCallback(() => {
    setSheetVisible(true);
    sheetVisibleRef.current = true;
    closeBottomSheet();
    setHideFab(true);
  }, [closeBottomSheet, setHideFab]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    sheetVisibleRef.current = false;
    openedFromNotificationRef.current = false;
    setHideFab(false);
  }, [setHideFab]);

  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    void dismissTrialBannerForToday();
  }, []);

  const handleManage = useCallback(() => {
    void openManageSubscriptions();
  }, []);

  const inWindow = isWithinTrialReminderWindow(trial.daysRemaining, reminderDays);
  const planLabel =
    trial.planId === 'monthly'
      ? t.screens.paywall.subscribe.monthly
      : t.screens.paywall.subscribe.yearly;
  const priceLabel =
    trial.planId === 'monthly'
      ? fill(t.screens.paywall.subscribe.perMonth, {
          price: catalog.monthly.priceString,
        })
      : fill(t.screens.paywall.subscribe.perYear, {
          price: catalog.yearly.priceString,
        });
  const expiresLabel = formatExpiresLabel(trial.expiresAt, 'en-US');

  const value = useMemo(
    () => ({
      trial,
      reminderDays,
      refresh,
      openSheet,
    }),
    [openSheet, refresh, reminderDays, trial]
  );

  return (
    <TrialReminderContext.Provider value={value}>
      {children}
      <TrialReminderBanner
        visible={bannerVisible && inWindow}
        daysRemaining={trial.daysRemaining}
        onClose={dismissBanner}
        onSeeDetails={openSheet}
      />
      <TrialReminderSheet
        visible={sheetVisible && inWindow}
        daysRemaining={trial.daysRemaining}
        expiresLabel={expiresLabel}
        planLabel={planLabel}
        priceLabel={priceLabel}
        onContinue={closeSheet}
        onManage={handleManage}
        onClose={closeSheet}
      />
    </TrialReminderContext.Provider>
  );
}

export function useTrialReminder() {
  const ctx = useContext(TrialReminderContext);
  if (!ctx) {
    throw new Error('useTrialReminder must be used within TrialReminderProvider');
  }
  return ctx;
}
