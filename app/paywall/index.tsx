import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WelcomeScreenMock } from '@/components/onboarding/welcome-screen-mocks';
import { PAYWALL_H_PADDING, PaywallCta, getPaywallTitleTop } from '@/components/paywall/PaywallCta';
import { APP_BRAND_NAME } from '@/constants/app';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { usePaywallOfferings } from '@/src/services/revenuecat';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHONE_WIDTH = Math.min(280, SCREEN_WIDTH * 0.65);
const PHONE_HEIGHT = PHONE_WIDTH * 2;
const PHONE_VISIBLE_HEIGHT = PHONE_HEIGHT * 0.75;

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function SoftPaywallScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const { catalog } = usePaywallOfferings();

  const handleContinue = async () => {
    await trackEvent('paywall_soft_continued');
    router.push('/paywall/reminder');
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: getPaywallTitleTop(insets.top) },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {fill(t.screens.paywall.intro.tryFree, { app: APP_BRAND_NAME })}
        </Text>

        <View style={styles.heroWrap}>
          <View style={styles.phoneWrap}>
            <View style={[styles.phoneFrame, { borderColor: colors.border }]}>
              <View style={styles.dynamicIsland} />
              <View
                style={[
                  styles.phoneScreen,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}>
                <WelcomeScreenMock kind="today" />
              </View>
            </View>
            <LinearGradient
              colors={[
                withAlpha(colors.background, '00'),
                withAlpha(colors.background, 'B3'),
                colors.background,
              ]}
              locations={[0, 0.55, 1]}
              style={styles.phoneBleed}
            />
          </View>
        </View>
      </View>

      <PaywallCta
        label={fill(t.screens.paywall.cta.tryFor, { price: catalog.trialCtaLabel })}
        onPress={handleContinue}
      />
    </View>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // —— Layout ——
  screen: { 
    flex: 1 
  },
  content: {
    flex: 1,
    paddingHorizontal: PAYWALL_H_PADDING,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // —— Phone mock ——
  phoneWrap: {
    width: PHONE_WIDTH,
    height: PHONE_VISIBLE_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
  },
  phoneFrame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 40,
    backgroundColor: '#111827',
    padding: 8,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  dynamicIsland: {
    position: 'absolute',
    top: 16,
    width: 108,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#000000',
    zIndex: 3,
  },
  phoneScreen: {
    width: '100%',
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
  phoneBleed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
});
