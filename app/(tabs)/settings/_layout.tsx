import { Stack } from 'expo-router';

import { useAppColors } from '@/hooks/use-app-colors';

export default function SettingsLayout() {
  const colors = useAppColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
