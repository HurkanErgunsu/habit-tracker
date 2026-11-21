import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import {
  getHydrationBarGradient,
  MONTHLY_X_AXIS_LABEL_DAYS,
  MONTHLY_X_AXIS_LABELS,
  type ChartPoint,
} from '@/utils/analytics';

const CHART_HEIGHT = 148;
const BAR_GAP = 6;
const MONTHLY_BAR_WIDTH = 3;
const MONTHLY_AXIS_LABEL_HEIGHT = 20;

/** Matches the first/last bar-center inset of the default flex bar row (daily = 6 slots). */
const STANDARD_PLOT_SLOT_COUNT = 6;

type HydrationBarChartProps = {
  points: ChartPoint[];
  dense?: boolean;
};

function getPlotEdgeRatio(slotCount: number) {
  return 1 / (2 * slotCount);
}

function getPlotHorizontalInsetPercent(slotCount: number = STANDARD_PLOT_SLOT_COUNT): DimensionValue {
  return `${getPlotEdgeRatio(slotCount) * 100}%`;
}

function getMonthlyAxisLabelDays(daysInMonth: number) {
  return MONTHLY_X_AXIS_LABEL_DAYS.filter((day) => day <= daysInMonth);
}

/** Maps day index to 0–1 using space-between anchor days (1, 8, 15, 22, 29). */
function getMonthlyDayPosition(day: number, daysInMonth: number) {
  const labelDays = getMonthlyAxisLabelDays(daysInMonth);
  if (labelDays.length === 0) {
    return 0;
  }
  if (labelDays.length === 1) {
    return 0;
  }

  const positions = labelDays.map((_, index) => index / (labelDays.length - 1));
  const firstDay = labelDays[0];
  const lastDay = labelDays[labelDays.length - 1];

  if (day <= firstDay) {
    return positions[0];
  }
  if (day >= lastDay) {
    return positions[positions.length - 1];
  }

  for (let index = 0; index < labelDays.length - 1; index += 1) {
    const startDay = labelDays[index];
    const endDay = labelDays[index + 1];
    if (day >= startDay && day <= endDay) {
      const progress = (day - startDay) / (endDay - startDay);
      return positions[index] + progress * (positions[index + 1] - positions[index]);
    }
  }

  return positions[positions.length - 1];
}

function DefaultBarChart({ points }: { points: ChartPoint[] }) {
  const colors = useAppColors();
  const maxValue = useMemo(
    () => Math.max(...points.map((point) => point.valueMl), 1),
    [points]
  );

  return (
    <View style={styles.barsRow}>
      {points.map((point) => {
        const hasData = point.valueMl > 0;
        const barHeight = hasData
          ? Math.max(6, Math.round((point.valueMl / maxValue) * CHART_HEIGHT))
          : 0;
        const gradient = getHydrationBarGradient(point.completionRatio ?? 0, hasData);

        return (
          <View key={point.key} style={styles.barColumn}>
            <View style={styles.barTrack}>
              {hasData ? (
                <LinearGradient
                  colors={gradient.colors}
                  locations={gradient.locations}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={[styles.barFill, { height: barHeight }]}
                />
              ) : null}
            </View>
            <Text style={[styles.barLabel, { color: colors.textMuted }]}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MonthlyDailyChart({ points }: { points: ChartPoint[] }) {
  const colors = useAppColors();
  const maxValue = useMemo(
    () => Math.max(...points.map((point) => point.valueMl), 1),
    [points]
  );

  const daysInMonth = points.length;
  const plotInset = getPlotHorizontalInsetPercent(STANDARD_PLOT_SLOT_COUNT);

  const axisLabels = useMemo(
    () =>
      MONTHLY_X_AXIS_LABELS.filter((label) => Number(label) <= daysInMonth).map((label) => ({
        day: Number(label),
        label,
      })),
    [daysInMonth]
  );

  return (
    <View style={styles.monthlyChart}>
      <View style={[styles.plotArea, { paddingHorizontal: plotInset }]}>
        <View style={styles.monthlyBarsPlot}>
          {points.map((point) => {
            const day = point.dayOfMonth ?? Number(point.key.replace('day-', ''));
            const hasData = point.valueMl > 0;
            const barHeight = hasData
              ? Math.max(4, Math.round((point.valueMl / maxValue) * CHART_HEIGHT))
              : 0;
            const gradient = getHydrationBarGradient(point.completionRatio ?? 0, hasData);
            const position = getMonthlyDayPosition(day, daysInMonth);
            const isStart = position <= 0;
            const isEnd = position >= 1;

            return (
              <View
                key={point.key}
                style={[
                  styles.monthlyBarAnchor,
                  isEnd
                    ? styles.monthlyBarAnchorEnd
                    : {
                        left: `${position * 100}%`,
                        marginLeft: isStart ? 0 : -MONTHLY_BAR_WIDTH / 2,
                      },
                ]}>
                {hasData ? (
                  <LinearGradient
                    colors={gradient.colors}
                    locations={gradient.locations}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={[styles.monthlyBarFill, { height: barHeight }]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.monthlyAxisRow}>
          {axisLabels.map(({ day, label }) => (
            <Text key={`axis-${day}`} style={[styles.monthlyAxisLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export function HydrationBarChart({ points, dense = false }: HydrationBarChartProps) {
  const colors = useAppColors();
  const t = useAppStrings();
  const isMonthlyDaily = dense || points.length > 14;

  if (points.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.screens.analytics.noChartData}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chart}>
      {isMonthlyDaily ? (
        <MonthlyDailyChart points={points} />
      ) : (
        <DefaultBarChart points={points} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    marginTop: 4,
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
    minHeight: CHART_HEIGHT + 22,
    width: '100%',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '72%',
    minWidth: 8,
    borderRadius: 8,
    backgroundColor: '#2F8FE8',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthlyChart: {
    width: '100%',
  },
  plotArea: {
    width: '100%',
  },
  monthlyBarsPlot: {
    position: 'relative',
    width: '100%',
    height: CHART_HEIGHT,
  },
  monthlyBarAnchor: {
    position: 'absolute',
    bottom: 0,
    width: MONTHLY_BAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT,
  },
  monthlyBarAnchorEnd: {
    right: 0,
  },
  monthlyBarFill: {
    width: MONTHLY_BAR_WIDTH,
    borderRadius: 2,
  },
  monthlyAxisRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    minHeight: MONTHLY_AXIS_LABEL_HEIGHT,
  },
  monthlyAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 0,
    includeFontPadding: false,
  },
  emptyState: {
    minHeight: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
