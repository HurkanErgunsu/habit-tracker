import { getTabBarScrollInset } from '@/components/tab-bar-insets';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HydrationBarChart } from '@/components/analytics/hydration-bar-chart';
import { CollapsibleLargeTitleScreen } from '@/components/navigation/collapsible-large-title-screen';
import { WhiteCard } from '@/components/onboarding/OnboardingShell';
import { SKIP_LAUNCH_GATES } from '@/constants/app';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import {
  ANALYTICS_TIMEFRAMES,
  buildBeverageDistribution,
  buildHydrationChartPoints,
  buildPhaseDistribution,
  canNavigateForward,
  filterLogsInTimeframe,
  formatPeriodTitle,
  formatVolumeMl,
  getTotalNetHydrationMl,
  shiftPeriodAnchor,
  type AnalyticsTimeframe,
} from '@/utils/analytics';
import { buildCircadianSchedule } from '@/utils/circadian-phases';
import { subscribeHydrationChanges } from '@/utils/hydration-events';
import {
  getAllBeverageLogs,
  getEffectiveGoalMl,
  loadHydrationState,
  type HydrationState,
} from '@/utils/hydration-storage';
import { getLocaleTag } from '@/utils/i18n';

export default function AnalyticsScreen() {
  const colors = useAppColors();
  const t = useAppStrings();
  const { language } = useAppPreferences();
  const locale = getLocaleTag(language);
  const insets = useSafeAreaInsets();
  const tabBarScrollInset = getTabBarScrollInset(insets.bottom);
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('daily');
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date());
  const [hydrationState, setHydrationState] = useState<HydrationState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadState() {
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

        setHydrationState(stored);
      }

      loadState();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  useEffect(() => {
    return subscribeHydrationChanges(() => {
      void loadHydrationState().then(setHydrationState);
    });
  }, []);

  const allLogs = useMemo(
    () => (hydrationState ? getAllBeverageLogs(hydrationState) : []),
    [hydrationState]
  );

  const filteredLogs = useMemo(
    () => filterLogsInTimeframe(allLogs, timeframe, periodAnchor),
    [allLogs, timeframe, periodAnchor]
  );

  const effectiveGoalMl = hydrationState ? getEffectiveGoalMl(hydrationState) : 2800;

  const chartPoints = useMemo(
    () =>
      buildHydrationChartPoints(
        filteredLogs,
        timeframe,
        periodAnchor,
        effectiveGoalMl,
        locale
      ),
    [filteredLogs, timeframe, periodAnchor, effectiveGoalMl, locale]
  );

  const totalVolumeMl = useMemo(() => getTotalNetHydrationMl(filteredLogs), [filteredLogs]);

  const beverageDistribution = useMemo(
    () => buildBeverageDistribution(filteredLogs),
    [filteredLogs]
  );

  const phaseDistribution = useMemo(() => {
    if (!hydrationState) {
      return [];
    }

    return buildPhaseDistribution(
      filteredLogs,
      timeframe,
      effectiveGoalMl,
      hydrationState.wakeTime,
      hydrationState.sleepTime,
      periodAnchor
    );
  }, [filteredLogs, timeframe, hydrationState, effectiveGoalMl, periodAnchor]);

  const schedule = useMemo(() => {
    if (!hydrationState) {
      return null;
    }
    return buildCircadianSchedule(hydrationState.wakeTime, hydrationState.sleepTime);
  }, [hydrationState]);

  const selectedSegmentIndex = ANALYTICS_TIMEFRAMES.indexOf(timeframe);
  const periodTitle = formatPeriodTitle(timeframe, periodAnchor, new Date(), {
    locale,
    todayLabel: t.screens.analytics.today,
  });
  const canGoForward = canNavigateForward(timeframe, periodAnchor);
  const segmentLabels = [
    t.screens.analytics.daily,
    t.screens.analytics.weekly,
    t.screens.analytics.monthly,
    t.screens.analytics.yearly,
  ];
  const timeframeTotalLabel = {
    daily: t.screens.analytics.dailyTotal,
    weekly: t.screens.analytics.weeklyTotal,
    monthly: t.screens.analytics.monthlyTotal,
    yearly: t.screens.analytics.yearlyTotal,
  }[timeframe];

  const handleTimeframeChange = (nextTimeframe: AnalyticsTimeframe) => {
    setTimeframe(nextTimeframe);
    setPeriodAnchor(new Date());
  };

  const handlePreviousPeriod = () => {
    setPeriodAnchor((current) => shiftPeriodAnchor(timeframe, current, -1));
  };

  const handleNextPeriod = () => {
    if (!canGoForward) {
      return;
    }
    setPeriodAnchor((current) => shiftPeriodAnchor(timeframe, current, 1));
  };

  if (!hydrationState || !schedule) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.screens.analytics.loading}</Text>
      </View>
    );
  }

  return (
    <CollapsibleLargeTitleScreen
      title={t.screens.analytics.title}
      scrollBottomInset={tabBarScrollInset}
      contentContainerStyle={styles.analyticsScrollContent}>
      <SegmentedControl
          values={segmentLabels}
          selectedIndex={selectedSegmentIndex}
          onChange={(event) => {
            const nextIndex = event.nativeEvent.selectedSegmentIndex;
            const nextTimeframe = ANALYTICS_TIMEFRAMES[nextIndex];
            if (nextTimeframe) {
              handleTimeframeChange(nextTimeframe);
            }
          }}
          style={[styles.segmentedControl, styles.firstBlock]}
        />

        <WhiteCard style={styles.card}>
          <View style={styles.periodNavRow}>
            <Pressable
              onPress={handlePreviousPeriod}
              hitSlop={8}
              style={[styles.periodNavButton, { backgroundColor: colors.tintSubtle }]}
              accessibilityLabel={t.screens.analytics.previousPeriod}>
              <ChevronLeft size={20} color={colors.primary} strokeWidth={2.4} />
            </Pressable>

            <Text style={[styles.periodNavTitle, { color: colors.text }]} numberOfLines={1}>
              {periodTitle}
            </Text>

            <Pressable
              onPress={handleNextPeriod}
              disabled={!canGoForward}
              hitSlop={8}
              style={[
                styles.periodNavButton,
                { backgroundColor: colors.tintSubtle },
                !canGoForward && { backgroundColor: colors.background },
              ]}
              accessibilityLabel={t.screens.analytics.nextPeriod}>
              <ChevronRight
                size={20}
                color={canGoForward ? colors.primary : colors.border}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{timeframeTotalLabel}</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatVolumeMl(totalVolumeMl, locale)}</Text>
          </View>

          <HydrationBarChart points={chartPoints} dense={timeframe === 'monthly'} />
        </WhiteCard>

        <WhiteCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.screens.analytics.drinkDistribution}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t.screens.analytics.drinkDistributionSubtitle}</Text>
          </View>

          {beverageDistribution.length === 0 ? (
            <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
              {t.screens.analytics.noBeverages}
            </Text>
          ) : (
            <View style={styles.breakdownList}>
              {beverageDistribution.map((item) => (
                <View key={item.type} style={styles.breakdownRow}>
                  <View style={styles.breakdownHeader}>
                    <Text style={[styles.breakdownLabel, { color: colors.text }]}>
                      {item.emoji} {t.beverages[item.type].label}
                    </Text>
                    <View style={styles.breakdownStats}>
                      <Text style={[styles.breakdownVolume, { color: colors.textMuted }]}>
                        {formatVolumeMl(item.volumeMl, locale)}
                      </Text>
                      <Text style={[styles.breakdownDot, { color: colors.textMuted }]}>·</Text>
                      <Text style={[styles.breakdownPercent, { color: colors.primary }]}>{item.percent}%</Text>
                    </View>
                  </View>
                  <View style={[styles.breakdownTrack, { backgroundColor: colors.ringTrack }]}>
                    <View style={[styles.breakdownFill, { width: `${item.percent}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </WhiteCard>

        <WhiteCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.screens.analytics.phaseDistribution}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t.screens.analytics.phaseDistributionSubtitle}</Text>
          </View>

          <View style={styles.phaseList}>
            {phaseDistribution.map((phase) => (
              <View key={phase.id} style={styles.phaseRow}>
                <View style={styles.phaseHeader}>
                  <View style={styles.phaseLabelRow}>
                    <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                    <Text style={[styles.phaseLabel, { color: colors.text }]} numberOfLines={1}>
                      {t.circadian[phase.id].title}
                    </Text>
                  </View>
                  <View style={styles.phaseStats}>
                    <Text style={[styles.phaseVolume, { color: colors.textMuted }]}>
                      {formatVolumeMl(phase.intakeMl, locale)}
                    </Text>
                    <Text style={[styles.phaseDot, { color: colors.textMuted }]}>·</Text>
                    <Text style={[styles.phasePercent, { color: colors.primary }]}>{phase.percent}%</Text>
                  </View>
                </View>
                <View style={[styles.phaseTrack, { backgroundColor: colors.ringTrack }]}>
                  <View style={[styles.phaseFill, { width: `${phase.percent}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>
        </WhiteCard>
    </CollapsibleLargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  analyticsScrollContent: {
    gap: 12,
  },
  /** Title → first block: 12 gap + 4 = 16 */
  firstBlock: {
    marginTop: 4,
  },
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
  segmentedControl: {
    height: Platform.OS === 'ios' ? 36 : 44,
  },
  card: {
    gap: 16,
  },
  cardHeader: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  periodNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNavTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  emptySectionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  breakdownList: {
    gap: 16,
  },
  breakdownRow: {
    gap: 0,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  phaseLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseEmoji: {
    width: 20,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
  },
  breakdownStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownVolume: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownDot: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  breakdownPercent: {
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 999,
  },
  phaseList: {
    gap: 16,
  },
  phaseRow: {
    gap: 0,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  phaseLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  phaseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseVolume: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseDot: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  phasePercent: {
    fontSize: 14,
    fontWeight: '800',
  },
  phaseTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  phaseFill: {
    height: '100%',
    borderRadius: 999,
  },
});
