import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SHEET_CLOSE_BUTTON_SIZE,
  SheetCloseButton,
} from '@/components/home/sheet-close-button';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-app-colors';

/** Match `CollapsibleLargeTitleScreen` sticky chrome. */
const STICKY_HEADER_HEIGHT = 44;
const COLLAPSE_DISTANCE = 44;
const GRADIENT_FADE = 28;
const CONTENT_GUTTER = 16;
const HEADER_CONTENT_GAP = 16;

function withAlpha(hex: string, alpha: string) {
  if (hex.length === 9 && hex.startsWith('#')) {
    return `${hex.slice(0, 7)}${alpha}`;
  }
  return `${hex}${alpha}`;
}

export function dismissSettingsSheet() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.navigate('/(tabs)/settings');
}

/** Full-screen settings modal — custom chrome, no system nav bar. */
export function getSettingsModalOptions(
  backgroundColor: string
): NativeStackNavigationOptions {
  return {
    presentation: 'fullScreenModal',
    animation: 'slide_from_bottom',
    gestureEnabled: false,
    headerShown: false,
    contentStyle: { backgroundColor },
  };
}

function SettingsModalHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.stickyBar,
        { height: insets.top + STICKY_HEADER_HEIGHT, paddingTop: insets.top },
      ]}>
      <SheetCloseButton onPress={dismissSettingsSheet} />
      <ThemedText style={[styles.stickyTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

type SettingsModalChromeProps = {
  title: string;
  children: ReactNode;
};

/** Theme / Language: fixed header + native close, no scroll. */
export function SettingsModalStaticChrome({ title, children }: SettingsModalChromeProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SettingsModalHeader title={title} />
      <View
        style={[
          styles.staticBody,
          { paddingBottom: Math.max(insets.bottom, CONTENT_GUTTER) },
        ]}>
        {children}
      </View>
    </View>
  );
}

/**
 * Profile: sticky gradient fade like tab screens.
 * Compact centered title + close from the start (no large title).
 */
export function SettingsModalScrollChrome({ title, children }: SettingsModalChromeProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const scrollY = useSharedValue(0);
  const stickyBarHeight = insets.top + STICKY_HEADER_HEIGHT;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const stickyChromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [12, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: stickyBarHeight + HEADER_CONTENT_GAP,
            paddingBottom: Math.max(insets.bottom, CONTENT_GUTTER),
          },
        ]}>
        {children}
      </Animated.ScrollView>

      <View style={[styles.stickyHeader, { height: stickyBarHeight + GRADIENT_FADE }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, stickyChromeStyle]}>
          <LinearGradient
            colors={[
              withAlpha(colors.background, 'FF'),
              withAlpha(colors.background, 'F2'),
              withAlpha(colors.background, '00'),
            ]}
            locations={[0, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <SettingsModalHeader title={title} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  staticBody: {
    flex: 1,
    paddingTop: HEADER_CONTENT_GAP,
    paddingHorizontal: CONTENT_GUTTER,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_GUTTER,
    gap: 24,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CONTENT_GUTTER,
  },
  stickyTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: SHEET_CLOSE_BUTTON_SIZE,
  },
});
