import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react-native';
import React, { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { APP_BRAND_NAME, APP_LEGAL_PRIVACY_URL, getTermsOfUseUrl } from '@/constants/app';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { loadHydrationState, saveHydrationState } from '@/utils/hydration-storage';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;
const STEP = 6;
const H_PADDING = 16;
const BRAND_GRADIENT = ['#6BC4F5', '#2F8FE8', '#1A74D0'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openLegalUrl(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {}
}

function ConsentRow({
  selected,
  onPress,
  label,
  primary,
  borderColor,
}: {
  selected: boolean;
  onPress: () => void;
  label: ReactNode;
  primary: string;
  borderColor: string;
}) {
  return (
    <View style={styles.optionRow}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}>
        <View style={[styles.radio, { borderColor: selected ? primary : borderColor }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: primary }]} /> : null}
        </View>
      </Pressable>
      <Pressable onPress={onPress} style={styles.optionLabel}>
        {label}
      </Pressable>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.consent;
  const { draft, recommendedMl } = useOnboarding();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const canContinue = acceptedTerms;

  const onContinue = async () => {
    if (!acceptedTerms || busy) return;
    setBusy(true);
    try {
      await trackEvent('onboarding_step_completed', {
        step_name: 'consent',
        step_number: STEP,
        accepted_terms: true,
      });

      const existing = await loadHydrationState();
      await saveHydrationState({
        ...existing,
        weightKg: draft.weightKg,
        goalMl: recommendedMl,
        recommendedMl,
        usesManualGoal: false,
        gender: draft.gender,
        heightCm: draft.heightCm,
        age: draft.age,
        activityLevel: draft.activityLevel,
        climate: draft.climate,
        wakeTime: draft.wakeTime,
        sleepTime: draft.sleepTime,
        onboardingCompleted: true,
        paywallCompleted: false,
      });

      router.push('/onboarding/processing');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.92}
            haptic
            style={[styles.backButton, { shadowColor: colors.primary }]}
            accessibilityLabel={t.common.goBack}>
            <LinearGradient
              colors={[...BRAND_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.backGradient}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </LinearGradient>
          </PressableScale>
          <View style={styles.progressTrack}>
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <View
                key={`step-${index}`}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: index < STEP ? colors.primary : colors.ringTrack,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.shieldWrap}>
            <Sparkles size={18} color={colors.primary} style={styles.sparkleTL} />
            <Sparkles size={14} color={colors.primary} style={styles.sparkleTR} />
            <Sparkles size={14} color={colors.primary} style={styles.sparkleBL} />
            <Sparkles size={16} color={colors.primary} style={styles.sparkleBR} />
            <View style={[styles.shieldBadge, { backgroundColor: colors.tintSubtle }]}>
              <ShieldCheck size={42} color={colors.primary} strokeWidth={2.2} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            {fill(copy.disclaimer, { app: APP_BRAND_NAME })}
          </Text>
        </View>

        <View
          style={[
            styles.optionsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <ConsentRow
            selected={acceptedTerms}
            onPress={() => setAcceptedTerms((prev) => !prev)}
            primary={colors.primary}
            borderColor={colors.border}
            label={
              <Text style={[styles.optionText, { color: colors.textMuted }]}>
                {copy.agreePrefix}{' '}
                <Text
                  style={[styles.link, { color: colors.text }]}
                  onPress={() => void openLegalUrl(getTermsOfUseUrl())}
                  suppressHighlighting={false}>
                  {copy.termsOfUse}
                </Text>{' '}
                {copy.agreeMiddle}{' '}
                <Text
                  style={[styles.link, { color: colors.text }]}
                  onPress={() => void openLegalUrl(APP_LEGAL_PRIVACY_URL)}
                  suppressHighlighting={false}>
                  {copy.privacyPolicy}
                </Text>
                .
              </Text>
            }
          />
        </View>
      </View>

      <View
        style={[
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom + 16, 16), backgroundColor: colors.background },
        ]}>
        <PressableScale
          onPress={onContinue}
          disabled={!canContinue || busy}
          scaleTo={0.96}
          haptic={canContinue && !busy}>
          {canContinue ? (
            <LinearGradient colors={[...BRAND_GRADIENT]} style={styles.ctaButton}>
              <View style={styles.ctaPressable}>
                <Text style={styles.ctaText}>
                  {busy ? t.common.pleaseWait : copy.acceptContinue}
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.ctaButton, { backgroundColor: colors.ringTrack }]}>
              <View style={styles.ctaPressable}>
                <Text style={[styles.ctaText, { color: colors.textMuted }]}>
                  {copy.acceptContinue}
                </Text>
              </View>
            </View>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // —— Layout ——
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
  },

  // —— Nav ——
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  progressSegment: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    height: 6,
    borderRadius: 999,
  },

  // —— Hero ——
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  shieldBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleTL: { position: 'absolute', top: 10, left: 8 },
  sparkleTR: { position: 'absolute', top: 18, right: 6 },
  sparkleBL: { position: 'absolute', bottom: 16, left: 4 },
  sparkleBR: { position: 'absolute', bottom: 10, right: 12 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  disclaimer: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // —— Options ——
  optionsCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    shadowColor: '#0B1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionLabel: { flex: 1 },
  optionText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },

  // —— CTA ——
  ctaWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
  },
  ctaButton: {
    borderRadius: 999,
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  ctaPressable: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
});
