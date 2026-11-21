import { router } from 'expo-router';
import { Mars, Transgender, Venus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { PressableScale } from '@/components/pressable-scale';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { AGE_RANGE, type HydrationGender } from '@/src/domains/hydration';
import { Haptics, impactAsync } from '@/utils/haptics';
import { getLocaleTag } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const GENDERS: HydrationGender[] = ['male', 'female', 'nonBinary'];
const GENDER_ICONS = { male: Mars, female: Venus, nonBinary: Transgender } as const;
const ITEM_H = 44;
const PICKER_H = ITEM_H * 5;

type BirthDate = { day: number; month: number; year: number };
type WheelItem = { key: string; label: string; value: number };


// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function clampDay(day: number, month: number, year: number) {
  return Math.min(day, daysInMonth(month, year));
}

function ageFromBirthDate({ day, month, year }: BirthDate) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1;
  return age;
}

function birthDateFromAge(age: number): BirthDate {
  const today = new Date();
  const year = today.getFullYear() - Math.min(AGE_RANGE.max, Math.max(AGE_RANGE.min, age));
  const month = today.getMonth() + 1;
  return { day: Math.min(today.getDate(), daysInMonth(month, year)), month, year };
}

function monthLabels(localeTag: string) {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(localeTag, { month: 'long' }).format(new Date(2020, i, 1))
  );
}

