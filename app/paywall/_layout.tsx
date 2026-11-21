import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAppColors } from '@/hooks/use-app-colors';
import {
  configureRevenueCatIfNeeded,
  PaywallOfferingsProvider,
  startListeningForPromoUrl,
} from '@/src/services/revenuecat';

export default function PaywallLayout() {
  const colors = useAppColors();

  useEffect(() => {
    void configureRevenueCatIfNeeded();
  }, []);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void startListeningForPromoUrl().then((unsubscribe) => {
      stop = unsubscribe;
    });
    return () => stop?.();
  }, []);

  return (
    <PaywallOfferingsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="reminder" />
        <Stack.Screen name="subscribe" />
      </Stack>
    </PaywallOfferingsProvider>
  );
}
