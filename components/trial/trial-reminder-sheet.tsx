import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { PAYWALL_GRADIENT } from '@/components/paywall/PaywallCta';
import { PressableScale } from '@/components/pressable-scale';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { fill } from '@/utils/i18n';

const SHEET_SLIDE_OFFSET = 520;

type TrialReminderSheetProps = {
  visible: boolean;
  daysRemaining: number;
  expiresLabel: string;
  planLabel: string;
  priceLabel: string;
  onContinue: () => void;
  onManage: () => void;
  onClose: () => void;
};

function TrialReminderSheetBody({
  daysRemaining,
  expiresLabel,
  planLabel,
  priceLabel,
  onContinue,
  onManage,
  onClose,
  backdropAnimatedStyle,
  sheetAnimatedStyle,
}: {
  daysRemaining: number;
  expiresLabel: string;
  planLabel: string;
  priceLabel: string;
  onContinue: () => void;
  onManage: () => void;
  onClose: () => void;
  backdropAnimatedStyle: object;
  sheetAnimatedStyle: object;
}) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.trialReminder;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={styles.backdropPressable} onPress={onClose}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropDim, { backgroundColor: colors.overlayStrong }, backdropAnimatedStyle]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 20),
          },
          sheetAnimatedStyle,
        ]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>{copy.sheetTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {fill(copy.sheetSubtitle, { days: daysRemaining })}
        </Text>

        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <LinearGradient
            colors={[...PAYWALL_GRADIENT]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.statusIcon}>
            <Crown size={20} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{copy.statusActive}</Text>
            <Text style={[styles.statusBody, { color: colors.textMuted }]}>
              {fill(copy.statusExpires, { date: expiresLabel })}
            </Text>
          </View>
          <View style={[styles.daysPill, { backgroundColor: colors.tintSubtle }]}>
            <Text style={[styles.daysPillText, { color: colors.primary }]}>
              {fill(copy.daysLeft, { days: daysRemaining })}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.planCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.planLabel, { color: colors.textMuted }]}>{copy.yourPlan}</Text>
          <Text style={[styles.planName, { color: colors.text }]}>{planLabel}</Text>
          <Text style={[styles.planPrice, { color: colors.text }]}>{priceLabel}</Text>
          <Text style={[styles.planHint, { color: colors.textMuted }]}>{copy.planHint}</Text>
        </View>

        <PressableScale onPress={onContinue} scaleTo={0.97} haptic style={styles.ctaWrap}>
          <LinearGradient
            colors={[...PAYWALL_GRADIENT]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.cta}>
            <Text style={styles.ctaText}>{copy.continueCta}</Text>
          </LinearGradient>
        </PressableScale>

        <PressableScale onPress={onManage} scaleTo={0.98} haptic style={styles.manageButton}>
          <Text style={[styles.manageText, { color: colors.text }]}>{copy.manageCta}</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

export function TrialReminderSheet({
  visible,
  daysRemaining,
  expiresLabel,
  planLabel,
  priceLabel,
  onContinue,
  onManage,
  onClose,
}: TrialReminderSheetProps) {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_SLIDE_OFFSET);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      backdropOpacity.value = 0;
      sheetTranslateY.value = SHEET_SLIDE_OFFSET;
      // Backdrop darkens immediately (no slide with the sheet).
      backdropOpacity.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.quad),
      });
      sheetTranslateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!rendered) return;

    backdropOpacity.value = withTiming(0, { duration: 140 });
    sheetTranslateY.value = withTiming(
      SHEET_SLIDE_OFFSET,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setRendered)(false);
      }
    );
  }, [visible, rendered, backdropOpacity, sheetTranslateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  if (!rendered) return null;

  const body = (
    <TrialReminderSheetBody
      daysRemaining={daysRemaining}
      expiresLabel={expiresLabel}
      planLabel={planLabel}
      priceLabel={priceLabel}
      onContinue={onContinue}
      onManage={onManage}
      onClose={onClose}
      backdropAnimatedStyle={backdropAnimatedStyle}
      sheetAnimatedStyle={sheetAnimatedStyle}
    />
  );

  // FullWindowOverlay keeps the sheet above the FAB overlay on iOS.
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{body}</FullWindowOverlay>;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '72%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  statusBody: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  daysPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  daysPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 18,
    gap: 4,
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  planHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  ctaWrap: {
    marginBottom: 10,
  },
  cta: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
  manageButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});
