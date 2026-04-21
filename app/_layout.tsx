import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { getAppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);

  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          primary: colors.primaryDark,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#818CF8' },
          headerShadowVisible: false,
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#818CF8' },
        }}>
        <Stack.Screen name="index" options={{ title: 'Daily Water Goal' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
