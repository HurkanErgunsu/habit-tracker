import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Droplet, Wifi } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useAppTheme } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { requestHydrationNotificationPermissions } from '@/utils/hydration-notifications';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const STEP = 5;

const SLIDE_MS = 1000;
const HOLD_VISIBLE_MS = 3000;
const HOLD_HIDDEN_MS = 1000;

const SKELETON_TILE_COUNT = 4;
const SKELETON_LINE_WIDTHS = ['92%', '74%', '58%', '80%', '46%'] as const;
const SKELETON_LINE_HEIGHT = 14;
const SKELETON_LINE_GAP = 12;
const SKELETON_TILE_HEIGHT = 56;
const SKELETON_BLOCK_GAP = 16;
const BANNER_BELOW_STATUS = 16;
const PHONE_TAIL_HEIGHT = SKELETON_TILE_HEIGHT + SKELETON_BLOCK_GAP;
const FADE_OVERLAP = SKELETON_LINE_HEIGHT + SKELETON_LINE_GAP;

const STATUS_ICON_SIZE = 18;
const CELLULAR_BAR_COUNT = 4;

const slideEasingIn = Easing.out(Easing.cubic);
const slideEasingOut = Easing.in(Easing.cubic);


// ─── Helpers ─────────────────────────────────────────────────────────────────
function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

