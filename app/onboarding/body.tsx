import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { HEIGHT_RANGE, WEIGHT_RANGE } from '@/src/domains/hydration';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6;
const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;
const TICK_W = 10;
const LABEL_W = 36;

const WEIGHT_LB = {
  min: Math.round(WEIGHT_RANGE.min * LB_PER_KG),
  max: Math.round(WEIGHT_RANGE.max * LB_PER_KG),
} as const;

const HEIGHT_IN = {
  min: Math.round(HEIGHT_RANGE.min / CM_PER_INCH),
  max: Math.round(HEIGHT_RANGE.max / CM_PER_INCH),
} as const;

type WeightUnit = 'kg' | 'lb';
type HeightUnit = 'm' | 'ft';
type UnitOption<T extends string> = { value: T; label: string };


// ─── Helpers ─────────────────────────────────────────────────────────────────
function kgToLb(kg: number) {
  return Math.round(kg * LB_PER_KG);
}

function lbToKg(lb: number) {
  return Math.round(lb / LB_PER_KG);
}

function cmToInches(cm: number) {
  return Math.round(cm / CM_PER_INCH);
}

function inchesToCm(inches: number) {
  return Math.round(inches * CM_PER_INCH);
}

function formatFeetInches(totalInches: number) {
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

function UnitControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly [UnitOption<T>, UnitOption<T>];
  onChange: (next: T) => void;
}) {
  const colors = useAppColors();
  const values = useMemo(() => options.map((o) => o.label), [options]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <SegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      onChange={(event) => {
        const next = options[event.nativeEvent.selectedSegmentIndex];
        if (next) onChange(next.value);
      }}
      style={styles.unitControl}
      fontStyle={Platform.OS === 'android' ? { color: colors.textMuted } : undefined}
      activeFontStyle={Platform.OS === 'android' ? { color: colors.text } : undefined}
      backgroundColor={Platform.OS === 'android' ? colors.panel : undefined}
      tintColor={Platform.OS === 'android' ? colors.surface : undefined}
    />
  );
}

