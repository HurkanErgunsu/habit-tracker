import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { fill } from '@/utils/i18n';

const BANNER_SLIDE_DELAY_MS = 700;
const BANNER_SLIDE_MS = 420;
const BANNER_EXIT_MS = 280;

type TrialReminderBannerProps = {
  visible: boolean;
  daysRemaining: number;
  onClose: () => void;
  onSeeDetails: () => void;
};

export function TrialReminderBanner({
  visible,
  daysRemaining,
  onClose,
  onSeeDetails,
}: TrialReminderBannerProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withDelay(
        BANNER_SLIDE_DELAY_MS,
        withTiming(1, { duration: BANNER_SLIDE_MS, easing: Easing.out(Easing.cubic) })
      );
      return;
    }

    if (!visible && mounted) {
      progress.value = withTiming(
        0,
        { duration: BANNER_EXIT_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [mounted, progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -72 }],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 12) + 8, paddingHorizontal: 16 },
        animatedStyle,
      ]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.warning,
            shadowColor: colors.warning,
          },
        ]}>
        <View style={[styles.urgencyBar, { backgroundColor: colors.warning }]} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {t.screens.trialReminder.bannerTitle}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={2}>
            {fill(t.screens.trialReminder.bannerBody, { days: daysRemaining })}
          </Text>
        </View>

        <View style={styles.actions}>
          <PressableScale
            onPress={onSeeDetails}
            scaleTo={0.96}
            haptic
            style={[styles.detailsButton, { backgroundColor: colors.warning }]}>
            <Text style={styles.detailsText}>{t.screens.trialReminder.seeDetails}</Text>
          </PressableScale>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel={t.common.close}
            style={[styles.closeButton, { backgroundColor: colors.backgroundAlt }]}>
            <X size={16} color={colors.textMuted} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  urgencyBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingLeft: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
