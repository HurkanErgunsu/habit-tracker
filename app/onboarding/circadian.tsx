import { router } from 'expo-router';
import { Moon, Sun } from 'lucide-react-native';
import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { Haptics, impactAsync } from '@/utils/haptics';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const DAY_MINUTES = 24 * 60;
const SNAP_MINUTES = 15;
const SIZE = 240;
const CENTER = SIZE / 2;
const TRACK_STROKE = 24;
const HANDLE = 18;
const TRACK_RADIUS = SIZE / 2 - TRACK_STROKE / 2 - 4;
const FACE_RADIUS = TRACK_RADIUS - TRACK_STROKE / 2 - 8;
const NUMBER_RADIUS = FACE_RADIUS - 26;
const TICK_OUTER = FACE_RADIUS - 6;
const TICK_INNER_MAJOR = FACE_RADIUS - 11;
const TICK_INNER_MINOR = FACE_RADIUS - 9;

type DragTarget = 'wake' | 'sleep' | null;


// ─── Helpers ─────────────────────────────────────────────────────────────────
function clampMinutes(minutes: number) {
  return ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

function snapMinutes(minutes: number) {
  return clampMinutes(Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES);
}

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(totalMinutes: number) {
  const normalized = clampMinutes(totalMinutes);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getAwakeDurationMinutes(wakeTime: string, sleepTime: string) {
  const wake = parseTimeToMinutes(wakeTime);
  const sleep = parseTimeToMinutes(sleepTime);
  return sleep > wake ? sleep - wake : DAY_MINUTES - wake + sleep;
}

/** Midnight at top, clockwise through the day. */
function minutesToAngle(minutes: number) {
  return (minutes / DAY_MINUTES) * Math.PI * 2 - Math.PI / 2;
}

function pointOnRing(minutes: number, radius: number) {
  const angle = minutesToAngle(minutes);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function xyToMinutes(x: number, y: number) {
  const angle = Math.atan2(y - CENTER, x - CENTER) + Math.PI / 2;
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return (normalized / (Math.PI * 2)) * DAY_MINUTES;
}

function arcPaths(startMin: number, endMin: number, radius: number) {
  if (startMin === endMin) return [];
  const segments =
    endMin > startMin
      ? [{ start: startMin, end: endMin }]
      : [
          { start: startMin, end: DAY_MINUTES },
          { start: 0, end: endMin },
        ];

  const paths: string[] = [];
  for (const segment of segments) {
    if (segment.end - segment.start <= 0) continue;
    const start = pointOnRing(segment.start, radius);
    const end = pointOnRing(segment.end, radius);
    const sweep = ((segment.end - segment.start) / DAY_MINUTES) * 360;
    paths.push(
      `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`
    );
  }
  return paths;
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function formatDurationLabel(totalMinutes: number, hoursTemplate: string, minutesTemplate: string) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return fill(hoursTemplate, { hours });
  return `${fill(hoursTemplate, { hours })} ${fill(minutesTemplate, { minutes })}`;
}

function CircadianDial({
  wakeTime,
  sleepTime,
  onWakeChange,
  onSleepChange,
}: {
  wakeTime: string;
  sleepTime: string;
  onWakeChange: (next: string) => void;
  onSleepChange: (next: string) => void;
}) {
  const colors = useAppColors();
  const wakeMin = parseTimeToMinutes(wakeTime);
  const sleepMin = parseTimeToMinutes(sleepTime);
  const wakeMinRef = useRef(wakeMin);
  const sleepMinRef = useRef(sleepMin);
  const dragTargetRef = useRef<DragTarget>(null);
  const lastSnapped = useRef({ wake: wakeMin, sleep: sleepMin });
  const onWakeRef = useRef(onWakeChange);
  const onSleepRef = useRef(onSleepChange);

  wakeMinRef.current = wakeMin;
  sleepMinRef.current = sleepMin;
  onWakeRef.current = onWakeChange;
  onSleepRef.current = onSleepChange;

  const wakePoint = pointOnRing(wakeMin, TRACK_RADIUS);
  const sleepPoint = pointOnRing(sleepMin, TRACK_RADIUS);
  const arcs = arcPaths(wakeMin, sleepMin, TRACK_RADIUS);
  const moonAt = pointOnRing(0, NUMBER_RADIUS - 18);
  const sunAt = pointOnRing(12 * 60, NUMBER_RADIUS - 18);
  const hourTicks = useMemo(() => Array.from({ length: 48 }, (_, i) => i * 30), []);
  const hourLabels = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 2), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => {
          const wakePt = pointOnRing(wakeMinRef.current, TRACK_RADIUS);
          const sleepPt = pointOnRing(sleepMinRef.current, TRACK_RADIUS);
          const wakeDist = distance(event.x, event.y, wakePt.x, wakePt.y);
          const sleepDist = distance(event.x, event.y, sleepPt.x, sleepPt.y);
          dragTargetRef.current = wakeDist <= sleepDist ? 'wake' : 'sleep';
        })
        .onUpdate((event) => {
          const target = dragTargetRef.current;
          if (!target) return;
          const snapped = snapMinutes(xyToMinutes(event.x, event.y));
          if (target === 'wake') {
            if (snapped === lastSnapped.current.wake) return;
            lastSnapped.current.wake = snapped;
            void impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onWakeRef.current(formatMinutesToTime(snapped));
            return;
          }
          if (snapped === lastSnapped.current.sleep) return;
          lastSnapped.current.sleep = snapped;
          void impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSleepRef.current(formatMinutesToTime(snapped));
        })
        .onEnd(() => {
          dragTargetRef.current = null;
        })
        .minDistance(0),
    []
  );

  return (
    <GestureHandlerRootView style={styles.dial}>
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.dial}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={TRACK_RADIUS}
              stroke={colors.surface}
              strokeWidth={TRACK_STROKE}
              fill="none"
            />
            <Circle cx={CENTER} cy={CENTER} r={FACE_RADIUS} fill={colors.surface} />

            {hourTicks.map((minutes) => {
              const major = minutes % 60 === 0;
              const outer = pointOnRing(minutes, TICK_OUTER);
              const inner = pointOnRing(minutes, major ? TICK_INNER_MAJOR : TICK_INNER_MINOR);
              return (
                <Line
                  key={`tick-${minutes}`}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={colors.textMuted}
                  strokeWidth={major ? 2 : 1}
                  strokeOpacity={major ? 0.32 : 0.14}
                  strokeLinecap="round"
                />
              );
            })}

            {hourLabels.map((hour) => {
              const point = pointOnRing(hour * 60, NUMBER_RADIUS);
              return (
                <SvgText
                  key={`label-${hour}`}
                  x={point.x}
                  y={point.y + 4}
                  fill={colors.textMuted}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor="middle">
                  {String(hour)}
                </SvgText>
              );
            })}

            {arcs.map((d, index) => (
              <Path
                key={`arc-${index}`}
                d={d}
                stroke={colors.primary}
                strokeWidth={TRACK_STROKE}
                strokeLinecap="round"
                fill="none"
              />
            ))}

            <Circle
              cx={wakePoint.x}
              cy={wakePoint.y}
              r={HANDLE}
              fill={colors.surface}
              stroke={colors.primary}
              strokeWidth={2.5}
            />
            <Circle
              cx={sleepPoint.x}
              cy={sleepPoint.y}
              r={HANDLE}
              fill={colors.surface}
              stroke={colors.border}
              strokeWidth={2.5}
            />
          </Svg>

          <View pointerEvents="none" style={[styles.faceIcon, { left: moonAt.x - 8, top: moonAt.y - 8 }]}>
            <Moon size={14} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View pointerEvents="none" style={[styles.faceIcon, { left: sunAt.x - 8, top: sunAt.y - 8 }]}>
            <Sun size={14} color="#E8A657" strokeWidth={2.2} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.handleIcon, { left: wakePoint.x - 8, top: wakePoint.y - 8 }]}>
            <Sun size={14} color={colors.primary} strokeWidth={2.4} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.handleIcon, { left: sleepPoint.x - 8, top: sleepPoint.y - 8 }]}>
            <Moon size={14} color={colors.text} strokeWidth={2.4} />
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function CircadianScreen() {
  const { draft, setWakeTime, setSleepTime } = useOnboarding();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.clock;
  const awakeMinutes = getAwakeDurationMinutes(draft.wakeTime, draft.sleepTime);

  const onContinue = async () => {
    await trackEvent('onboarding_step_completed', {
      step_name: 'circadian',
      step_number: 3,
      wake_time: draft.wakeTime,
      sleep_time: draft.sleepTime,
    });
    router.push('/onboarding/lifestyle');
  };

  return (
    <OnboardingShell
      stepNumber={3}
      totalSteps={TOTAL_STEPS}
      title={copy.title}
      subtitle={copy.subtitle}
      ctaLabel={t.common.continue}
      scrollEnabled={false}
      bodyStyle={styles.body}
      onCtaPress={onContinue}>
      <View style={[styles.dialCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <View style={styles.readouts}>
          <View style={styles.readout}>
            <View style={[styles.readoutIcon, { backgroundColor: colors.surface }]}>
              <Sun size={16} color={colors.primary} strokeWidth={2.4} />
            </View>
            <View style={styles.readoutCopy}>
              <Text style={[styles.readoutLabel, { color: colors.textMuted }]}>{copy.wakeUp}</Text>
              <Text style={[styles.readoutValue, { color: colors.text }]}>{draft.wakeTime}</Text>
            </View>
          </View>
          <View style={[styles.readoutDivider, { backgroundColor: colors.border }]} />
          <View style={styles.readout}>
            <View style={[styles.readoutIcon, { backgroundColor: colors.surface }]}>
              <Moon size={16} color={colors.text} strokeWidth={2.4} />
            </View>
            <View style={styles.readoutCopy}>
              <Text style={[styles.readoutLabel, { color: colors.textMuted }]}>{copy.sleep}</Text>
              <Text style={[styles.readoutValue, { color: colors.text }]}>{draft.sleepTime}</Text>
            </View>
          </View>
        </View>

        <CircadianDial
          wakeTime={draft.wakeTime}
          sleepTime={draft.sleepTime}
          onWakeChange={setWakeTime}
          onSleepChange={setSleepTime}
        />

        <View style={styles.durationBlock}>
          <Text style={[styles.durationValue, { color: colors.text }]}>
            {formatDurationLabel(awakeMinutes, copy.durationHours, copy.durationMinutes)}
          </Text>
          <Text style={[styles.durationHint, { color: colors.textMuted }]}>{copy.awakeLabel}</Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>{copy.dragHint}</Text>
    </OnboardingShell>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // —— Layout ——
  body: {
    gap: 14,
    alignItems: 'center',
  },
  dialCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 20,
  },

  // —— Readouts ——
  readouts: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  readout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  readoutDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  readoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutCopy: { gap: 1 },
  readoutLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readoutValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },

  // —— Dial ——
  dial: {
    width: SIZE,
    height: SIZE,
  },
  faceIcon: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIcon: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // —— Duration / hint ——
  durationBlock: {
    alignItems: 'center',
    gap: 2,
  },
  durationValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  durationHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});
