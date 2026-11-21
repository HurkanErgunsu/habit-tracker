import Slider from '@react-native-community/slider';
import {
  Armchair,
  Check,
  Dumbbell,
  Mars,
  Snowflake,
  Sun,
  Thermometer,
  Transgender,
  Venus,
  X,
  Zap,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  InputAccessoryView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import {
  isValidTimeString,
  ProfileTimeEditor,
} from '@/components/settings/profile-time-editor';
import type {
  ActivityLevel,
  ClimateZone,
  GenderOption,
  HydrationState,
} from '@/utils/hydration-storage';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import {
  ACTIVITY_LEVELS,
  AGE_RANGE,
  CLIMATE_ZONES,
  GENDER_OPTIONS,
} from '@/src/domains/hydration';
import { fill, getLocaleTag } from '@/utils/i18n';
import {
  getMaxGoalMl,
  getRecommendedMl,
  MIN_GOAL,
  MIN_WEIGHT_KG,
} from '@/utils/onboarding-goal-math';

export type ProfileEditField =
  | 'displayName'
  | 'gender'
  | 'age'
  | 'weightKg'
  | 'heightCm'
  | 'activityLevel'
  | 'climate'
  | 'wakeTime'
  | 'sleepTime'
  | 'goalMl';

type ProfileFieldSheetProps = {
  visible: boolean;
  field: ProfileEditField | null;
  profile: HydrationState;
  onClose: () => void;
  onSave: (updates: Partial<HydrationState>) => void;
};

type LucideIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const MIN_HEIGHT_CM = 100;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;

const GENDER_ICONS: Record<GenderOption, LucideIcon> = {
  male: Mars,
  female: Venus,
  nonBinary: Transgender,
};
const ACTIVITY_ICONS: Record<ActivityLevel, LucideIcon> = {
  low: Armchair,
  moderate: Dumbbell,
  high: Zap,
};
const CLIMATE_ICONS: Record<ClimateZone, LucideIcon> = {
  cold: Snowflake,
  temperate: Thermometer,
  hot: Sun,
};

const KEYBOARD_FIELDS: ProfileEditField[] = [
  'displayName',
  'age',
  'weightKg',
  'heightCm',
  'wakeTime',
  'sleepTime',
];
const NUMERIC_INPUT_ACCESSORY_ID = 'profileNumericInputAccessory';
const SHEET_SLIDE_OFFSET = 420;

export function ProfileFieldSheet({
  visible,
  field,
  profile,
  onClose,
  onSave,
}: ProfileFieldSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const { language } = useAppPreferences();
  const locale = getLocaleTag(language);
  const fieldTitles: Record<ProfileEditField, string> = {
    displayName: t.screens.profile.yourName,
    gender: t.screens.profile.gender,
    age: t.screens.profile.age,
    weightKg: t.screens.profile.weight,
    heightCm: t.screens.profile.height,
    activityLevel: t.screens.profile.activityLevel,
    climate: t.screens.profile.climate,
    wakeTime: t.screens.profile.wakeTime,
    sleepTime: t.screens.profile.sleepTime,
    goalMl: t.screens.profile.dailyGoal,
  };
  const [rendered, setRendered] = useState(visible);
  const [presentedField, setPresentedField] = useState<ProfileEditField | null>(field);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_SLIDE_OFFSET);
  const [draftName, setDraftName] = useState(profile.displayName ?? '');
  const [draftGender, setDraftGender] = useState<GenderOption | null>(profile.gender);
  const [draftAge, setDraftAge] = useState(String(profile.age));
  const [draftWeight, setDraftWeight] = useState(String(profile.weightKg));
  const [draftHeight, setDraftHeight] = useState(String(profile.heightCm));
  const [draftActivityLevel, setDraftActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [draftClimate, setDraftClimate] = useState<ClimateZone>(profile.climate);
  const [draftWakeTime, setDraftWakeTime] = useState(profile.wakeTime);
  const [draftSleepTime, setDraftSleepTime] = useState(profile.sleepTime);
  const [draftGoalMl, setDraftGoalMl] = useState(profile.goalMl);

  useEffect(() => {
    if (field) {
      setPresentedField(field);
    }
  }, [field]);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      backdropOpacity.value = 0;
      sheetTranslateY.value = SHEET_SLIDE_OFFSET;
      backdropOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
      sheetTranslateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!rendered) {
      return;
    }

    backdropOpacity.value = withTiming(0, { duration: 180 });
    sheetTranslateY.value = withTiming(
      SHEET_SLIDE_OFFSET,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setRendered)(false);
        }
      }
    );
  }, [visible, rendered, backdropOpacity, sheetTranslateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  useEffect(() => {
    if (!visible || !presentedField) {
      return;
    }

    setDraftName(profile.displayName ?? '');
    setDraftGender(profile.gender);
    setDraftAge(String(profile.age));
    setDraftWeight(String(profile.weightKg));
    setDraftHeight(String(profile.heightCm));
    setDraftActivityLevel(profile.activityLevel);
    setDraftClimate(profile.climate);
    setDraftWakeTime(profile.wakeTime);
    setDraftSleepTime(profile.sleepTime);
    setDraftGoalMl(profile.goalMl);
  }, [visible, presentedField, profile]);

  const recommendedMl = useMemo(
    () =>
      getRecommendedMl({
        gender: profile.gender,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        activityLevel: profile.activityLevel,
        climate: profile.climate,
      }),
    [
      profile.gender,
      profile.weightKg,
      profile.heightCm,
      profile.age,
      profile.activityLevel,
      profile.climate,
    ]
  );
  const maxGoalMl = useMemo(() => getMaxGoalMl(recommendedMl), [recommendedMl]);

  /** Recalculate recommended/goal from the full scientific input set. */
  function goalUpdatesFrom(
    patch: Partial<
      Pick<HydrationState, 'gender' | 'weightKg' | 'heightCm' | 'age' | 'activityLevel' | 'climate'>
    >
  ) {
    const nextRecommended = getRecommendedMl({
      gender: patch.gender !== undefined ? patch.gender : profile.gender,
      weightKg: patch.weightKg ?? profile.weightKg,
      heightCm: patch.heightCm ?? profile.heightCm,
      age: patch.age ?? profile.age,
      activityLevel: patch.activityLevel ?? profile.activityLevel,
      climate: patch.climate ?? profile.climate,
    });
    return {
      ...patch,
      recommendedMl: nextRecommended,
      goalMl: profile.usesManualGoal ? profile.goalMl : nextRecommended,
    };
  }

  if (!rendered || !presentedField) {
    return null;
  }

  const activeField = presentedField;
  const usesKeyboard = KEYBOARD_FIELDS.includes(activeField);

  const canSave = (() => {
    switch (activeField) {
      case 'displayName':
        return draftName.trim().length >= MIN_NAME_LENGTH;
      case 'gender':
        return draftGender !== null;
      case 'age': {
        const age = Number(draftAge);
        return !Number.isNaN(age) && age >= AGE_RANGE.min && age <= AGE_RANGE.max;
      }
      case 'weightKg': {
        const weight = Number(draftWeight);
        return !Number.isNaN(weight) && weight >= MIN_WEIGHT_KG;
      }
      case 'heightCm': {
        const height = Number(draftHeight);
        return !Number.isNaN(height) && height >= MIN_HEIGHT_CM;
      }
      case 'activityLevel':
      case 'climate':
        return true;
      case 'wakeTime':
        return isValidTimeString(draftWakeTime);
      case 'sleepTime':
        return isValidTimeString(draftSleepTime);
      case 'goalMl':
        return true;
      default:
        return false;
    }
  })();

  function handleSave() {
    if (!canSave) {
      return;
    }

    switch (activeField) {
      case 'displayName':
        onSave({ displayName: draftName.trim() });
        break;
      case 'gender':
        if (draftGender) {
          onSave(goalUpdatesFrom({ gender: draftGender }));
        }
        break;
      case 'age':
        onSave(goalUpdatesFrom({ age: Number(draftAge) }));
        break;
      case 'weightKg':
        onSave(goalUpdatesFrom({ weightKg: Number(draftWeight) }));
        break;
      case 'heightCm':
        onSave(goalUpdatesFrom({ heightCm: Number(draftHeight) }));
        break;
      case 'activityLevel':
        onSave(goalUpdatesFrom({ activityLevel: draftActivityLevel }));
        break;
      case 'climate':
        onSave(goalUpdatesFrom({ climate: draftClimate }));
        break;
      case 'wakeTime':
        onSave({ wakeTime: draftWakeTime });
        break;
      case 'sleepTime':
        onSave({ sleepTime: draftSleepTime });
        break;
      case 'goalMl':
        onSave({ goalMl: Math.round(draftGoalMl), usesManualGoal: true });
        break;
      default:
        break;
    }

    onClose();
  }

  function renderEditor() {
    switch (activeField) {
      case 'displayName':
        return (
          <TextInput
            value={draftName}
            onChangeText={(value) => setDraftName(value.slice(0, MAX_NAME_LENGTH))}
            placeholder={t.screens.profile.namePlaceholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            enterKeyHint="done"
            onSubmitEditing={canSave ? handleSave : undefined}
            style={[styles.nameInput, { color: colors.text }]}
          />
        );
      case 'gender':
        return (
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((id) => {
              const selected = draftGender === id;
              const Icon = GENDER_ICONS[id];
              return (
                <PressableScale
                  key={id}
                  onPress={() => setDraftGender(id)}
                  scaleTo={0.96}
                  haptic
                  containerStyle={styles.genderSlot}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    selected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.tintSubtle,
                    },
                  ]}>
                  <Icon
                    size={28}
                    color={selected ? colors.primary : colors.text}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.genderLabel,
                      { color: selected ? colors.primary : colors.text },
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
        );
      case 'age':
        return (
          <View style={styles.metricEditor}>
            <TextInput
              value={draftAge}
              onChangeText={(raw) => setDraftAge(raw.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              inputAccessoryViewID={
                Platform.OS === 'ios' ? NUMERIC_INPUT_ACCESSORY_ID : undefined
              }
              style={[styles.metricInput, { color: colors.text }]}
            />
            <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{t.common.yrs}</Text>
          </View>
        );
      case 'weightKg':
        return (
          <View style={styles.metricEditor}>
            <TextInput
              value={draftWeight}
              onChangeText={(raw) => setDraftWeight(raw.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              inputAccessoryViewID={
                Platform.OS === 'ios' ? NUMERIC_INPUT_ACCESSORY_ID : undefined
              }
              style={[styles.metricInput, { color: colors.text }]}
            />
            <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{t.common.kg}</Text>
          </View>
        );
      case 'heightCm':
        return (
          <View style={styles.metricEditor}>
            <TextInput
              value={draftHeight}
              onChangeText={(raw) => setDraftHeight(raw.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              inputAccessoryViewID={
                Platform.OS === 'ios' ? NUMERIC_INPUT_ACCESSORY_ID : undefined
              }
              style={[styles.metricInput, { color: colors.text }]}
            />
            <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{t.common.cm}</Text>
          </View>
        );
      case 'activityLevel':
        return (
          <View style={styles.genderRow}>
            {ACTIVITY_LEVELS.map((id) => {
              const selected = draftActivityLevel === id;
              const Icon = ACTIVITY_ICONS[id];
              const copy = t.screens.onboarding.lifestyle.activity[id];
              return (
                <PressableScale
                  key={id}
                  onPress={() => setDraftActivityLevel(id)}
                  scaleTo={0.96}
                  haptic
                  containerStyle={styles.genderSlot}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    selected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.tintSubtle,
                    },
                  ]}>
                  <Icon
                    size={26}
                    color={selected ? colors.primary : colors.text}
                    strokeWidth={2.2}
                  />
                  <View style={styles.optionCopy}>
                    <Text
                      style={[
                        styles.genderLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}>
                      {copy.title}
                    </Text>
                    <Text
                      style={[styles.optionSubtitle, { color: colors.textMuted }]}
                      numberOfLines={2}>
                      {copy.subtitle}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        );
      case 'climate':
        return (
          <View style={styles.genderRow}>
            {CLIMATE_ZONES.map((id) => {
              const selected = draftClimate === id;
              const Icon = CLIMATE_ICONS[id];
              const copy = t.screens.onboarding.lifestyle.climate[id];
              return (
                <PressableScale
                  key={id}
                  onPress={() => setDraftClimate(id)}
                  scaleTo={0.96}
                  haptic
                  containerStyle={styles.genderSlot}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    selected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.tintSubtle,
                    },
                  ]}>
                  <Icon
                    size={26}
                    color={selected ? colors.primary : colors.text}
                    strokeWidth={2.2}
                  />
                  <View style={styles.optionCopy}>
                    <Text
                      style={[
                        styles.genderLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}>
                      {copy.title}
                    </Text>
                    <Text
                      style={[styles.optionSubtitle, { color: colors.textMuted }]}
                      numberOfLines={2}>
                      {copy.subtitle}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        );
      case 'wakeTime':
        return (
          <ProfileTimeEditor
            value={draftWakeTime}
            onChange={setDraftWakeTime}
            inputAccessoryViewID={
              Platform.OS === 'ios' ? NUMERIC_INPUT_ACCESSORY_ID : undefined
            }
          />
        );
      case 'sleepTime':
        return (
          <ProfileTimeEditor
            value={draftSleepTime}
            onChange={setDraftSleepTime}
            inputAccessoryViewID={
              Platform.OS === 'ios' ? NUMERIC_INPUT_ACCESSORY_ID : undefined
            }
          />
        );
      case 'goalMl':
        return (
          <View style={styles.goalEditor}>
            <Text style={[styles.goalValue, { color: colors.text }]}>
              {Math.round(draftGoalMl).toLocaleString(locale)} {t.common.ml}
            </Text>
            <Text style={[styles.goalHint, { color: colors.textMuted }]}>
              {t.screens.profile.recommended} {fill(t.screens.profile.dailyGoalValue, { ml: recommendedMl.toLocaleString(locale) })}
            </Text>
            <Slider
              value={draftGoalMl}
              minimumValue={MIN_GOAL}
              maximumValue={maxGoalMl}
              step={50}
              minimumTrackTintColor="#2F8FE8"
              maximumTrackTintColor={colors.ringTrack}
              thumbTintColor="#2F8FE8"
              onValueChange={setDraftGoalMl}
            />
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <Modal animationType="none" transparent visible={rendered} onRequestClose={onClose}>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={NUMERIC_INPUT_ACCESSORY_ID}>
          <View style={styles.hiddenInputAccessory} />
        </InputAccessoryView>
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdropPressable} onPress={onClose}>
            <Animated.View
              pointerEvents="none"
              style={[styles.backdropDim, backdropAnimatedStyle]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.sheet,
              usesKeyboard ? styles.sheetKeyboard : styles.sheetFitContent,
              {
                paddingBottom: usesKeyboard ? Math.max(insets.bottom, 12) : insets.bottom + 8,
                backgroundColor: colors.surface,
              },
              sheetAnimatedStyle,
            ]}>
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View style={styles.toolbar}>
                <PressableScale
                  onPress={onClose}
                  scaleTo={0.92}
                  haptic
                  style={styles.toolbarButton}
                  accessibilityLabel={t.common.close}>
                  <View style={[styles.closeCircle, { backgroundColor: colors.background }]}>
                    <X size={18} color={colors.textMuted} strokeWidth={2.4} />
                  </View>
                </PressableScale>

                <Text style={[styles.toolbarTitle, { color: colors.text }]}>{fieldTitles[activeField]}</Text>

                <PressableScale
                  onPress={handleSave}
                  disabled={!canSave}
                  scaleTo={0.92}
                  haptic
                  style={[styles.toolbarButton, !canSave && styles.toolbarButtonDisabled]}
                  accessibilityLabel={t.common.save}>
                  <View style={[styles.confirmCircle, !canSave && styles.confirmCircleDisabled]}>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.8} />
                  </View>
                </PressableScale>
              </View>

              <View style={[styles.editorWrap, usesKeyboard && styles.editorWrapKeyboard]}>
                {renderEditor()}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetKeyboard: {
    minHeight: 180,
  },
  sheetFitContent: {},
  hiddenInputAccessory: {
    height: 0,
  },
  toolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonDisabled: {
    opacity: 0.45,
  },
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F8FE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCircleDisabled: {
    backgroundColor: '#8EC8F6',
  },
  editorWrap: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  editorWrapKeyboard: {
    paddingTop: 28,
    paddingBottom: 16,
  },
  nameInput: {
    fontSize: 34,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    paddingVertical: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderSlot: {
    flex: 1,
  },
  genderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
  },
  genderCardSelected: {
    borderColor: '#2F8FE8',
    backgroundColor: '#E6F4FC',
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  genderLabelSelected: {
    color: '#3730A3',
  },
  optionCopy: {
    alignItems: 'center',
    gap: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 2,
    lineHeight: 15,
  },
  metricEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  metricInput: {
    minWidth: 120,
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  metricUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#667085',
  },
  goalEditor: {
    gap: 8,
    paddingBottom: 4,
  },
  goalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  goalHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
    textAlign: 'center',
    marginBottom: 4,
  },
});
