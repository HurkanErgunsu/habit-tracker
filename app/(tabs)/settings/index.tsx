import { getTabBarScrollInset } from '@/components/tab-bar-insets';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SquareArrowOutUpRight } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Fragment, useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapsibleLargeTitleScreen } from '@/components/navigation/collapsible-large-title-screen';
import { ProfileAvatar } from '@/components/settings/profile-avatar';
import {
  getSettingsCardStyle,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from '@/components/settings/settings-group';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  APP_BRAND_NAME,
  APP_DEVELOPER_APPS_URL,
  APP_LEGAL_PRIVACY_URL,
  SKIP_LAUNCH_GATES,
  getTermsOfUseUrl,
} from '@/constants/app';
import { APP_LANGUAGES } from '@/constants/app-locales';
import { getAppColors } from '@/constants/colors';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { restorePurchases } from '@/src/services/revenuecat';
import { Haptics, impactAsync } from '@/utils/haptics';
import {
  getEffectiveGoalMl,
  loadHydrationState,
  saveHydrationState,
  type HydrationState,
} from '@/utils/hydration-storage';
import { getLocaleTag } from '@/utils/i18n';
import { openExternalUrl } from '@/utils/open-external-url';
import { openSupportEmail } from '@/utils/open-support-email';
import { formatGoalMl, getDisplayName } from '@/utils/profile-formatters';
import { requestAppReview } from '@/utils/request-app-review';
import { shareApp } from '@/utils/share-app';

type SettingAction = 'share' | 'rate' | 'more-apps' | 'help' | 'restore' | 'privacy' | 'terms';

