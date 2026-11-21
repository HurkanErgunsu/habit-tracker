import {
  BarChart3,
  ChevronRight,
  Droplets,
  Globe,
  Hand,
  Palette,
  Settings2,
  User,
} from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';

export type WelcomeMockKind = 'today' | 'analytics' | 'settings';

const DROP_PATH =
  'M36 4 C26 12 16 22 16 34 C16 47 25 56 36 56 C47 56 56 47 56 34 C56 22 46 12 36 4 Z';

function MiniDrop({ fill, tint }: { fill: string; tint: string }) {
  return (
    <View style={styles.dropWrap}>
      <Svg width={72} height={60} viewBox="0 0 72 60">
        <Path d={DROP_PATH} fill={tint} />
        <Path d={DROP_PATH} fill={fill} opacity={0.78} />
      </Svg>
      <Text style={styles.dropPercent}>68%</Text>
    </View>
  );
}

function TodayMock() {
  const t = useAppStrings();
  const colors = useAppColors();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.largeTitle, { color: colors.text }]}>{t.screens.home.brandTitle}</Text>
        <Text style={[styles.largeSubtitle, { color: colors.textMuted }]}>
          {t.screens.home.subtitle}
        </Text>
      </View>

      <View style={styles.progressRow}>
        <View
          style={[
            styles.card,
            styles.dropCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>
            {t.screens.home.dailyProgress}
          </Text>
          <MiniDrop fill={colors.primary} tint={colors.tintSubtle} />
        </View>
        <View style={styles.metricsCol}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              {t.screens.home.goal}
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>2800 ml</Text>
          </View>
          <View
            style={[
              styles.card,
              styles.splitCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={styles.splitHalf}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {t.screens.home.net}
              </Text>
              <Text style={[styles.metricValueSm, { color: colors.text }]}>1900</Text>
            </View>
            <View style={[styles.splitLine, { backgroundColor: colors.border }]} />
            <View style={styles.splitHalf}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {t.screens.home.left}
              </Text>
              <Text style={[styles.metricValueSm, { color: colors.text }]}>900</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.text }]}>
          {t.screens.home.dailyWindows}
        </Text>
        <View style={styles.timeline}>
          {[true, false, false, false].map((active, index) => (
            <View key={`seg-${index}`} style={styles.timelineSeg}>
              <View
                style={[
                  styles.timelineBar,
                  { backgroundColor: colors.ringTrack },
                  active && { backgroundColor: colors.primary },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.windowRow}>
        <View
          style={[
            styles.card,
            styles.windowCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t.screens.home.windowLeft}
          </Text>
          <Text style={[styles.windowValue, { color: colors.text }]}>420 ml</Text>
        </View>
        <View
          style={[
            styles.card,
            styles.windowCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t.screens.home.nextWindow}
          </Text>
          <Text style={[styles.windowValue, { color: colors.text }]}>Peak</Text>
        </View>
      </View>

      <MockTabBar active="today" />
    </View>
  );
}

function AnalyticsMock() {
  const t = useAppStrings();
  const colors = useAppColors();
  const bars = [0.45, 0.7, 0.55, 0.9, 0.62, 0.78, 0.4];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.largeTitle, { color: colors.text }]}>{t.screens.analytics.title}</Text>
        <Text style={[styles.largeSubtitle, { color: colors.textMuted }]}>
          {t.screens.analytics.subtitle}
        </Text>
      </View>

      <View style={[styles.segment, { backgroundColor: colors.backgroundAlt }]}>
        {[t.screens.analytics.daily, t.screens.analytics.weekly, t.screens.analytics.monthly].map(
          (label, index) => (
            <View
              key={label}
              style={[
                styles.segmentItem,
                index === 1 && { backgroundColor: colors.surface },
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.textMuted },
                  index === 1 && { color: colors.text },
                ]}>
                {label}
              </Text>
            </View>
          )
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.periodTitle, { color: colors.text }]}>This week</Text>
        <View style={styles.totalRow}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {t.screens.analytics.weeklyTotal}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>14.2 L</Text>
        </View>
        <View style={styles.chart}>
          {bars.map((h, index) => (
            <View key={`bar-${index}`} style={styles.chartCol}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: Math.max(8, Math.round(h * 72)),
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.text }]}>
          {t.screens.analytics.drinkDistribution}
        </Text>
        {[72, 48, 28].map((width, index) => (
          <View key={`dist-${index}`} style={styles.distRow}>
            <View style={[styles.distTrack, { backgroundColor: colors.ringTrack }]}>
              <View
                style={[styles.distFill, { width: `${width}%`, backgroundColor: colors.primary }]}
              />
            </View>
          </View>
        ))}
      </View>

      <MockTabBar active="analytics" />
    </View>
  );
}

function SettingsRowMock({
  icon,
  title,
  subtitle,
  value,
  trailing,
  titleColor,
  mutedColor,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: ReactNode;
  titleColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsLeft}>
        {icon}
        <View style={styles.settingsCopy}>
          <Text style={[styles.settingsTitle, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.settingsSubtitle, { color: mutedColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.settingsRight}>
        {value ? <Text style={[styles.settingsValue, { color: mutedColor }]}>{value}</Text> : null}
        {trailing}
      </View>
    </View>
  );
}

function SettingsMock() {
  const t = useAppStrings();
  const colors = useAppColors();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.largeTitle, { color: colors.text }]}>{t.screens.settings.title}</Text>
      </View>

      <View
        style={[
          styles.card,
          styles.settingsGroup,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <SettingsRowMock
          icon={<User size={16} color={colors.text} strokeWidth={2.2} />}
          title={t.screens.profile.title}
          subtitle="2800 ml"
          trailing={<ChevronRight size={16} color={colors.textMuted} strokeWidth={2.4} />}
          titleColor={colors.text}
          mutedColor={colors.textMuted}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {t.screens.settings.general}
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsGroup,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <SettingsRowMock
          icon={<Palette size={18} color={colors.text} strokeWidth={2.2} />}
          title={t.screens.settings.theme}
          value={t.screens.settings.system}
          trailing={<ChevronRight size={14} color={colors.textMuted} strokeWidth={2.4} />}
          titleColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
        <SettingsRowMock
          icon={<Globe size={18} color={colors.text} strokeWidth={2.2} />}
          title={t.screens.settings.language}
          value="English"
          trailing={<ChevronRight size={14} color={colors.textMuted} strokeWidth={2.4} />}
          titleColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
        <SettingsRowMock
          icon={<Hand size={18} color={colors.text} strokeWidth={2.2} />}
          title={t.screens.settings.haptics}
          trailing={
            <View style={[styles.switchTrack, { backgroundColor: colors.primary }]}>
              <View style={[styles.switchThumb, { backgroundColor: colors.surface }]} />
            </View>
          }
          titleColor={colors.text}
          mutedColor={colors.textMuted}
        />
      </View>

      <MockTabBar active="settings" />
    </View>
  );
}

function MockTabBar({ active }: { active: WelcomeMockKind }) {
  const t = useAppStrings();
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <View style={active === 'today' ? styles.tabItemActive : styles.tabItem}>
        <Droplets
          size={14}
          color={active === 'today' ? colors.primary : colors.textMuted}
          strokeWidth={active === 'today' ? 2.4 : 2.2}
        />
        {active === 'today' ? (
          <Text style={[styles.tabLabelActive, { color: colors.primary }]}>
            {t.navigation.tabs.today}
          </Text>
        ) : null}
      </View>
      <View style={active === 'analytics' ? styles.tabItemActive : styles.tabItem}>
        <BarChart3
          size={14}
          color={active === 'analytics' ? colors.primary : colors.textMuted}
          strokeWidth={active === 'analytics' ? 2.4 : 2.2}
        />
        {active === 'analytics' ? (
          <Text style={[styles.tabLabelActive, { color: colors.primary }]}>
            {t.navigation.tabs.analytics}
          </Text>
        ) : null}
      </View>
      <View style={active === 'settings' ? styles.tabItemActive : styles.tabItem}>
        <Settings2
          size={14}
          color={active === 'settings' ? colors.primary : colors.textMuted}
          strokeWidth={active === 'settings' ? 2.4 : 2.2}
        />
        {active === 'settings' ? (
          <Text style={[styles.tabLabelActive, { color: colors.primary }]}>
            {t.navigation.tabs.settings}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function WelcomeScreenMock({ kind }: { kind: WelcomeMockKind }) {
  if (kind === 'analytics') {
    return <AnalyticsMock />;
  }
  if (kind === 'settings') {
    return <SettingsMock />;
  }
  return <TodayMock />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    paddingTop: 54,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  titleBlock: {
    gap: 1,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  largeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricsCol: {
    flex: 1,
    gap: 8,
  },
  card: {
    borderRadius: 16,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dropCard: {
    width: '42%',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  cardLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
  },
  dropWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 64,
  },
  dropPercent: {
    position: 'absolute',
    marginTop: 8,
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
  },
  metricValueSm: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  splitHalf: {
    flex: 1,
  },
  splitLine: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 6,
  },
  timeline: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 4,
  },
  timelineSeg: {
    flex: 1,
  },
  timelineBar: {
    height: 6,
    borderRadius: 99,
  },
  windowRow: {
    flexDirection: 'row',
    gap: 8,
  },
  windowCard: {
    flex: 1,
  },
  windowValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '700',
  },
  periodTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  chart: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  chartCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 8,
  },
  distRow: {
    marginTop: 8,
  },
  distTrack: {
    height: 7,
    borderRadius: 99,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 99,
  },
  sectionLabel: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  settingsGroup: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  settingsRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  settingsCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
    marginRight: 12,
  },
  switchTrack: {
    width: 34,
    height: 20,
    borderRadius: 99,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    alignSelf: 'flex-end',
    width: 16,
    height: 16,
    borderRadius: 99,
  },
  tabBar: {
    marginTop: 'auto',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
  },
  tabItemActive: {
    alignItems: 'center',
    gap: 2,
  },
  tabLabelActive: {
    fontSize: 8,
    fontWeight: '800',
  },
});