function WheelColumn({
  items,
  selectedValue,
  onChange,
  selectedColor,
  unselectedColor,
  flex = 1,
}: {
  items: WheelItem[];
  selectedValue: number;
  onChange: (value: number) => void;
  selectedColor: string;
  unselectedColor: string;
  flex?: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const interacting = useRef(false);
  const programmatic = useRef(false);
  const lastEmitted = useRef(selectedValue);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === selectedValue));

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    programmatic.current = true;
    scrollRef.current?.scrollTo({ y: index * ITEM_H, animated });
    const clear = () => {
      programmatic.current = false;
    };
    if (animated) setTimeout(clear, 280);
    else requestAnimationFrame(clear);
  }, []);

  useEffect(() => {
    lastEmitted.current = selectedValue;
  }, [selectedValue]);

  useEffect(() => {
    if (!interacting.current && !programmatic.current) scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  function commitOffset(offsetY: number) {
    if (programmatic.current) return;
    const index = Math.min(items.length - 1, Math.max(0, Math.round(offsetY / ITEM_H)));
    const next = items[index];
    if (!next) return;
    const targetY = index * ITEM_H;
    if (Math.abs(offsetY - targetY) > 1) scrollToIndex(index, true);
    if (next.value !== lastEmitted.current) {
      lastEmitted.current = next.value;
      void impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(next.value);
    }
  }

  const pad = (PICKER_H - ITEM_H) / 2;

  return (
    <View style={[styles.wheelColumn, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        onScrollBeginDrag={() => {
          interacting.current = true;
        }}
        onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) >= 0.05) return;
          interacting.current = false;
          commitOffset(e.nativeEvent.contentOffset.y);
        }}
        onMomentumScrollEnd={(e) => {
          interacting.current = false;
          commitOffset(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={{ paddingVertical: pad }}>
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const selected = index === selectedIndex;
          return (
            <View key={item.key} style={styles.wheelItem}>
              <Text
                numberOfLines={1}
                style={[
                  styles.wheelLabel,
                  {
                    opacity: selected ? 1 : Math.max(0.28, 1 - distance * 0.28),
                    color: selected ? selectedColor : unselectedColor,
                    fontWeight: selected ? '800' : '600',
                  },
                ]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function BirthdatePicker({
  value,
  onChange,
  localeTag,
}: {
  value: BirthDate;
  onChange: (next: BirthDate) => void;
  localeTag: string;
}) {
  const colors = useAppColors();
  const today = new Date();
  const maxYear = today.getFullYear() - AGE_RANGE.min;
  const minYear = today.getFullYear() - AGE_RANGE.max;
  const months = useMemo(() => monthLabels(localeTag), [localeTag]);

  const dayItems = useMemo(() => {
    const count = daysInMonth(value.month, value.year);
    return Array.from({ length: count }, (_, i) => {
      const day = i + 1;
      return { key: `d-${day}`, label: String(day), value: day };
    });
  }, [value.month, value.year]);

  const monthItems = useMemo(
    () => months.map((label, i) => ({ key: `m-${i + 1}`, label, value: i + 1 })),
    [months]
  );

  const yearItems = useMemo(() => {
    const years: WheelItem[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) {
      years.push({ key: `y-${year}`, label: String(year), value: year });
    }
    return years;
  }, [maxYear, minYear]);

  function update(partial: Partial<BirthDate>) {
    const month = partial.month ?? value.month;
    const year = partial.year ?? value.year;
    onChange({ day: clampDay(partial.day ?? value.day, month, year), month, year });
  }

  return (
    <View style={[styles.pickerShell, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <View pointerEvents="none" style={[styles.pickerHighlight, { backgroundColor: colors.primary }]} />
      <View style={styles.pickerRow}>
        <WheelColumn
          flex={0.7}
          items={dayItems}
          selectedValue={clampDay(value.day, value.month, value.year)}
          onChange={(day) => update({ day })}
          selectedColor="#FFFFFF"
          unselectedColor={colors.textMuted}
        />
        <WheelColumn
          flex={1.35}
          items={monthItems}
          selectedValue={value.month}
          onChange={(month) => update({ month })}
          selectedColor="#FFFFFF"
          unselectedColor={colors.textMuted}
        />
        <WheelColumn
          flex={0.95}
          items={yearItems}
          selectedValue={value.year}
          onChange={(year) => update({ year })}
          selectedColor="#FFFFFF"
          unselectedColor={colors.textMuted}
        />
      </View>
    </View>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function BiometricScreen() {
  const { draft, setGender, setAge } = useOnboarding();
  const { language } = useAppPreferences();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.biometric;
  const [birthDate, setBirthDate] = useState(() => birthDateFromAge(draft.age));
  const age = ageFromBirthDate(birthDate);
  const canContinue = draft.gender !== null && age >= AGE_RANGE.min && age <= AGE_RANGE.max;

  const onBirthDateChange = (next: BirthDate) => {
    setBirthDate(next);
    setAge(ageFromBirthDate(next));
  };

  const onContinue = async () => {
    if (!draft.gender || !canContinue) return;
    setAge(age);
    await trackEvent('onboarding_step_completed', {
      step_name: 'biometric',
      step_number: 2,
      gender: draft.gender,
      age,
    });
    router.push('/onboarding/body');
  };

  return (
    <OnboardingShell
      stepNumber={1}
      totalSteps={TOTAL_STEPS}
      title={copy.title}
      subtitle={copy.subtitle}
      ctaLabel={t.common.continue}
      ctaDisabled={!canContinue}
      scrollEnabled={false}
      bodyStyle={styles.body}
      onCtaPress={onContinue}>
      <View style={styles.genderSection}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{copy.genderLabel}</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((id) => {
            const selected = draft.gender === id;
            const Icon = GENDER_ICONS[id];
            return (
              <PressableScale
                key={id}
                onPress={() => setGender(id)}
                scaleTo={0.94}
                haptic
                containerStyle={styles.genderCardSlot}
                style={[
                  styles.genderCard,
                  {
                    backgroundColor: colors.panel,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Icon size={28} color={selected ? colors.primary : colors.text} strokeWidth={2.2} />
                <Text
                  style={[
                    styles.genderLabel,
                    { color: colors.text },
                    selected && styles.genderLabelSelected,
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {t.common.gender[id]}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.ageSection}>
        <View style={styles.ageHeader}>
          <Text style={[styles.ageLabel, { color: colors.text }]}>{copy.birthdateLabel}</Text>
          <Text style={[styles.ageValue, { color: colors.text }]}>
            {age} {t.common.yrs}
          </Text>
        </View>
        <BirthdatePicker
          value={birthDate}
          onChange={onBirthDateChange}
          localeTag={getLocaleTag(language)}
        />
      </View>
    </OnboardingShell>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Screen
  body: { 
    gap: 0 
  },
  genderSection: { 
    gap: 8 
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  genderCardSlot: { 
    flex: 1 
  },
  genderCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 104,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1,
  },
  genderLabel: {
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  genderLabelSelected: { 
    fontWeight: '800' 
  },
  ageSection: { 
    marginTop: 24, 
    gap: 8 
  },
  ageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  ageLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    lineHeight: 20 
  },
  ageValue: { 
    fontSize: 15, 
    fontWeight: '600', 
    lineHeight: 20 
  },

  // Helpers (picker)
  pickerShell: {
    height: PICKER_H,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  pickerHighlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: (PICKER_H - ITEM_H) / 2,
    height: ITEM_H,
    borderRadius: 14,
  },
  wheelColumn: { 
    height: PICKER_H 
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wheelLabel: { 
    fontSize: 16, 
    textAlign: 'center' 
  },
});