import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';

import { getAppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getDateKey,
  getPreviousDateKey,
  loadHydrationState,
  saveHydrationState,
  type HydrationState,
} from '@/utils/hydration-storage';
import {
  requestHydrationNotificationPermissions,
  scheduleDailySummaryNotification,
  scheduleSmartHydrationReminder,
} from '@/utils/hydration-notifications';

const RING_SIZE = 226;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const QUICK_AMOUNTS = [200, 330, 500];
const MESSAGE_POOL = ['Great job!', 'Keep flowing!', 'Hydration is key!', 'Sip by sip, you got this!'];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const params = useLocalSearchParams<{
    weight?: string;
    goal?: string;
    recommended?: string;
  }>();
  const [hydrationState, setHydrationState] = useState<HydrationState | null>(null);
  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const hasAppliedParamsRef = useRef(false);
  const todayKey = getDateKey();

  const dailyGoal = hydrationState?.goalMl ?? 2450;
  const drankAmount = hydrationState?.drankMl ?? 0;
  const streakCount = hydrationState?.streakCount ?? 0;
  const remainingAmount = Math.max(dailyGoal - drankAmount, 0);
  const progressRatio = Math.min(Math.max(drankAmount / Math.max(dailyGoal, 1), 0), 1);
  const progressPercent = Math.round(progressRatio * 100);
  const quote = useMemo(() => {
    const index = progressPercent % MESSAGE_POOL.length;
    return MESSAGE_POOL[index];
  }, [progressPercent]);
  const ringProgress = useSharedValue(0);
  const buttonPulse = useSharedValue(1);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse.value }],
  }));

  useEffect(() => {
    buttonPulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [buttonPulse]);

  useEffect(() => {
    ringProgress.value = withTiming(progressRatio, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressRatio, ringProgress]);

  useEffect(() => {
    let isMounted = true;

    async function initializeDashboard() {
      const stored = await loadHydrationState();
      if (!isMounted) {
        return;
      }

      let nextState = { ...stored };
      const yesterdayKey = getPreviousDateKey(todayKey);

      if (nextState.lastProgressDate !== todayKey) {
        nextState.drankMl = 0;
        nextState.lastIntakeAt = null;
        nextState.lastProgressDate = todayKey;
      }

      if (
        nextState.lastCompletedDate &&
        nextState.lastCompletedDate !== todayKey &&
        nextState.lastCompletedDate !== yesterdayKey
      ) {
        nextState.streakCount = 0;
      }

      if (!hasAppliedParamsRef.current) {
        const goalFromParams = Number(params.goal);
        const recommendedFromParams = Number(params.recommended);
        const weightFromParams = Number(params.weight);

        if (!Number.isNaN(goalFromParams) && goalFromParams > 0) {
          nextState.goalMl = goalFromParams;
        }
        if (!Number.isNaN(recommendedFromParams) && recommendedFromParams > 0) {
          nextState.recommendedMl = recommendedFromParams;
        }
        if (!Number.isNaN(weightFromParams) && weightFromParams > 0) {
          nextState.weightKg = weightFromParams;
        }
        hasAppliedParamsRef.current = true;
      }

      setHydrationState(nextState);
      await saveHydrationState(nextState);
    }

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [params.goal, params.recommended, params.weight, todayKey]);

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
        setHydrationState(stored);
      }

      refreshHydrationState();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  useEffect(() => {
    requestHydrationNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!hydrationState) {
      return;
    }
    const { lastIntakeAt } = hydrationState;

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

  function handleLogWater() {
    if (!hydrationState) {
      return;
    }

    setSelectedAmount(null);
    setCustomAmount('');
    setIsAmountModalVisible(true);
  }

  function getChosenAmount() {
    if (selectedAmount) {
      return selectedAmount;
    }

    const parsedCustom = Number(customAmount);
    if (Number.isNaN(parsedCustom) || parsedCustom <= 0) {
      return null;
    }

    return Math.round(parsedCustom);
  }

  function handleContinueToCamera() {
    if (!hydrationState) {
      return;
    }

    const amount = getChosenAmount();
    if (!amount) {
      Alert.alert('Add water amount', 'Choose a quick amount or enter a custom amount first.');
      return;
    }

    setIsAmountModalVisible(false);

    router.push({
      pathname: '/camera',
      params: {
        weight: String(hydrationState.weightKg),
        goal: String(hydrationState.goalMl),
        recommended: String(hydrationState.recommendedMl),
        verifyAmount: String(amount),
      },
    });
  }

  if (!hydrationState) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading your friendly hydration dashboard...</Text>
      </View>
    );
  }

  return (
    <ExpoLinearGradient colors={['#070D1E', '#0E1B3D', '#163B69']} style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace('/');
            }}
            hitSlop={10}
            style={styles.backButton}>
            <Text style={styles.backChevron}>{'<'}</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Daily Water Goal</Text>
          <Text style={styles.topRightLabel}>My Dashboard</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View style={styles.sectionCard} entering={FadeIn.duration(260)}>
            <View>
              <Text style={styles.title}>Daily Intake</Text>
              <Text style={styles.subtitle}>{remainingAmount} ml to go today</Text>
            </View>

            <Animated.View style={styles.ringContainer} entering={FadeInDown.delay(80).duration(350)}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
                <Defs>
                  <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#EF4444" />
                    <Stop offset="55%" stopColor="#F97316" />
                    <Stop offset="100%" stopColor="#FACC15" />
                  </SvgLinearGradient>
                </Defs>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#E5E7EB"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#progressGradient)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeLinecap="round"
                  rotation={-90}
                  originX={RING_SIZE / 2}
                  originY={RING_SIZE / 2}
                  animatedProps={ringAnimatedProps}
                />
              </Svg>

              <View style={styles.ringCenter}>
                <Text style={styles.percentText}>{progressPercent}%</Text>
                <Text style={styles.remainingText}>Remaining {remainingAmount} ml</Text>
              </View>
            </Animated.View>
          </Animated.View>

          <Animated.View style={styles.sectionCard} entering={FadeInDown.delay(130).duration(350)}>
            <View style={styles.dataPanel}>
              <View style={styles.dataColumn}>
                <Text style={styles.statLabel}>INTAKE TODAY</Text>
                <Text style={styles.statValue}>{drankAmount} ml</Text>
              </View>
              <View style={styles.dataDivider} />
              <View style={styles.dataColumn}>
                <Text style={styles.statLabel}>REMAINING</Text>
                <Text style={styles.statValue}>{remainingAmount} ml</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={styles.sectionCard} entering={FadeInDown.delay(180).duration(350)}>
            <View style={styles.streakSection}>
              <Text style={styles.streakIcon}>💧</Text>
              <View>
                <Text style={styles.streakTitle}>DAILY STREAK</Text>
                <Text style={styles.streakValue}>{streakCount} day{streakCount === 1 ? '' : 's'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={styles.sectionCard} entering={FadeInDown.delay(210).duration(350)}>
            <View style={styles.noteSection}>
              <Text style={styles.messageTitle}>Today&apos;s Note</Text>
              <Text style={styles.messageText}>{quote}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(380)} style={styles.ctaWrap}>
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable style={styles.logButton} onPress={handleLogWater}>
                <ExpoLinearGradient
                  colors={['#60A5FA', '#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logButtonGradient}>
                  <Text style={styles.logButtonLabel}>Add Water</Text>
                </ExpoLinearGradient>
              </Pressable>
            </Animated.View>
            <Text style={styles.logButtonSubLabel}>Select amount, then verify with photo</Text>
          </Animated.View>

          <Modal
            animationType="fade"
            visible={isAmountModalVisible}
            transparent
            onRequestClose={() => setIsAmountModalVisible(false)}>
            <View style={styles.modalBackdrop}>
              <KeyboardAvoidingView
                behavior={Platform.select({ ios: 'padding', android: undefined })}
                style={styles.modalContainer}>
                <View style={styles.modalCard}>
                  <View style={styles.modalTopRow}>
                    <Text style={styles.modalTopTitle}>Add Water</Text>
                    <Pressable onPress={() => setIsAmountModalVisible(false)} style={styles.modalCloseButton}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.modalTitle}>How much water did you drink?</Text>
                  <View style={styles.chipsRow}>
                    {QUICK_AMOUNTS.map((amount) => (
                      <Pressable
                        key={amount}
                        onPress={() => {
                          setSelectedAmount(amount);
                          setCustomAmount('');
                        }}
                        style={[
                          styles.chip,
                          selectedAmount === amount && styles.chipSelected,
                        ]}>
                        <Text
                          style={[
                            styles.chipText,
                            selectedAmount === amount && styles.chipTextSelected,
                          ]}>
                          {amount} ml
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    placeholder="Custom amount (ml)"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={(value) => {
                      setSelectedAmount(null);
                      setCustomAmount(value);
                    }}
                    style={styles.customInput}
                  />
                  <View style={styles.modalActions}>
                    <Pressable style={styles.cancelButton} onPress={() => setIsAmountModalVisible(false)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.continueButton} onPress={handleContinueToCamera}>
                      <Text style={styles.continueButtonText}>Next</Text>
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </ExpoLinearGradient>
  );
}

const getStyles = (colors: ReturnType<typeof getAppColors>) =>
  StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'System',
  },
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backChevron: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
    fontFamily: 'System',
  },
  pageTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'System',
  },
  topRightLabel: {
    width: 100,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#030712',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'System',
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    marginTop: 4,
    fontFamily: 'System',
  },
  ringContainer: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    marginTop: 14,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    zIndex: 1,
  },
  percentText: {
    fontSize: 44,
    color: '#0F172A',
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  remainingText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  dataPanel: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  dataColumn: {
    flex: 1,
  },
  dataDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: 'System',
  },
  statValue: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 6,
    fontFamily: 'System',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakIcon: {
    fontSize: 24,
  },
  streakTitle: {
    color: '#64748B',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: 'System',
  },
  streakValue: {
    color: '#111827',
    marginTop: 3,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'System',
  },
  noteSection: {
    minHeight: 58,
    justifyContent: 'center',
  },
  messageTitle: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'System',
  },
  messageText: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
    fontFamily: 'System',
  },
  ctaWrap: {
    paddingHorizontal: 6,
  },
  logButton: {
    height: 62,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  logButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonLabel: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  logButtonSubLabel: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 10,
    fontFamily: 'System',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTopTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  modalCloseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalCloseText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#6366F1',
  },
  chipText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  customInput: {
    marginTop: 12,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    color: '#1F2937',
    fontSize: 15,
    fontFamily: 'System',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  continueButton: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
  },
});
