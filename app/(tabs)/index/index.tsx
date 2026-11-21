import { CollapsibleLargeTitleScreen } from '@/components/navigation/collapsible-large-title-screen';
import { WhiteCard } from '@/components/onboarding/OnboardingShell';
import { getTabBarScrollInset } from '@/components/tab-bar-insets';
import { SKIP_LAUNCH_GATES } from '@/constants/app';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { useSubscriptionAccess } from '@/src/services/revenuecat';
import {
  buildCircadianSchedule,
  formatPhaseClock,
  formatPhaseTimeRange,
  getCurrentCircadianPhase,
  getNextCircadianPhase,
  getPhaseIntakeMl,
  getPhaseProgressRatio,
  getPhaseRemainingMinutes,
  getPhaseTargetMl,
  resolvePhaseFromSchedule,
  type CircadianPhase,
} from '@/utils/circadian-phases';
import { getCircadianInsight } from '@/utils/feynman-insights';
import { subscribeHydrationChanges } from '@/utils/hydration-events';
import {
  requestHydrationNotificationPermissions,
  scheduleDailySummaryNotification,
  scheduleSmartHydrationReminder,
} from '@/utils/hydration-notifications';
import {
  getDailyHydrationPercent,
  getDailyHydrationProgressRatio,
  getDateKey,
  getEffectiveGoalMl,
  getRemainingHydrationMl,
  loadHydrationState,
  resetDailyHydrationProgress,
  saveHydrationState,
  type HydrationState,
} from '@/utils/hydration-storage';
import { fill, type AppStrings } from '@/utils/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DROP_PATH =
  'M110 10 C80 34 50 62 50 98 C50 136 76 162 110 162 C144 162 170 136 170 98 C170 62 140 34 110 10 Z';
const DROP_VIEW_WIDTH = 220;
const DROP_VIEW_HEIGHT = 180;
const DROP_BOTTOM = 162;
const DROP_SPAN = DROP_BOTTOM - 10;
const DROP_WAVE_MS = 2400;
const DROP_CLIP_ID = 'home-hydration-drop-clip';
const DROP_GRADIENT_ID = 'home-hydration-drop-fill';