type SettingItem = {
  id: SettingAction;
  title: string;
  icon: ComponentProps<typeof IconSymbol>['name'];
  legal?: boolean;
  external?: boolean;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarScrollInset = getTabBarScrollInset(insets.bottom);
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const { theme, language, hapticsEnabled, strings: t, setHapticsEnabled } = useAppPreferences();
  const locale = getLocaleTag(language);
  const [profile, setProfile] = useState<HydrationState | null>(null);

  const themeLabel =
    theme === 'light'
      ? t.screens.settings.light
      : theme === 'dark'
        ? t.screens.settings.dark
        : t.screens.settings.system;
  const languageLabel =
    APP_LANGUAGES.find((item) => item.code === language)?.nativeName ?? 'English';
  const goalSubtitle = profile
    ? formatGoalMl(getEffectiveGoalMl(profile), t, locale)
    : t.screens.profile.goal;
  const profileName = profile
    ? getDisplayName(profile.displayName, t.common.member)
    : t.screens.profile.title;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSettings() {
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

        setProfile(stored);
      }

      loadSettings();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  async function handleRestorePurchases() {
    const result = await restorePurchases();
    if (result.success) {
      const stored = await loadHydrationState();
      await saveHydrationState({ ...stored, paywallCompleted: true });
      if (result.alreadyActive) {
        Alert.alert(t.screens.settings.restoreAlreadyActive);
      } else {
        Alert.alert(t.screens.settings.restoreSuccess);
      }
      return;
    }

    if (result.reason === 'nothing_to_restore') {
      Alert.alert(
        t.screens.paywall.subscribe.nothingToRestore,
        t.screens.paywall.subscribe.noPurchasesFound
      );
      return;
    }

    Alert.alert(t.screens.settings.restoreFailed);
  }

  async function handleSettingPress(id: SettingAction) {
    switch (id) {
      case 'share':
        await shareApp();
        break;
      case 'rate':
        await requestAppReview();
        break;
      case 'more-apps':
        await openExternalUrl(APP_DEVELOPER_APPS_URL);
        break;
      case 'help':
        await openSupportEmail();
        break;
      case 'restore':
        await handleRestorePurchases();
        break;
      case 'privacy':
        await openExternalUrl(APP_LEGAL_PRIVACY_URL);
        break;
      case 'terms':
        await openExternalUrl(getTermsOfUseUrl());
        break;
      default:
        break;
    }
  }

  const supportItems: SettingItem[] = [
    { id: 'share', title: t.screens.settings.shareApp, icon: 'square.and.arrow.up' },
    { id: 'rate', title: t.screens.settings.rateApp, icon: 'star' },
    { id: 'more-apps', title: t.screens.settings.moreApps, icon: 'square.grid.2x2', external: true },
    { id: 'help', title: t.screens.settings.getHelp, icon: 'questionmark.circle' },
    { id: 'restore', title: t.screens.settings.restorePurchases, icon: 'arrow.clockwise' },
  ];

  const legalItems: SettingItem[] = [
    { id: 'privacy', title: t.screens.settings.privacy, icon: 'lock.shield', legal: true },
    { id: 'terms', title: t.screens.settings.terms, icon: 'doc.plaintext', legal: true },
  ];

  const cardStyle = getSettingsCardStyle(colors);

  return (
    <CollapsibleLargeTitleScreen
      title={t.screens.settings.title}
      scrollBottomInset={tabBarScrollInset}
      contentContainerStyle={styles.scrollContent}>
      {profile ? (
        <View style={styles.firstSection}>
          <SettingsGroup style={cardStyle}>
            <SettingsRow
              onPress={() => {
                void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile');
              }}>
              <View style={styles.rowLeft}>
                <ProfileAvatar photoUri={profile.profilePhotoUri} />
                <View style={styles.rowCopy}>
                  <ThemedText style={[styles.profileTitle, { color: colors.text }]}>
                    {profileName}
                  </ThemedText>
                  <ThemedText style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                    {goalSubtitle}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textMuted} />
            </SettingsRow>
          </SettingsGroup>
        </View>
      ) : null}

      <View style={styles.contentSection}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {t.screens.settings.general}
        </ThemedText>
        <SettingsGroup style={cardStyle}>
          <SettingsRow
            onPress={() => {
              void impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/theme');
            }}>
            <View style={styles.rowLeft}>
              <IconSymbol name="circle.lefthalf.filled" size={24} color={colors.text} />
              <ThemedText style={[styles.rowText, { color: colors.text }]}>
                {t.screens.settings.theme}
              </ThemedText>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={[styles.rowValue, { color: colors.textMuted }]}>{themeLabel}</ThemedText>
              <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
            </View>
          </SettingsRow>
          <SettingsDivider style={{ backgroundColor: colors.border }} />
          <SettingsRow
            onPress={() => {
              void impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/language');
            }}>
            <View style={styles.rowLeft}>
              <IconSymbol name="globe" size={24} color={colors.text} />
              <ThemedText style={[styles.rowText, { color: colors.text }]}>
                {t.screens.settings.language}
              </ThemedText>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={[styles.rowValue, { color: colors.textMuted }]}>
                {languageLabel}
              </ThemedText>
              <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
            </View>
          </SettingsRow>
          <SettingsDivider style={{ backgroundColor: colors.border }} />
          <SettingsRow
            onPress={() => {
              void (async () => {
                const next = !hapticsEnabled;
                await setHapticsEnabled(next);
                if (next) {
                  await impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              })();
            }}>
            <View style={styles.rowLeft}>
              <IconSymbol name="hand.tap.fill" size={24} color={colors.text} />
              <ThemedText style={[styles.rowText, { color: colors.text }]}>
                {t.screens.settings.haptics}
              </ThemedText>
            </View>
            <Switch
              value={hapticsEnabled}
              trackColor={{ false: colors.ringTrack, true: colors.primary }}
              thumbColor="#FFFFFF"
              pointerEvents="none"
            />
          </SettingsRow>
        </SettingsGroup>
      </View>

      <View style={styles.contentSection}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {t.screens.settings.support}
        </ThemedText>
        <SettingsGroup style={cardStyle}>
          {supportItems.map((item, index) => (
            <Fragment key={item.id}>
              <SettingsRow
                onPress={() => {
                  void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void handleSettingPress(item.id);
                }}>
                <View style={styles.rowLeft}>
                  <IconSymbol name={item.icon} size={24} color={colors.text} />
                  <ThemedText style={[styles.rowText, { color: colors.text }]}>{item.title}</ThemedText>
                </View>
                {item.external || item.legal ? (
                  <SquareArrowOutUpRight size={16} color={colors.textMuted} strokeWidth={2.2} />
                ) : (
                  <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
                )}
              </SettingsRow>
              {index < supportItems.length - 1 ? (
                <SettingsDivider style={{ backgroundColor: colors.border }} />
              ) : null}
            </Fragment>
          ))}
        </SettingsGroup>
      </View>

      <View style={styles.contentSection}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {t.screens.settings.legalPrivacy}
        </ThemedText>
        <SettingsGroup style={cardStyle}>
          {legalItems.map((item, index) => (
            <Fragment key={item.id}>
              <SettingsRow
                onPress={() => {
                  void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void handleSettingPress(item.id);
                }}>
                <View style={styles.rowLeft}>
                  <IconSymbol name={item.icon} size={24} color={colors.text} />
                  <ThemedText style={[styles.rowText, { color: colors.text }]}>{item.title}</ThemedText>
                </View>
                <SquareArrowOutUpRight size={16} color={colors.textMuted} strokeWidth={2.2} />
              </SettingsRow>
              {index < legalItems.length - 1 ? (
                <SettingsDivider style={{ backgroundColor: colors.border }} />
              ) : null}
            </Fragment>
          ))}
        </SettingsGroup>
      </View>

      <View style={styles.footer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.footerLogo}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
          {APP_BRAND_NAME} v1.0.0
        </ThemedText>
        <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
          {t.screens.settings.disclaimer}
        </ThemedText>
      </View>
    </CollapsibleLargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 24,
  },
  /** Title → profile: 24 gap − 8 = 16 (matches analytics title → segment) */
  firstSection: {
    marginTop: -8,
  },
  contentSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowCopy: { flexShrink: 1, gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileTitle: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  rowText: { fontSize: 16, fontWeight: '500', lineHeight: 20 },
  rowSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 16 },
  rowValue: { fontSize: 15, fontWeight: '500' },
  footer: { alignItems: 'center', gap: 0, marginTop: 16 },
  footerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 8,
  },
  footerText: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
});