function Ruler({
  min,
  max,
  value,
  onChange,
  majorEvery = 10,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
  majorEvery?: number;
}) {
  const colors = useAppColors();
  const scrollRef = useRef<ScrollView>(null);
  const [viewportW, setViewportW] = useState(0);
  const settling = useRef(false);

  const values = useMemo(() => {
    const items: number[] = [];
    for (let n = min; n <= max; n += 1) items.push(n);
    return items;
  }, [min, max]);

  const sidePad = Math.max((viewportW - TICK_W) / 2, 0);
  const clamped = Math.min(max, Math.max(min, Math.round(value)));

  const scrollToValue = useCallback(
    (next: number, animated: boolean) => {
      if (!viewportW) return;
      settling.current = true;
      scrollRef.current?.scrollTo({ x: (Math.round(next) - min) * TICK_W, animated });
      requestAnimationFrame(() => {
        settling.current = false;
      });
    },
    [min, viewportW]
  );

  useEffect(() => {
    if (viewportW) scrollToValue(clamped, false);
  }, [viewportW, scrollToValue]);

  function valueFromOffset(offsetX: number) {
    return Math.min(max, Math.max(min, min + Math.round(offsetX / TICK_W)));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (settling.current) return;
    const next = valueFromOffset(event.nativeEvent.contentOffset.x);
    if (next !== clamped) onChange(next);
  }

  return (
    <View style={styles.ruler} onLayout={(e: LayoutChangeEvent) => setViewportW(e.nativeEvent.layout.width)}>
      <View pointerEvents="none" style={[styles.rulerCenter, { backgroundColor: colors.primary }]} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_W}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => onChange(valueFromOffset(e.nativeEvent.contentOffset.x))}
        contentContainerStyle={{ paddingHorizontal: sidePad }}>
        {values.map((tick) => {
          const major = tick % majorEvery === 0;
          return (
            <View key={tick} style={styles.tickSlot}>
              <View
                style={[
                  styles.tick,
                  major ? styles.tickMajor : styles.tickMinor,
                  { backgroundColor: major ? colors.textMuted : colors.border },
                ]}
              />
              {major ? (
                <Text numberOfLines={1} style={[styles.tickLabel, { color: colors.textMuted }]}>
                  {tick}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function BodyMetricsScreen() {
  const { draft, setWeightKg, setHeightCm } = useOnboarding();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.body;
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('m');

  const weightValue = weightUnit === 'kg' ? draft.weightKg : kgToLb(draft.weightKg);
  const weightUnitLabel = weightUnit === 'kg' ? t.common.kg : copy.lbUnit;

  const heightInches = cmToInches(draft.heightCm);
  const heightLabel = heightUnit === 'm' ? String(draft.heightCm) : formatFeetInches(heightInches);
  const heightUnitLabel = heightUnit === 'm' ? t.common.cm : '';
  const heightRuler = heightUnit === 'm' ? draft.heightCm : heightInches;

  const onContinue = async () => {
    await trackEvent('onboarding_step_completed', {
      step_name: 'body',
      step_number: 2,
      weight_kg: draft.weightKg,
      height_cm: draft.heightCm,
      weight_unit: weightUnit,
      height_unit: heightUnit,
    });
    router.push('/onboarding/circadian');
  };

  return (
    <OnboardingShell
      stepNumber={2}
      totalSteps={TOTAL_STEPS}
      title={copy.title}
      subtitle={copy.subtitle}
      ctaLabel={t.common.continue}
      scrollEnabled={false}
      bodyStyle={styles.body}
      onCtaPress={onContinue}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{copy.weightLabel}</Text>
          <UnitControl
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'kg', label: copy.kg },
              { value: 'lb', label: copy.pound },
            ]}
          />
        </View>
        <View style={[styles.bento, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: colors.text }]}>{weightValue}</Text>
            <Text style={[styles.unit, { color: colors.textMuted }]}>{weightUnitLabel}</Text>
          </View>
          <Ruler
            key={`weight-${weightUnit}`}
            min={weightUnit === 'kg' ? WEIGHT_RANGE.min : WEIGHT_LB.min}
            max={weightUnit === 'kg' ? WEIGHT_RANGE.max : WEIGHT_LB.max}
            value={weightValue}
            onChange={(next) => setWeightKg(weightUnit === 'kg' ? next : lbToKg(next))}
          />
        </View>
      </View>

      <View style={[styles.section, styles.heightSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>{copy.heightLabel}</Text>
          <UnitControl
            value={heightUnit}
            onChange={setHeightUnit}
            options={[
              { value: 'm', label: copy.meters },
              { value: 'ft', label: copy.feet },
            ]}
          />
        </View>
        <View style={[styles.bento, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: colors.text }]}>{heightLabel}</Text>
            {heightUnitLabel ? (
              <Text style={[styles.unit, { color: colors.textMuted }]}>{heightUnitLabel}</Text>
            ) : null}
          </View>
          <Ruler
            key={`height-${heightUnit}`}
            min={heightUnit === 'm' ? HEIGHT_RANGE.min : HEIGHT_IN.min}
            max={heightUnit === 'm' ? HEIGHT_RANGE.max : HEIGHT_IN.max}
            value={heightRuler}
            onChange={(next) => setHeightCm(heightUnit === 'm' ? next : inchesToCm(next))}
          />
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
    gap: 0 
  },
  heightSection: { 
    marginTop: 24 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },

  // —— Metric card ——
  bento: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 0,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },

  // —— Unit control ——
  unitControl: {
    width: 160,
    height: 32,
  },

  // —— Ruler ——
  ruler: {
    height: 72,
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  rulerCenter: {
    position: 'absolute',
    top: 0,
    bottom: 44,
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    borderRadius: 2,
    zIndex: 2,
  },
  tickSlot: {
    width: TICK_W,
    alignItems: 'center',
    overflow: 'visible',
  },
  tick: {
    width: 2,
    borderRadius: 1,
  },
  tickMajor: { 
    height: 28 
  },
  tickMinor: { 
    height: 14, 
    marginTop: 7 
  },
  tickLabel: {
    position: 'absolute',
    top: 34,
    left: (TICK_W - LABEL_W) / 2,
    width: LABEL_W,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    includeFontPadding: false,
  },
});
