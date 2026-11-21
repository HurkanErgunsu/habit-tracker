import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { getSettingsModalOptions } from '@/components/navigation/settings-sheet-chrome';
import { getAppColors } from '@/constants/colors';
import { AppPreferencesProvider } from '@/contexts/app-preferences-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startListeningForPromoUrl } from '@/src/services/revenuecat';
import { isTrialNotificationResponse } from '@/utils/trial-notifications';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const isTrialPush = isTrialNotificationResponse(data);
    // Trial pushes are for outside the app; in-app we already show the sticky banner.
    const suppressForegroundTrial = isTrialPush && AppState.currentState === 'active';

    return {
      shouldShowBanner: !suppressForegroundTrial,
      shouldShowList: !suppressForegroundTrial,
      shouldPlaySound: !suppressForegroundTrial,
      shouldSetBadge: false,
    };
  },
});

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <RootNavigation />
    </AppPreferencesProvider>
  );
}

function RootNavigation() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void startListeningForPromoUrl().then((unsubscribe) => {
      stop = unsubscribe;
    });
    return () => stop?.();
  }, []);

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: colors.background,
          card: colors.surface,
          primary: colors.primary,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={getSettingsModalOptions(colors.background)} />
        <Stack.Screen name="theme" options={getSettingsModalOptions(colors.background)} />
        <Stack.Screen name="language" options={getSettingsModalOptions(colors.background)} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
