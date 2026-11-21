import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

function getSharedTransparentHeaderOptions(tintColor: string): NativeStackNavigationOptions {
  return {
    headerTransparent: true,
    headerShadowVisible: false,
    headerBackVisible: true,
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: {
      backgroundColor: 'transparent',
    },
    headerTintColor: tintColor,
    headerTitleStyle: {
      color: tintColor,
      fontWeight: '600',
    },
  };
}

export function getNativeTabLargeTitleScreenOptions(
  title: string,
  tintColor = '#101828',
  backgroundColor?: string
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    ...getSharedTransparentHeaderOptions(tintColor),
    ...(backgroundColor ? { contentStyle: { backgroundColor } } : {}),
    ...(Platform.OS === 'ios'
      ? {
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: {
            backgroundColor: 'transparent',
          },
          headerLargeTitleStyle: {
            color: tintColor,
            fontWeight: '700',
          },
        }
      : {}),
  };
}

export function getNativeStickyTitleScreenOptions(
  title: string,
  tintColor = '#101828',
  backgroundColor?: string
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    headerLargeTitleEnabled: false,
    ...getSharedTransparentHeaderOptions(tintColor),
    ...(backgroundColor ? { contentStyle: { backgroundColor } } : {}),
  };
}

export function getNativeTabStackScreenOptions(colors: {
  text: string;
  background: string;
}): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerLargeTitleEnabled: false,
    ...getSharedTransparentHeaderOptions(colors.text),
    contentStyle: { backgroundColor: colors.background },
  };
}

export const TAB_SCROLL_CONTENT_STYLE = {
  paddingHorizontal: 16,
  gap: 12,
} as const;

