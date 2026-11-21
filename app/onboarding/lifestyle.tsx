import { router } from 'expo-router';
import { Armchair, Dumbbell, Snowflake, Sun, Thermometer, Zap } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { PressableScale } from '@/components/pressable-scale';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { type ActivityLevel, type ClimateZone } from '@/src/domains/hydration';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const ACTIVITIES: ActivityLevel[] = ['low', 'moderate', 'high'];
const CLIMATES: ClimateZone[] = ['cold', 'temperate', 'hot'];
const ACTIVITY_ICONS = { low: Armchair, moderate: Dumbbell, high: Zap } as const;
const CLIMATE_ICONS = { cold: Snowflake, temperate: Thermometer, hot: Sun } as const;


// ─── Helpers ─────────────────────────────────────────────────────────────────
function OptionCard({
  selected,
  title,
  subtitle,
  icon,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const colors = useAppColors();

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      haptic
      containerStyle={styles.cardSlot}
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      {icon}
      <View style={styles.copy}>
        <Text
          style={[styles.cardTitle, { color: colors.text }, selected && styles.cardTitleSelected]}
          numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </PressableScale>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function LifestyleScreen() {
  const { draft, setActivityLevel, setClimate } = useOnboarding();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.lifestyle;

  const onContinue = async () => {
    await trackEvent('onboarding_step_completed', {
      step_name: 'lifestyle',
      step_number: 4,
      activity_level: draft.activityLevel,
      climate: draft.climate,
    });
    router.push('/onboarding/permissions');
  };

  return (
    <OnboardingShell
      stepNumber={4}
      totalSteps={TOTAL_STEPS}
      title={copy.title}
      subtitle={copy.subtitle}
      ctaLabel={t.common.continue}
      bodyStyle={styles.body}
      onCtaPress={onContinue}>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{copy.activityLabel}</Text>
        <View style={styles.optionRow}>
          {ACTIVITIES.map((id) => {
            const selected = draft.activityLevel === id;
            const Icon = ACTIVITY_ICONS[id];
            return (
              <OptionCard
                key={id}
                selected={selected}
                title={copy.activity[id].title}
                subtitle={copy.activity[id].subtitle}
                onPress={() => setActivityLevel(id)}
                icon={
                  <Icon
                    size={26}
                    color={selected ? colors.primary : colors.text}
                    strokeWidth={2.2}
                  />
                }
              />
            );
          })}
        </View>
      </View>

      <View style={styles.climateSection}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{copy.climateLabel}</Text>
        <View style={styles.optionRow}>
          {CLIMATES.map((id) => {
            const selected = draft.climate === id;
            const Icon = CLIMATE_ICONS[id];
            return (
              <OptionCard
                key={id}
                selected={selected}
                title={copy.climate[id].title}
                subtitle={copy.climate[id].subtitle}
                onPress={() => setClimate(id)}
                icon={
                  <Icon
                    size={26}
                    color={selected ? colors.primary : colors.text}
                    strokeWidth={2.2}
                  />
                }
              />
            );
          })}
        </View>
      </View>
    </OnboardingShell>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // —— Layout ——
  body: { 
    gap: 0 
  },
  section: { 
    gap: 8 
  },
  climateSection: { 
    marginTop: 24, 
    gap: 8 
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },

  // —— Option card ——
  cardSlot: { 
    flex: 1 
  },
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  copy: {
    alignItems: 'center',
    gap: 2,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
  },
  cardTitleSelected: { 
    fontWeight: '800' 
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
});
