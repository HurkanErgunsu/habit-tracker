import { router } from 'expo-router';
import { CheckCircle2, Loader2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { getPaywallTitleTop, PAYWALL_H_PADDING } from '@/components/paywall/PaywallCta';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const RING_SIZE = 200;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ACCENT = '#2F8FE8';
const SUCCESS = '#3AC885';

const STEP_ROW = 56;
const STEP_GAP = 10;
const STEP_STRIDE = STEP_ROW + STEP_GAP;
const VISIBLE_STEPS = 3;
const LIST_VIEWPORT = STEP_STRIDE * VISIBLE_STEPS - STEP_GAP;

const STEP_DURATIONS_MS = [1500, 1500, 1800, 1500, 1200] as const;
const TOTAL_MS = STEP_DURATIONS_MS.reduce((sum, ms) => sum + ms, 0);
const ADVANCE_LEAD_MS = 320;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);


// ─── Helpers ─────────────────────────────────────────────────────────────────
function Spinner({ color }: { color: string }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [spin]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Loader2 size={20} color={color} strokeWidth={2.4} />
    </Animated.View>
  );
}

function PulseDot({ color }: { color: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.85, 1]) }],
  }));

  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

function ProgressRing({ progress }: { progress: SharedValue<number> }) {
  const colors = useAppColors();

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={colors.ringTrack}
        strokeWidth={STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={ACCENT}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </Svg>
  );
}

function opacityForOffset(offset: number) {
  if (offset <= 0) return 1;
  if (offset === 1) return 0.48;
  if (offset === 2) return 0.28;
  return 0.14;
}

function StepRow({
  label,
  status,
  offset,
  accent,
  surface,
  border,
  text,
}: {
  label: string;
  status: 'pending' | 'active' | 'done';
  offset: number;
  accent: string;
  surface: string;
  border: string;
  text: string;
}) {
  return (
    <View
      style={[
        styles.stepCard,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: opacityForOffset(offset),
        },
      ]}>
      <View style={styles.stepLeft}>
        {status === 'done' ? (
          <CheckCircle2 size={20} color={SUCCESS} strokeWidth={2.4} />
        ) : status === 'active' ? (
          <Spinner color={accent} />
        ) : (
          <View style={[styles.pendingDot, { borderColor: border }]} />
        )}
        <Text style={[styles.stepLabel, { color: text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {status === 'done' ? (
        <CheckCircle2 size={18} color={SUCCESS} strokeWidth={2.4} />
      ) : status === 'active' ? (
        <PulseDot color={accent} />
      ) : (
        <View style={styles.pulseDotPlaceholder} />
      )}
    </View>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ProcessingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.processing;

  const steps = useMemo(
    () => [
      copy.stepBiometric,
      copy.stepHydration,
      copy.stepCircadian,
      copy.stepLifestyle,
      copy.stepFinalize,
    ],
    [copy]
  );

  const progress = useSharedValue(0);
  const listOffset = useSharedValue(0);
  const [percent, setPercent] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (next, prev) => {
      if (next !== prev) runOnJS(setPercent)(next);
    }
  );

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -listOffset.value }],
  }));

  useEffect(() => {
    void trackEvent('onboarding_processing_started');

    progress.value = withTiming(1, {
      duration: TOTAL_MS,
      easing: Easing.out(Easing.cubic),
    });

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    STEP_DURATIONS_MS.forEach((duration, index) => {
      const completeAt = elapsed + duration - ADVANCE_LEAD_MS;
      const nextAt = elapsed + duration;
      elapsed = nextAt;

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setCompletedCount(index + 1);
        }, Math.max(0, completeAt))
      );

      if (index < STEP_DURATIONS_MS.length - 1) {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setStepIndex(index + 1);
            listOffset.value = withTiming((index + 1) * STEP_STRIDE, {
              duration: 380,
              easing: Easing.out(Easing.cubic),
            });
          }, nextAt)
        );
      } else {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            void trackEvent('onboarding_processing_completed');
            router.replace('/paywall');
          }, nextAt + 350)
        );
      }
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [listOffset, progress]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: getPaywallTitleTop(insets.top),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}>
      <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>

      <View style={styles.center}>
        <View style={styles.ringWrap}>
          <ProgressRing progress={progress} />
          <View style={styles.percentWrap} pointerEvents="none">
            <Text style={[styles.percent, { color: colors.text }]}>{percent}%</Text>
          </View>
        </View>

        <View style={styles.listViewport}>
          <Animated.View style={[styles.listTrack, listStyle]}>
            {steps.map((label, index) => {
              const status =
                index < completedCount ? 'done' : index === stepIndex ? 'active' : 'pending';
              return (
                <View key={label} style={styles.stepSlot}>
                  <StepRow
                    label={label}
                    status={status}
                    offset={index - stepIndex}
                    accent={colors.primary}
                    surface={colors.surface}
                    border={colors.border}
                    text={colors.text}
                  />
                </View>
              );
            })}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // —— Layout ——
  screen: {
    flex: 1,
    paddingHorizontal: PAYWALL_H_PADDING,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },

  // —— Progress ring ——
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },

  // —— Step list ——
  listViewport: {
    width: '100%',
    maxWidth: 360,
    height: LIST_VIEWPORT,
    overflow: 'hidden',
  },
  listTrack: {
    width: '100%',
  },
  stepSlot: {
    height: STEP_ROW,
    marginBottom: STEP_GAP,
  },
  stepCard: {
    height: STEP_ROW,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    marginRight: 12,
  },
  stepLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  pendingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseDotPlaceholder: {
    width: 8,
    height: 8,
  },
});
