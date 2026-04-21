import Slider from '@react-native-community/slider';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, Brain } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Speedometer } from '../components/Speedometer';
import { getDateKey, loadHydrationState, saveHydrationState, type HydrationState } from '../utils/hydration-storage';

const RECOMMENDED_FACTOR = 35;
const MIN_WEIGHT_KG = 20;
const MIN_GOAL = 0;
const MAX_WATER_FILL_ML = 4200;
const HERO_SCALE = 0.48;
const DROP_WIDTH = 132;
const DROP_HEIGHT = 118;
const WAVE_WIDTH = DROP_WIDTH * 2;
const LIQUID_LAYER_HEIGHT = DROP_HEIGHT * 3;
const WAVE_VIEWBOX_HEIGHT = 190;
const WAVE_SURFACE_Y = 45;
const WAVE_SURFACE_OFFSET = (WAVE_SURFACE_Y / WAVE_VIEWBOX_HEIGHT) * LIQUID_LAYER_HEIGHT;
const TOP_FILL_TRANSLATE = -WAVE_SURFACE_OFFSET + 4;
const BOTTOM_FILL_TRANSLATE = DROP_HEIGHT - WAVE_SURFACE_OFFSET;
const DROP_PATH =
  'M110 10 C80 34 50 62 50 98 C50 136 76 162 110 162 C144 162 170 136 170 98 C170 62 140 34 110 10 Z';
const STATIC_WAVE_PATH = 'M0 45 C30 20 60 70 90 45 C120 20 150 70 180 45 C210 20 240 70 270 45 C300 20 330 70 360 45 L360 190 L0 190 Z';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type HydrationZone = 'low' | 'perfect' | 'high';

const MESSAGES_LOW = [
  'Your body is craving some love! ✨',
  'Energy low? Water fixes everything! ⚡',
  'Your cells are calling for a refill! 🌵',
  'Focus is just a sip away. You got this! 🧠',
  "Don't lose your glow, keep hydrating. ✨",
  'Ignite your metabolism, give it a boost! 🔥',
  "Don't wait for thirst, the time is now! 🌊",
  'Time to clear that brain fog. Water please! \uD83C\uDF2B\uFE0F',
  'Treat yourself to a refreshing sip today. 💧',
  'Small sips, big changes! 🚀',
] as const;

const MESSAGES_PERFECT = [
  'Perfect balance! Your body says thank you. 💚',
  "You've hit the sweet spot of healing. 🌿",
  'Great job! Harness the power of balance. 💪',
  'Your cells are celebrating right now! 🎉',
  'Peak focus achieved! Keep it up. ⚡',
  'True hydration warrior! Target locked. 🎯',
  "You're glowing! Hydration looks good on you. ✨",
  'Balance is everything, and you found it. 🧘‍♂️',
  'Your body is running like clockwork now. ⚙️',
  'This is pro-level hydration! Congrats. 🏆',
] as const;

const MESSAGES_HIGH = [
  "Whoa, a water legend! But let's slow down. 🌊",
  "Water is life, but don't over-flood it! ⚠️",
  "Overshot the target? Let's find the balance. ⚖️",
  'No need to turn into an aquarium! 😂',
  'Unstoppable! But maybe take a breather. 🛑',
  "Steady, champ! Hydration isn't a race. 🐢",
  'You went above and beyond, now rest. 🛋️',
  'Give your kidneys a break, stay balanced. 🧊',
  'You could conquer oceans with this much! 🚢',
  'Great passion, but balance always wins. 🌊',
] as const;

function getZoneForGoal(goal: number, recommendedMl: number): HydrationZone {
  if (goal < recommendedMl - 250) return 'low';
  if (goal > recommendedMl + 250) return 'high';
  return 'perfect';
}

