import { Stack } from 'expo-router';

import { getNativeTabStackScreenOptions } from '@/components/navigation/native-large-title-screen-options';
import { useAppColors } from '@/hooks/use-app-colors';

export default function TodayLayout() {
  const colors = useAppColors();

  return (
    <Stack screenOptions={getNativeTabStackScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
