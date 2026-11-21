import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SKIP_LAUNCH_GATES } from '@/constants/app';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import {
  checkSubscriptionAccess,
  configureRevenueCatIfNeeded,
} from '@/src/services/revenuecat';
import { loadHydrationState } from '@/utils/hydration-storage';
import { initMixpanel } from '@/utils/mixpanel';

export default function EntryGateScreen() {
  const colors = useAppColors();
  const t = useAppStrings();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEditMode = params.edit === '1';
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await initMixpanel();
      if (cancelled) return;

      const stored = await loadHydrationState();
      if (cancelled) return;

      if (isEditMode) {
        router.replace('/profile');
        return;
      }

      if (SKIP_LAUNCH_GATES) {
        router.replace('/(tabs)');
        return;
      }

      if (!stored.onboardingCompleted) {
        router.replace('/onboarding');
        return;
      }

      const configured = await configureRevenueCatIfNeeded();
      const hasAccess = configured
        ? await checkSubscriptionAccess()
        : stored.paywallCompleted;

      if (!hasAccess) {
        router.replace('/paywall');
        return;
      }

      router.replace('/(tabs)');
    }

    bootstrap().finally(() => {
      if (!cancelled) setBootstrapped(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  return (
    <View
      style={[styles.blank, { backgroundColor: colors.background }]}
      accessibilityLabel={bootstrapped ? t.common.opening : t.common.loading}
    />
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
  },
});