function getRandomMessage(zone: HydrationZone): string {
  const pool =
    zone === 'low' ? MESSAGES_LOW : zone === 'high' ? MESSAGES_HIGH : MESSAGES_PERFECT;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function OnboardingScreen() {
  const [weightInput, setWeightInput] = useState('60');
  const [goalMl, setGoalMl] = useState(2100);
  const [hydrating, setHydrating] = useState(true);
  const [hasGoalInteracted, setHasGoalInteracted] = useState(false);
  const [sessionMessages] = useState(() => ({
    low: getRandomMessage('low'),
    perfect: getRandomMessage('perfect'),
    high: getRandomMessage('high'),
  }));
  const [displayMessage, setDisplayMessage] = useState('');
  const messageOpacity = useSharedValue(1);
  const messageZoneRef = useRef<HydrationZone | null>(null);
  const waterTranslateY = useSharedValue(BOTTOM_FILL_TRANSLATE);
  const waveTranslateX = useSharedValue(-50);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    waveTranslateX.value = withRepeat(
      withTiming(0, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      true
    );
  }, [waveTranslateX]);

  const weightKg = useMemo(() => {
    const parsed = Number(weightInput.replace(/[^\d]/g, ''));
    if (Number.isNaN(parsed) || parsed < MIN_WEIGHT_KG) return null;
    return parsed;
  }, [weightInput]);

  const recommended = useMemo(() => {
    if (!weightKg) return 2100;
    return Math.round(weightKg * RECOMMENDED_FACTOR);
  }, [weightKg]);

  const maxGaugeValue = Math.max(500, recommended * 2);
  const currentGoal = clamp(goalMl, MIN_GOAL, maxGaugeValue);
  const zone = useMemo<HydrationZone>(
    () => getZoneForGoal(currentGoal, recommended),
    [currentGoal, recommended]
  );

  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  useEffect(() => {
    if (!hasGoalInteracted) {
      return;
    }

    const nextText = sessionMessages[zone];

    if (messageZoneRef.current === null) {
      messageZoneRef.current = zone;
      setDisplayMessage(nextText);
      messageOpacity.value = 1;
      return;
    }

    if (messageZoneRef.current === zone) {
      return;
    }

    messageZoneRef.current = zone;
    messageOpacity.value = withTiming(
      0,
      { duration: 140, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (!finished) {
          return;
        }
        runOnJS(setDisplayMessage)(nextText);
        messageOpacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.in(Easing.quad),
        });
      }
    );
  }, [zone, hasGoalInteracted, sessionMessages, messageOpacity]);

  useEffect(() => {
    const fillLevel = clamp(currentGoal / MAX_WATER_FILL_ML, 0, 1);
    const nextTranslateY = interpolate(
      fillLevel,
      [0, 1],
      [BOTTOM_FILL_TRANSLATE, TOP_FILL_TRANSLATE],
      'clamp'
    );
    waterTranslateY.value = withSpring(nextTranslateY, {
      damping: 16,
      stiffness: 130,
      mass: 0.7,
    });
  }, [currentGoal, waterTranslateY]);

  const animatedWaterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: waterTranslateY.value }, { translateX: waveTranslateX.value }],
  }));

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const stored = await loadHydrationState();
      if (cancelled) return;
      if (stored.weightKg > 0) setWeightInput(String(stored.weightKg));
      if (stored.goalMl > 0) setGoalMl(stored.goalMl);
      setHydrating(false);
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    if (!weightKg) return;
    const today = getDateKey();
    const existing = await loadHydrationState();
    const next: HydrationState = {
      ...existing,
      weightKg,
      goalMl: currentGoal,
      recommendedMl: recommended,
      lastProgressDate: existing.lastProgressDate ?? today,
    };
    await saveHydrationState(next);
    router.push({
      pathname: '/dashboard',
      params: {
        weight: String(weightKg),
        goal: String(currentGoal),
        recommended: String(recommended),
      },
    });
  }

  if (hydrating) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Preparing your hydration profile…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0A1B3D', '#214A9B', '#80B6FF']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>Set Your Goal</Text>

          <View style={styles.frostCard}>
            <Text style={styles.sectionLabel}>Hydration Gauge</Text>
            <View style={styles.gaugeContainer}>
              <View style={styles.waterDropContainer}>
                <View style={styles.dropFrame}>
                  <Svg width={DROP_WIDTH} height={DROP_HEIGHT} viewBox="0 0 220 180">
                    <Path d={DROP_PATH} fill="rgba(147,197,253,0.18)" stroke="#2563EB" strokeWidth={3.5} />
                  </Svg>
                </View>

                <MaskedView
                  style={styles.maskedDrop}
                  maskElement={
                    <View style={styles.maskElement}>
                      <Svg width={DROP_WIDTH} height={DROP_HEIGHT} viewBox="0 0 220 180">
                        <Path d={DROP_PATH} fill="#000000" />
                      </Svg>
                    </View>
                  }>
                  <Animated.View style={[styles.waterWaveLayer, animatedWaterStyle]}>
                    <Svg width={WAVE_WIDTH} height={LIQUID_LAYER_HEIGHT} viewBox="0 0 360 190">
                      <Path d={STATIC_WAVE_PATH} fill="#0EA5E9" />
                    </Svg>
                  </Animated.View>
                </MaskedView>
              </View>

              <View style={styles.heroSpeedometerWrap}>
                {zone === 'perfect' && (
                  <View style={styles.perfectTag}>
                    <View style={styles.perfectDot} />
                    <Text style={styles.perfectTagText}>PERFECT</Text>
                  </View>
                )}
                <Speedometer currentGoal={currentGoal} recommendedGoal={recommended} scale={HERO_SCALE} />
              </View>
            </View>
          </View>

          {hasGoalInteracted && displayMessage ? (
            <Animated.View style={styles.messageCard} entering={FadeIn.duration(280)}>
              <Animated.View style={messageAnimatedStyle}>
                <Text style={styles.messageBody}>{displayMessage}</Text>
              </Animated.View>
            </Animated.View>
          ) : null}

          <View style={styles.frostCardCompact}>
            <Text style={styles.sectionLabel}>Weight Input</Text>
            <View style={styles.weightRow}>
              <TextInput
                value={weightInput}
                onChangeText={(t) => setWeightInput(t.replace(/[^\d]/g, ''))}
                keyboardType="numeric"
                style={styles.weightInput}
                placeholder="60"
                placeholderTextColor="#8CA5CC"
              />
              <Text style={styles.kg}>kg</Text>
            </View>
          </View>

          <View style={styles.frostCardCompact}>
            <Text style={styles.sectionLabel}>Scientific Insight</Text>
            <View style={styles.recommendationSplit}>
              <View style={styles.recommendationHalf}>
                <Text style={styles.recommendationLabel}>Recommended</Text>
                <Text style={styles.insightValue}>{recommended}ml</Text>
              </View>
              <View style={styles.recommendationDivider} />
              <View style={styles.recommendationHalf}>
                <Text style={styles.recommendationLabel}>Your Goal</Text>
                <Text style={styles.insightValue}>{currentGoal}ml</Text>
              </View>
            </View>
          </View>

          <View style={styles.frostCardCompact}>
            <Text style={styles.sectionLabel}>Goal Setting</Text>
            <View style={styles.goalReadoutRow}>
              <Text style={styles.goalReadoutLabel}>Your Daily Goal</Text>
              <Text style={styles.goalReadoutValue}>{currentGoal}ml</Text>
            </View>
            <Slider
              value={currentGoal}
              minimumValue={MIN_GOAL}
              maximumValue={maxGaugeValue}
              step={50}
              minimumTrackTintColor="#3B82F6"
              maximumTrackTintColor="#C9D8F6"
              thumbTintColor="#FFFFFF"
              onValueChange={(v) => {
                const nextGoal = Math.round(v);
                if (!hasGoalInteracted) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setHasGoalInteracted(true);
                }
                setGoalMl(nextGoal);
              }}
              style={styles.goalSlider}
            />
            <Text style={styles.sliderHint}>Drag to set your target hydration volume</Text>
          </View>

          <View style={styles.premiumCard}>
            <View style={styles.statItem}>
              <Activity size={17} color="#2563EB" />
              <View style={styles.statTextBlock}>
                <Text style={styles.premiumLabel}>Metabolic Peak Forecast</Text>
                <Text style={styles.statText}>Your metabolism is 14% more active at this hydration level.</Text>
              </View>
            </View>
          </View>

          <View style={styles.premiumCard}>
            <View style={styles.statItem}>
              <Brain size={17} color="#0EA5E9" />
              <View style={styles.statTextBlock}>
                <Text style={styles.premiumLabel}>Cognitive Fatigue Shield</Text>
                <Text style={styles.statText}>Hydration Shield Active: Brain fog risk reduced by 40%.</Text>
              </View>
            </View>
            <View style={styles.shieldTrack}>
              <View style={styles.shieldFill} />
            </View>
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={styles.bottomCta}>
          <LinearGradient colors={['#1D4ED8', '#3B82F6']} style={styles.ctaButton}>
            <Pressable style={styles.ctaPressable} onPress={handleStart} disabled={!weightKg}>
              <Text style={styles.ctaText}>Start My Plan</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 160 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1B3D' },
  loadingText: { color: '#EAF1FF', fontWeight: '800' },
  header: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginBottom: 12 },

  frostCard: {
    borderRadius: 28,
    padding: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    shadowColor: '#0B1730',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  frostCardCompact: {
    marginTop: 12,
    borderRadius: 22,
    padding: 14,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    shadowColor: '#0B1730',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  weightInput: { flex: 1, fontSize: 34, fontWeight: '900', color: '#0F172A' },
  kg: { color: '#64748B', fontWeight: '800', fontSize: 14 },
  insightLabel: { marginTop: 8, color: '#475569', fontWeight: '700', fontSize: 13 },
  insightValue: { marginTop: 4, color: '#0F172A', fontWeight: '900', fontSize: 28 },
  recommendationLabel: { color: '#475569', fontWeight: '700', fontSize: 13 },
  recommendationSplit: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  recommendationHalf: {
    flex: 1,
  },
  recommendationDivider: {
    width: 1,
    backgroundColor: '#E5EEFF',
    marginHorizontal: 10,
  },
  goalReadoutRow: { marginTop: 8, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalReadoutLabel: { color: '#475569', fontSize: 13, fontWeight: '700' },
  goalReadoutValue: { color: '#0F172A', fontSize: 24, fontWeight: '900' },
  goalSlider: { marginHorizontal: 2, height: 42 },
  sliderHint: { marginTop: 4, color: '#64748B', fontSize: 12, fontWeight: '600' },

  gaugeContainer: {
    marginTop: 8,
    height: 122,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSpeedometerWrap: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterDropContainer: {
    marginTop: 0,
    width: DROP_WIDTH,
    height: DROP_HEIGHT,
    marginRight: 12,
  },
  perfectTag: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  perfectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  perfectTagText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dropFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  maskedDrop: {
    width: DROP_WIDTH,
    height: DROP_HEIGHT,
  },
  maskElement: {
    width: DROP_WIDTH,
    height: DROP_HEIGHT,
  },
  waterWaveLayer: {
    position: 'absolute',
    top: 0,
    left: -90,
    width: WAVE_WIDTH,
    height: LIQUID_LAYER_HEIGHT,
  },

  messageCard: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    padding: 14,
  },
  messageBody: { color: '#0F172A', fontWeight: '700', fontSize: 15, lineHeight: 22 },

  premiumCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statTextBlock: { flex: 1 },
  premiumLabel: { color: '#0F172A', fontWeight: '900', fontSize: 14, marginBottom: 2 },
  statText: { color: '#334155', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  shieldTrack: { marginTop: 10, height: 8, borderRadius: 999, backgroundColor: '#DBEAFE', overflow: 'hidden' },
  shieldFill: { width: '60%', height: '100%', backgroundColor: '#3B82F6', borderRadius: 999 },

  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: 'rgba(9,25,56,0.18)',
  },
  ctaButton: {
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaPressable: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});