function buildWaveFillPath(
  startX: number,
  surfaceY: number,
  bottomY: number,
  cycleWidth: number,
  scrollOffset: number,
  amplitude: number
): string {
  'worklet';
  const x = startX - scrollOffset;
  const totalWidth = cycleWidth * 2;
  const peaks = 8;
  const step = totalWidth / peaks;
  let d = `M ${x} ${surfaceY}`;

  for (let i = 0; i < peaks; i += 1) {
    const endX = x + (i + 1) * step;
    const cp1x = x + i * step + step * 0.25;
    const cp2x = x + i * step + step * 0.75;
    const up = i % 2 === 0;
    const cp1y = up ? surfaceY + amplitude : surfaceY - amplitude;
    const cp2y = up ? surfaceY - amplitude : surfaceY + amplitude;
    const endY = up ? surfaceY - amplitude * 0.45 : surfaceY + amplitude * 0.45;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`;
  }

  d += ` L ${x + totalWidth} ${bottomY} L ${x} ${bottomY} Z`;
  return d;
}

function formatDuration(minutes: number, t: AppStrings) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) {
    return fill(t.screens.home.durationM, { m: rest });
  }
  if (rest <= 0) {
    return fill(t.screens.home.durationH, { h: hours });
  }
  return fill(t.screens.home.durationHm, { h: hours, m: rest });
}

function BentoTile({
  children,
  style,
  emphasized = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  emphasized?: boolean;
}) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        emphasized && {
          backgroundColor: colors.tintSubtle,
          borderColor: colors.primary,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

function WaterDrop({
  progressRatio,
  percent,
  size = 140,
}: {
  progressRatio: number;
  percent: number;
  size?: number;
}) {
  const colors = useAppColors();
  const fillProgress = useSharedValue(0);
  const wavePhase = useSharedValue(0);
  const height = Math.round(size * (DROP_VIEW_HEIGHT / DROP_VIEW_WIDTH));

  useEffect(() => {
    fillProgress.value = withTiming(Math.min(Math.max(progressRatio, 0), 1), {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressRatio, fillProgress]);

  useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(1, { duration: DROP_WAVE_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [wavePhase]);

  const fillAnimatedProps = useAnimatedProps(() => {
    const fillHeight = fillProgress.value * DROP_SPAN;
    if (fillHeight < 1) {
      return { d: `M 50 ${DROP_BOTTOM} Z` };
    }

    const surfaceY = DROP_BOTTOM - fillHeight;
    const bottomY = DROP_BOTTOM + 8;
    const amplitude = Math.min(6, Math.max(2.4, fillHeight * 0.04));
    const scrollOffset = wavePhase.value * DROP_VIEW_WIDTH * 0.7;
    return {
      d: buildWaveFillPath(30, surfaceY, bottomY, DROP_VIEW_WIDTH, scrollOffset, amplitude),
    };
  });

  const percentOnWater = progressRatio >= 0.42;

  return (
    <View style={[styles.dropRoot, { width: size, height }]}>
      <Svg width={size} height={height} viewBox={`0 0 ${DROP_VIEW_WIDTH} ${DROP_VIEW_HEIGHT}`}>
        <Defs>
          <LinearGradient id={DROP_GRADIENT_ID} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#0B4F8C" />
            <Stop offset="0.45" stopColor="#2F8FE8" />
            <Stop offset="1" stopColor="#7DD3FC" />
          </LinearGradient>
          <ClipPath id={DROP_CLIP_ID}>
            <Path d={DROP_PATH} />
          </ClipPath>
        </Defs>
        <Path d={DROP_PATH} fill={colors.tintSubtle} />
        <G clipPath={`url(#${DROP_CLIP_ID})`}>
          <AnimatedPath fill={`url(#${DROP_GRADIENT_ID})`} animatedProps={fillAnimatedProps} />
        </G>
        <Path d={DROP_PATH} fill="none" stroke={colors.primary} strokeWidth={4} />
      </Svg>
      <View pointerEvents="none" style={styles.dropPercentWrap}>
        <Text
          style={[
            styles.dropPercent,
            {
              color: percentOnWater ? '#FFFFFF' : colors.text,
              textShadowColor: percentOnWater ? 'rgba(15, 23, 42, 0.28)' : 'transparent',
            },
          ]}>
          {percent}%
        </Text>
      </View>
    </View>
  );
}

function MetricRow({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useAppColors();

  return (
    <View style={[styles.metricRow, style]}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}>
        {value}
      </Text>
    </View>
  );
}

export default function TodayScreen() {
  const colors = useAppColors();
  const t = useAppStrings();
  const insets = useSafeAreaInsets();
  const tabBarScrollInset = getTabBarScrollInset(insets.bottom);
  const { hasAccess, loading: accessLoading } = useSubscriptionAccess();
  const [hydrationState, setHydrationState] = useState<HydrationState | null>(null);
  const todayKey = getDateKey();

  const circadianSchedule = hydrationState
    ? buildCircadianSchedule(hydrationState.wakeTime, hydrationState.sleepTime)
    : null;
  const currentPhaseId = hydrationState
    ? getCurrentCircadianPhase(hydrationState.wakeTime, hydrationState.sleepTime).id
    : null;
  const activePhase =
    circadianSchedule && currentPhaseId
      ? resolvePhaseFromSchedule(circadianSchedule, currentPhaseId)
      : null;

  const effectiveGoalMl = hydrationState ? getEffectiveGoalMl(hydrationState) : 0;
  const phaseTargetMl =
    hydrationState && activePhase ? getPhaseTargetMl(effectiveGoalMl, activePhase) : 0;
  const phaseIntakeMl =
    hydrationState && activePhase
      ? getPhaseIntakeMl(hydrationState.todayBeverageLogs, activePhase)
      : 0;

  const feynmanInsight = useMemo(() => {
    if (!hydrationState || !activePhase) {
      return null;
    }
    return getCircadianInsight(
      activePhase,
      hydrationState.todayBeverageLogs,
      effectiveGoalMl,
      t,
      getDateKey()
    );
  }, [activePhase, hydrationState, effectiveGoalMl, t]);

  const progressPercent = hydrationState
    ? getDailyHydrationPercent(hydrationState.drankMl, effectiveGoalMl)
    : 0;

  useEffect(() => {
    let isMounted = true;

    async function initializeHome() {
      const stored = await loadHydrationState();
      if (!isMounted) {
        return;
      }

      if (!SKIP_LAUNCH_GATES && !stored.onboardingCompleted) {
        router.replace('/onboarding');
        return;
      }
      if (!SKIP_LAUNCH_GATES && !stored.paywallCompleted) {
        router.replace('/paywall');
        return;
      }

      const nextState = resetDailyHydrationProgress(stored, todayKey);
      setHydrationState(nextState);
      await saveHydrationState(nextState);
    }

    initializeHome();

    return () => {
      isMounted = false;
    };
  }, [todayKey]);

  useEffect(() => {
    if (!hydrationState) {
      return;
    }

    saveHydrationState(hydrationState);
  }, [hydrationState]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function refreshHydrationState() {
        const stored = await loadHydrationState();
        if (!isMounted) {
          return;
        }
        if (!SKIP_LAUNCH_GATES && !stored.onboardingCompleted) {
          router.replace('/onboarding');
          return;
        }
        if (!SKIP_LAUNCH_GATES && !stored.paywallCompleted) {
          router.replace('/paywall');
          return;
        }

        setHydrationState(resetDailyHydrationProgress(stored, todayKey));
      }

      refreshHydrationState();

      return () => {
        isMounted = false;
      };
    }, [todayKey])
  );

  useEffect(() => {
    return subscribeHydrationChanges(() => {
      void loadHydrationState().then((stored) => {
        setHydrationState(resetDailyHydrationProgress(stored, todayKey));
      });
    });
  }, [todayKey]);

  useEffect(() => {
    requestHydrationNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!hydrationState) {
      return;
    }

    const lastIntakeAt = hydrationState.lastIntakeAt;

    async function syncHydrationNotifications() {
      const hasPermission = await requestHydrationNotificationPermissions();
      if (!hasPermission) {
        return;
      }

      await scheduleSmartHydrationReminder(lastIntakeAt);
      await scheduleDailySummaryNotification(progressPercent);
    }

    syncHydrationNotifications();
  }, [hydrationState, progressPercent]);

  function handlePremiumPress() {
    router.push('/paywall');
  }

  if (!hydrationState || !activePhase || !circadianSchedule) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.screens.home.loading}</Text>
      </View>
    );
  }

  const isPremiumLocked = !SKIP_LAUNCH_GATES && !accessLoading && !hasAccess;
  const remainingMl = getRemainingHydrationMl(hydrationState.drankMl, effectiveGoalMl);
  const dropPercent = getDailyHydrationPercent(hydrationState.drankMl, effectiveGoalMl);
  const dropRatio = getDailyHydrationProgressRatio(hydrationState.drankMl, effectiveGoalMl);
  const windowRemainingMl = Math.max(phaseTargetMl - phaseIntakeMl, 0);
  const windowComplete = windowRemainingMl <= 0;
  const windowMinutesLeft = getPhaseRemainingMinutes(activePhase);
  const windowPercent = Math.round(getPhaseProgressRatio(phaseIntakeMl, phaseTargetMl) * 100);
  const nextPhase = getNextCircadianPhase(circadianSchedule.phases, activePhase);
  const nextTargetMl = nextPhase ? getPhaseTargetMl(effectiveGoalMl, nextPhase) : 0;

  return (
    <CollapsibleLargeTitleScreen
      title={t.screens.home.brandTitle}
      subtitle={t.screens.home.subtitle}
      stickyTitle={t.navigation.tabs.today}
      scrollBottomInset={tabBarScrollInset}
      contentContainerStyle={styles.homeScrollContent}>
        {/* Daily Progress */}
        <Animated.View entering={FadeInDown.duration(280)} style={[styles.progressStack, styles.firstBlock]}>
          <View style={styles.progressRow}>
            <BentoTile style={styles.dropTile}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={2}>
                {t.screens.home.dailyProgress}
              </Text>
              <View style={styles.dropWrap}>
                <WaterDrop progressRatio={dropRatio} percent={dropPercent} />
              </View>
            </BentoTile>

            <View style={styles.metricsColumn}>
              <BentoTile style={styles.goalTile}>
                <MetricRow label={t.screens.home.goal} value={`${effectiveGoalMl} ${t.common.ml}`} />
              </BentoTile>
              <BentoTile style={styles.splitTile}>
                <MetricRow
                  style={styles.splitMetric}
                  label={t.screens.home.net}
                  value={`${hydrationState.drankMl} ${t.common.ml}`}
                />
                <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
                <MetricRow
                  style={styles.splitMetric}
                  label={t.screens.home.left}
                  value={`${remainingMl} ${t.common.ml}`}
                />
              </BentoTile>
            </View>
          </View>

          {/* Daily Windows */}
          <BentoTile style={styles.timelineTile}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
              {t.screens.home.dailyWindows}
            </Text>
            <View style={styles.timelineTrack}>
              {circadianSchedule.phases.map((phase: CircadianPhase) => {
                const isActive = phase.id === activePhase.id;
                return (
                  <View key={phase.id} style={styles.timelineSegmentWrap}>
                    <View
                      style={[
                        styles.timelineSegment,
                        { backgroundColor: colors.ringTrack },
                        isActive && { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.timelineLabel,
                        { color: colors.textMuted },
                        isActive && { color: colors.primary, fontWeight: '800' },
                      ]}
                      numberOfLines={1}>
                      {t.circadian[phase.id].title}
                    </Text>
                    <Text
                      style={[
                        styles.timelineTime,
                        { color: colors.textMuted },
                        isActive && { color: colors.primary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}>
                      {formatPhaseTimeRange(phase)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </BentoTile>
        </Animated.View>

        {/* Window left / Next window */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.windowRow}>
          <BentoTile style={styles.windowTile} emphasized={windowComplete}>
            <Text style={[styles.windowLabel, { color: colors.textMuted }]}>
              {windowComplete ? t.screens.home.complete : t.screens.home.windowLeft}
            </Text>
            <Text
              style={[styles.windowValue, { color: windowComplete ? colors.primary : colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {windowComplete ? `${windowPercent}%` : `${windowRemainingMl} ${t.common.ml}`}
            </Text>
            <Text style={[styles.windowHint, { color: colors.textMuted }]} numberOfLines={1}>
              {fill(t.screens.home.timeLeft, { time: formatDuration(windowMinutesLeft, t) })}
            </Text>
          </BentoTile>

          <BentoTile style={styles.windowTile}>
            <Text style={[styles.windowLabel, { color: colors.textMuted }]}>
              {t.screens.home.nextWindow}
            </Text>
            {nextPhase ? (
              <>
                <Text style={[styles.windowValue, { color: colors.text }]} numberOfLines={1}>
                  {t.circadian[nextPhase.id].title}
                </Text>
                <Text style={[styles.windowHint, { color: colors.textMuted }]} numberOfLines={1}>
                  {fill(t.screens.home.startsAt, { time: formatPhaseClock(nextPhase.startMs) })}
                  {' · '}
                  {nextTargetMl} {t.common.ml}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.windowValue, { color: colors.text }]} numberOfLines={1}>
                  {t.screens.home.lastWindow}
                </Text>
                <Text style={[styles.windowHint, { color: colors.textMuted }]} numberOfLines={1}>
                  {fill(t.screens.home.untilSleep, { time: formatPhaseClock(activePhase.endMs) })}
                </Text>
              </>
            )}
          </BentoTile>
        </Animated.View>

        {/* Hydration Insight */}
        <Animated.View entering={FadeInDown.delay(120).duration(320)}>
          <WhiteCard style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: colors.tintSubtle }]}>
                <Sparkles size={16} color={colors.primary} strokeWidth={2.4} />
              </View>
              <Text style={[styles.insightTitle, { color: colors.text }]}>
                {t.screens.home.hydrationInsight}
              </Text>
            </View>
            {feynmanInsight ? (
              <Text style={[styles.insightBody, { color: colors.text }]}>
                {feynmanInsight.preface}{' '}
                <Text
                  style={{
                    color: feynmanInsight.tone === 'behind' ? colors.warning : colors.success,
                    fontWeight: '700',
                  }}>
                  {feynmanInsight.emphasis}
                </Text>
              </Text>
            ) : null}
            <View style={styles.insightDisclaimerRow}>
              <Text style={[styles.insightDisclaimerMark, { color: colors.text }]}>!</Text>
              <Text style={[styles.insightDisclaimer, { color: colors.text }]}>
                {t.screens.home.insightDisclaimer}
              </Text>
            </View>
            {isPremiumLocked ? (
              <Pressable onPress={handlePremiumPress}>
                <Text style={[styles.insightPremium, { color: colors.primary }]}>
                  {t.screens.home.premiumHint}
                </Text>
              </Pressable>
            ) : null}
          </WhiteCard>
        </Animated.View>
    </CollapsibleLargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  homeScrollContent: {
    gap: 12,
  },
  /** Title → first tiles: 12 gap + 4 = 16 */
  firstBlock: {
    marginTop: 4,
  },
  /* Ekran */
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Ortak bento kutu */
  tile: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },

  /* Su damlası */
  dropRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropPercentWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  dropPercent: {
    fontSize: 20,
    fontWeight: '800',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Daily Progress */
  progressStack: {
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  dropTile: {
    flex: 0.75,
    minWidth: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  dropWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsColumn: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  goalTile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  splitTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitMetric: {
    flex: 1,
    minWidth: 0,
  },
  splitDivider: {
    marginHorizontal: 12,
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  metricRow: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  /* Daily Windows / CircadianTimeline */
  timelineTile: {
    gap: 16,
  },
  timelineTrack: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineSegmentWrap: {
    flex: 1,
    minWidth: 0,
  },
  timelineSegment: {
    height: 8,
    marginBottom: 8,
    borderRadius: 999,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Still to drink / Next window */
  windowRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  windowTile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  windowLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  windowValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  windowHint: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Hydration Insight */
  insightCard: {
    gap: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  insightBody: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  insightDisclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  insightDisclaimerMark: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  insightDisclaimer: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  insightPremium: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});
