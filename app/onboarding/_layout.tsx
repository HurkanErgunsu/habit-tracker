import { OnboardingProvider } from '@/contexts/onboarding-context';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="biometric" />
        <Stack.Screen name="body" />
        <Stack.Screen name="circadian" />
        <Stack.Screen name="lifestyle" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="consent" />
        <Stack.Screen name="processing" options={{ animation: 'fade' }} />
      </Stack>
    </OnboardingProvider>
  );
}