function formatStatusTime(date: Date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function useLayoutHeight() {
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setHeight((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  return [height, onLayout] as const;
}

function CellularBars({ color }: { color: string }) {
  const maxHeight = STATUS_ICON_SIZE - 3;
  return (
    <View style={[styles.cellular, { height: maxHeight }]}>
      {Array.from({ length: CELLULAR_BAR_COUNT }, (_, index) => {
        const height = ((index + 1) / CELLULAR_BAR_COUNT) * maxHeight;
        return (
          <View key={index} style={[styles.cellularBar, { height, backgroundColor: color }]} />
        );
      })}
    </View>
  );
}

function BatteryIcon({ color }: { color: string }) {
  return (
    <View style={styles.batteryWrap}>
      <View style={[styles.batteryBody, { borderColor: color }]}>
        <View style={[styles.batteryFill, { backgroundColor: color }]} />
      </View>
      <View style={[styles.batteryNub, { backgroundColor: color }]} />
    </View>
  );
}

function IosStatusBar({
  color,
  onLayout,
}: {
  color: string;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const time = useMemo(() => formatStatusTime(new Date()), []);

  return (
    <View style={styles.statusBar} onLayout={onLayout}>
      <Text style={[styles.statusTime, { color }]}>{time}</Text>
      <View style={styles.statusIcons}>
        <CellularBars color={color} />
        <Wifi size={STATUS_ICON_SIZE} color={color} strokeWidth={2.6} />
        <BatteryIcon color={color} />
      </View>
    </View>
  );
}

function Skeleton({ paddingTop, tileColor }: { paddingTop: number; tileColor: string }) {
  return (
    <View style={[styles.skeleton, { paddingTop }]}>
      <View style={styles.skeletonRow}>
        {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
          <View key={`tile-${index}`} style={[styles.skeletonTile, { backgroundColor: tileColor }]} />
        ))}
      </View>
      <View style={styles.skeletonLines}>
        {SKELETON_LINE_WIDTHS.map((width) => (
          <View key={width} style={[styles.skeletonLine, { width, backgroundColor: tileColor }]} />
        ))}
      </View>
    </View>
  );
}

function NotificationBanner({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) {
  const t = useAppStrings();
  const { colors, colorScheme } = useAppTheme();
  const bannerBg = colorScheme === 'dark' ? '#3A424C' : '#E8EAED';
  const copy = t.screens.onboarding.permissions;

  return (
    <View
      style={[styles.banner, { backgroundColor: bannerBg, borderColor: colors.border }]}
      onLayout={onLayout}>
      <Droplet size={40} color={colors.text} fill={colors.text} strokeWidth={0} />
      <View style={styles.bannerCopy}>
        <View style={styles.bannerTopRow}>
          <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
            {copy.notificationTitle}
          </Text>
          <Text style={[styles.bannerTime, { color: colors.textMuted }]}>{copy.notificationNow}</Text>
        </View>
        <Text style={[styles.bannerBody, { color: colors.textMuted }]} numberOfLines={1}>
          {copy.notificationBody}
        </Text>
      </View>
    </View>
  );
}

function NotificationPhoneMock() {
  const t = useAppStrings();
  const { colors, colorScheme } = useAppTheme();
  const copy = t.screens.onboarding.permissions;
  const [statusBarHeight, onStatusBarLayout] = useLayoutHeight();
  const [bannerHeight, onBannerLayout] = useLayoutHeight();
  const translateY = useSharedValue(-240);

  const bannerVisibleY = statusBarHeight + BANNER_BELOW_STATUS;
  const bannerHiddenY = bannerHeight > 0 ? -bannerHeight : -240;
  const skeletonPaddingTop =
    bannerHeight > 0
      ? bannerHeight + SKELETON_BLOCK_GAP + BANNER_BELOW_STATUS
      : SKELETON_TILE_HEIGHT * 2;

  useFocusEffect(
    useCallback(() => {
      if (bannerHeight <= 0) return;

      translateY.value = bannerHiddenY;
      translateY.value = withRepeat(
        withSequence(
          withTiming(bannerVisibleY, { duration: SLIDE_MS, easing: slideEasingIn }),
          withTiming(bannerVisibleY, { duration: HOLD_VISIBLE_MS }),
          withTiming(bannerHiddenY, { duration: SLIDE_MS, easing: slideEasingOut }),
          withTiming(bannerHiddenY, { duration: HOLD_HIDDEN_MS })
        ),
        -1,
        false
      );

      return () => {
        cancelAnimation(translateY);
        translateY.value = bannerHiddenY;
      };
    }, [bannerHeight, bannerHiddenY, bannerVisibleY, translateY])
  );

  const bannerStackStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const fadeColors =
    colorScheme === 'dark'
      ? ([
          withAlpha(colors.background, '00'),
          withAlpha(colors.background, 'A6'),
          withAlpha(colors.background, 'EB'),
          colors.background,
        ] as const)
      : ([
          withAlpha(colors.background, '00'),
          withAlpha(colors.background, '8C'),
          colors.background,
        ] as const);

  return (
    <View style={styles.mockStage}>
      <View style={[styles.phoneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IosStatusBar color={colors.text} onLayout={onStatusBarLayout} />
        <Skeleton paddingTop={skeletonPaddingTop} tileColor={colors.panel} />
      </View>

      <View
        style={[styles.fadeSection, { marginTop: -(FADE_OVERLAP + PHONE_TAIL_HEIGHT) }]}
        pointerEvents="none">
        <LinearGradient
          colors={[...fadeColors]}
          locations={
            colorScheme === 'dark' ? ([0, 0.1, 0.28, 0.44] as const) : ([0, 0.22, 0.48] as const)
          }
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.copyBlock}>
          <Text style={[styles.headline, { color: colors.text }]}>{copy.headline}</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>{copy.body}</Text>
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.bannerStack, bannerStackStyle]}
        accessibilityElementsHidden>
        <NotificationBanner onLayout={onBannerLayout} />
      </Animated.View>
    </View>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PermissionsScreen() {
  const t = useAppStrings();
  const [busy, setBusy] = useState(false);

  const onContinue = async () => {
    setBusy(true);
    try {
      const notificationsGranted = await requestHydrationNotificationPermissions();
      await trackEvent('onboarding_step_completed', {
        step_name: 'permissions',
        step_number: STEP,
        notifications_granted: notificationsGranted,
      });
      router.push('/onboarding/consent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      stepNumber={STEP}
      totalSteps={TOTAL_STEPS}
      ctaLabel={t.common.continue}
      ctaLoading={busy}
      onCtaPress={onContinue}
      contentStyle={styles.shellContent}
      bodyStyle={styles.shellBody}>
      <View style={styles.page}>
        <NotificationPhoneMock />
      </View>
    </OnboardingShell>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // —— Layout ——
  shellContent: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 0,
  },
  shellBody: { flex: 1 },
  page: {
    flex: 1,
    width: '100%',
  },
  mockStage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },

  // —— Phone ——
  phoneCard: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 0,
    zIndex: 2,
  },
  statusTime: {
    fontSize: STATUS_ICON_SIZE,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cellular: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    marginRight: 1,
  },
  cellularBar: {
    width: 4,
    borderRadius: 1,
  },
  batteryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 1,
  },
  batteryBody: {
    width: STATUS_ICON_SIZE * 1.5,
    height: STATUS_ICON_SIZE * 0.75,
    borderRadius: 3,
    borderWidth: 1.2,
    padding: 1.5,
    justifyContent: 'center',
  },
  batteryFill: {
    width: '72%',
    height: '100%',
    borderRadius: 1,
  },
  batteryNub: {
    width: STATUS_ICON_SIZE * 0.11,
    height: STATUS_ICON_SIZE * 0.31,
    marginLeft: 1,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  skeleton: {
    marginTop: FADE_OVERLAP - 12,
    paddingHorizontal: 16,
    paddingBottom: PHONE_TAIL_HEIGHT,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SKELETON_BLOCK_GAP,
  },
  skeletonTile: {
    flex: 1,
    height: SKELETON_TILE_HEIGHT,
    borderRadius: 14,
  },
  skeletonLines: { gap: SKELETON_LINE_GAP },
  skeletonLine: {
    height: SKELETON_LINE_HEIGHT,
    borderRadius: 999,
  },

  // —— Banner ——
  bannerStack: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  bannerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  bannerTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  bannerBody: {
    fontSize: 13,
    fontWeight: '500',
  },

  // —— Copy / fade ——
  fadeSection: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 4,
  },
  copyBlock: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 5,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    alignSelf: 'center',
  },
});