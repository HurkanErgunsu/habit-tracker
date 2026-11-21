import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { getAppColors } from '@/constants/colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ONBOARDING_BRAND_GRADIENT,
  ONBOARDING_H_PADDING,
  ONBOARDING_TOTAL_STEPS,
} from '@/utils/onboarding-goal-math';

type OnboardingShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  stepNumber?: number;
  totalSteps?: number;
  showBack?: boolean;
  hideTopNav?: boolean;
  scrollEnabled?: boolean;
  ctaLabel: string;
  onCtaPress: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  contentStyle?: object;
  bodyStyle?: object;
};

export function OnboardingShell({
  children,
  title,
  subtitle,
  stepNumber = 1,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  showBack,
  hideTopNav = false,
  scrollEnabled = true,
  ctaLabel,
  onCtaPress,
  ctaDisabled,
  ctaLoading,
  contentStyle,
  bodyStyle,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const t = useAppStrings();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Welcome has hideTopNav; every other onboarding page shows back + progress.
  const canGoBack = showBack ?? !hideTopNav;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const ctaBottomPad = keyboardVisible ? 8 : Math.max(insets.bottom + 16, 16);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        {!hideTopNav ? (
          <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
            <View style={styles.navRow}>
              {canGoBack ? (
                <PressableScale
                  onPress={() => router.back()}
                  scaleTo={0.92}
                  haptic
                  style={styles.backButton}
                  accessibilityLabel={t.common.goBack}>
                  <LinearGradient
                    colors={[...ONBOARDING_BRAND_GRADIENT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.backGradient}>
                    <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
                  </LinearGradient>
                </PressableScale>
              ) : null}
              <View style={styles.progressTrack}>
                {Array.from({ length: totalSteps }).map((_, index) => {
                  const active = index < stepNumber;
                  return (
                    <View
                      key={`step-${index}`}
                      style={[
                        styles.progressSegment,
                        active ? styles.progressActive : { backgroundColor: colors.ringTrack },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ height: insets.top + 4 }} />
        )}

        {scrollEnabled ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: 24,
                paddingHorizontal: ONBOARDING_H_PADDING,
              },
              contentStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            {title ? (
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            <View style={[styles.body, bodyStyle]}>{children}</View>
          </ScrollView>
        ) : (
          <View
            style={[
              styles.flex,
              styles.content,
              {
                paddingBottom: 24,
                paddingHorizontal: ONBOARDING_H_PADDING,
              },
              contentStyle,
            ]}>
            {title ? (
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            <View style={[styles.body, styles.bodyFill, bodyStyle]}>{children}</View>
          </View>
        )}

        <View style={[styles.ctaWrap, { paddingBottom: ctaBottomPad, backgroundColor: colors.background }]}>
          <PressableScale
            onPress={onCtaPress}
            disabled={ctaDisabled || ctaLoading}
            scaleTo={0.96}
            haptic
            style={(ctaDisabled || ctaLoading) && styles.ctaDisabled}>
            <LinearGradient colors={[...ONBOARDING_BRAND_GRADIENT]} style={styles.ctaButton}>
              <View style={styles.ctaPressable}>
                <Text style={styles.ctaText}>{ctaLoading ? t.common.pleaseWait : ctaLabel}</Text>
              </View>
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function WhiteCard({ children, style }: { children: ReactNode; style?: object }) {
  const colors = getAppColors(useColorScheme());

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: ONBOARDING_H_PADDING,
    paddingBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#2F8FE8',
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
  progressActive: { backgroundColor: '#2F8FE8' },
  content: { flexGrow: 1, paddingTop: 16 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    marginBottom: 24,
  },
  body: { gap: 12 },
  bodyFill: { flex: 1 },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  ctaWrap: {
    paddingHorizontal: ONBOARDING_H_PADDING,
    paddingTop: 8,
  },
  ctaButton: {
    borderRadius: 999,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  ctaPressable: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
});
