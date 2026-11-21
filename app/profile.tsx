import { useFocusEffect } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { Fragment, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
    getSettingsModalOptions,
    SettingsModalScrollChrome,
} from '@/components/navigation/settings-sheet-chrome';
import { ProfileAvatar } from '@/components/settings/profile-avatar';
import {
    ProfileFieldSheet,
    type ProfileEditField,
} from '@/components/settings/profile-field-sheet';
import {
    ProfilePhotoExpand,
    type AvatarOrigin,
} from '@/components/settings/profile-photo-expand';
import {
  getSettingsCardStyle,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from '@/components/settings/settings-group';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAppColors } from '@/constants/colors';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useAppStrings } from '@/hooks/use-app-strings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTrialStatus } from '@/src/services/revenuecat/trial';
import { Haptics, impactAsync } from '@/utils/haptics';
import { notifyHydrationChanged } from '@/utils/hydration-events';
import {
    getEffectiveGoalMl,
    loadHydrationState,
    saveHydrationState,
    type HydrationState,
} from '@/utils/hydration-storage';
import { getLocaleTag } from '@/utils/i18n';
import { getRecommendedMl } from '@/utils/onboarding-goal-math';
import {
    formatActivityLevel,
    formatClimate,
    formatClockTime,
    formatGender,
    formatGoalMl,
    getDisplayName,
} from '@/utils/profile-formatters';
import {
    pickProfilePhotoFromLibrary,
    takeProfilePhoto,
} from '@/utils/profile-photo';
import { scheduleTrialDailyNotifications } from '@/utils/trial-notifications';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const t = useAppStrings();
  const { language } = useAppPreferences();
  const locale = getLocaleTag(language);
  const [profile, setProfile] = useState<HydrationState | null>(null);
  const [activeField, setActiveField] = useState<ProfileEditField | null>(null);
  const [photoExpandVisible, setPhotoExpandVisible] = useState(false);
  const [avatarOrigin, setAvatarOrigin] = useState<AvatarOrigin | null>(null);
  const pendingPhotoActionRef = useRef<'camera' | 'library' | null>(null);
  const avatarMeasureRef = useRef<View>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadProfile() {
        const stored = await loadHydrationState();
        if (!isMounted) {
          return;
        }

        const nextRecommended = getRecommendedMl({
          gender: stored.gender,
          weightKg: stored.weightKg,
          heightCm: stored.heightCm,
          age: stored.age,
          activityLevel: stored.activityLevel,
          climate: stored.climate,
        });
        const usesManualGoal = stored.usesManualGoal ?? false;
        const needsSync =
          stored.recommendedMl !== nextRecommended ||
          (!usesManualGoal && stored.goalMl !== nextRecommended);

        if (needsSync) {
          const synced = {
            ...stored,
            recommendedMl: nextRecommended,
            goalMl: usesManualGoal ? stored.goalMl : nextRecommended,
          };
          await saveHydrationState(synced);
          if (!isMounted) {
            return;
          }
          setProfile(synced);
          notifyHydrationChanged();
          return;
        }

        setProfile(stored);
      }

      loadProfile();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleSave = useCallback(async (updates: Partial<HydrationState>) => {
    const current = profileRef.current;
    if (!current) {
      return;
    }

    const nextProfile = { ...current, ...updates };
    await saveHydrationState(nextProfile);
    setProfile(nextProfile);
    notifyHydrationChanged();

    if (updates.wakeTime) {
      const trial = await getTrialStatus();
      if (trial.isTrial) {
        await scheduleTrialDailyNotifications(
          nextProfile.wakeTime,
          trial,
          nextProfile.trialReminderDays
        );
      }
    }
  }, []);

  const handlePhotoExpandDismissed = useCallback(() => {
    const action = pendingPhotoActionRef.current;
    pendingPhotoActionRef.current = null;
    if (!action) return;

    void (async () => {
      const uri =
        action === 'camera' ? await takeProfilePhoto() : await pickProfilePhotoFromLibrary();
      if (!uri) return;
      await handleSave({ profilePhotoUri: uri });
    })();
  }, [handleSave]);

  if (!profile) {
    return (
      <>
        <Stack.Screen options={getSettingsModalOptions(colors.background)} />
        <View style={[styles.screen, { backgroundColor: colors.background }]} />
      </>
    );
  }

  const displayName = getDisplayName(profile.displayName, t.common.member);
  const usesManualGoal = profile.usesManualGoal ?? false;
  const recommendedMl = getRecommendedMl({
    gender: profile.gender,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    activityLevel: profile.activityLevel,
    climate: profile.climate,
  });
  const effectiveGoalMl = usesManualGoal ? getEffectiveGoalMl(profile) : recommendedMl;

  async function handleManualGoalToggle(enabled: boolean) {
    void impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (enabled) {
      await handleSave({ usesManualGoal: true, recommendedMl });
      return;
    }

    await handleSave({
      usesManualGoal: false,
      recommendedMl,
      goalMl: recommendedMl,
    });
  }

  const cardStyle = getSettingsCardStyle(colors);

  const dividerStyle = {
    backgroundColor: colors.border,
    marginLeft: 16,
    marginRight: 16,
  };

  function openPhotoExpand() {
    void impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarMeasureRef.current?.measureInWindow((x, y, width, height) => {
      setAvatarOrigin({ x, y, width, height });
      setPhotoExpandVisible(true);
    });
  }

  function handleTakePhoto() {
    pendingPhotoActionRef.current = 'camera';
    setPhotoExpandVisible(false);
  }

  function handleChooseFromGallery() {
    pendingPhotoActionRef.current = 'library';
    setPhotoExpandVisible(false);
  }

  type ProfileRow = {
    key: string;
    label: string;
    value: string;
    onPress: () => void;
  };

  const profileSections: { key: string; title: string; rows: ProfileRow[] }[] = [
    {
      key: 'personal',
      title: t.screens.profile.personal,
      rows: [
        {
          key: 'displayName',
          label: t.screens.profile.name,
          value: displayName,
          onPress: () => setActiveField('displayName'),
        },
        {
          key: 'gender',
          label: t.screens.profile.gender,
          value: formatGender(profile.gender, t),
          onPress: () => setActiveField('gender'),
        },
        {
          key: 'age',
          label: t.screens.profile.age,
          value: `${profile.age} ${t.common.yrs}`,
          onPress: () => setActiveField('age'),
        },
        {
          key: 'weightKg',
          label: t.screens.profile.weight,
          value: `${profile.weightKg} ${t.common.kg}`,
          onPress: () => setActiveField('weightKg'),
        },
        {
          key: 'heightCm',
          label: t.screens.profile.height,
          value: `${profile.heightCm} ${t.common.cm}`,
          onPress: () => setActiveField('heightCm'),
        },
      ],
    },
    {
      key: 'lifestyle',
      title: t.screens.profile.lifestyle,
      rows: [
        {
          key: 'activityLevel',
          label: t.screens.profile.activityLevel,
          value: formatActivityLevel(profile.activityLevel, t),
          onPress: () => setActiveField('activityLevel'),
        },
        {
          key: 'climate',
          label: t.screens.profile.climate,
          value: formatClimate(profile.climate, t),
          onPress: () => setActiveField('climate'),
        },
      ],
    },
    {
      key: 'schedule',
      title: t.screens.profile.schedule,
      rows: [
        {
          key: 'wakeTime',
          label: t.screens.profile.wakeTime,
          value: formatClockTime(profile.wakeTime),
          onPress: () => setActiveField('wakeTime'),
        },
        {
          key: 'sleepTime',
          label: t.screens.profile.sleepTime,
          value: formatClockTime(profile.sleepTime),
          onPress: () => setActiveField('sleepTime'),
        },
      ],
    },
  ];

  return (
    <>
      <Stack.Screen options={getSettingsModalOptions(colors.background)} />

      <SettingsModalScrollChrome title={t.screens.profile.title}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroRow}>
            <View
              ref={avatarMeasureRef}
              collapsable={false}
              style={photoExpandVisible ? styles.avatarHidden : undefined}>
              <Pressable
                onPress={openPhotoExpand}
                accessibilityRole="button"
                accessibilityLabel={t.screens.profile.photo}
                hitSlop={8}>
                <ProfileAvatar photoUri={profile.profilePhotoUri} editable />
              </Pressable>
            </View>
            <View style={styles.heroText}>
              <ThemedText style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <ThemedText style={[styles.heroGoal, { color: colors.textMuted }]} numberOfLines={1}>
                {formatGoalMl(effectiveGoalMl, t, locale)}
              </ThemedText>
            </View>
          </View>
        </View>

        {profileSections.map((section) => (
          <View key={section.key} style={styles.contentSection}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title}
            </ThemedText>
            <SettingsGroup style={cardStyle}>
              {section.rows.map((row, index) => (
                <Fragment key={row.key}>
                  <SettingsRow
                    onPress={() => {
                      void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      row.onPress();
                    }}>
                    <ThemedText style={[styles.label, { color: colors.text }]}>{row.label}</ThemedText>
                    <View style={styles.valueWrap}>
                      <ThemedText style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
                        {row.value}
                      </ThemedText>
                      <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
                    </View>
                  </SettingsRow>
                  {index < section.rows.length - 1 ? <SettingsDivider style={dividerStyle} /> : null}
                </Fragment>
              ))}
            </SettingsGroup>
          </View>
        ))}

        <View style={styles.contentSection}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t.screens.profile.goal}
          </ThemedText>
          <SettingsGroup style={cardStyle}>
            <SettingsRow>
              <ThemedText style={[styles.label, { color: colors.text }]}>
                {t.screens.profile.recommended}
              </ThemedText>
              <ThemedText style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
                {`${recommendedMl.toLocaleString(locale)} ${t.common.ml}`}
              </ThemedText>
            </SettingsRow>
            <SettingsDivider style={dividerStyle} />
            <SettingsRow
              onPress={
                usesManualGoal
                  ? () => {
                      void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveField('goalMl');
                    }
                  : undefined
              }>
              <ThemedText style={[styles.label, { color: colors.text }]}>
                {t.screens.profile.dailyGoal}
              </ThemedText>
              <View style={styles.valueWrap}>
                <ThemedText style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
                  {`${effectiveGoalMl.toLocaleString(locale)} ${t.common.ml}`}
                </ThemedText>
                {usesManualGoal ? (
                  <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
                ) : null}
              </View>
            </SettingsRow>
            <SettingsDivider style={dividerStyle} />
            <SettingsRow
              onPress={() => {
                void handleManualGoalToggle(!usesManualGoal);
              }}>
              <ThemedText style={[styles.label, { color: colors.text }]}>
                {t.screens.profile.setManually}
              </ThemedText>
              <Switch
                value={usesManualGoal}
                trackColor={{ false: colors.ringTrack, true: colors.primary }}
                thumbColor="#FFFFFF"
                pointerEvents="none"
              />
            </SettingsRow>
          </SettingsGroup>
        </View>
      </SettingsModalScrollChrome>

      <ProfileFieldSheet
        visible={activeField !== null}
        field={activeField}
        profile={profile}
        onClose={() => setActiveField(null)}
        onSave={handleSave}
      />

      <ProfilePhotoExpand
        visible={photoExpandVisible}
        origin={avatarOrigin}
        photoUri={profile.profilePhotoUri}
        onClose={() => setPhotoExpandVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromGallery}
        onDismissed={handlePhotoExpandDismissed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarHidden: {
    opacity: 0,
  },
  heroText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  heroGoal: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  contentSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
});
