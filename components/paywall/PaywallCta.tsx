import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';

export const PAYWALL_H_PADDING = 16;
/** Water-first brand gradient (matches onboarding CTAs). */
export const PAYWALL_GRADIENT = ['#6BC4F5', '#2F8FE8', '#1A74D0'] as const;
export const PAYWALL_ACCENT = '#2F8FE8';

export function getPaywallTitleTop(insetsTop: number) {
  return insetsTop + 48;
}

type PaywallCtaProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  showTrustRow?: boolean;
};

export function PaywallCta({
  label,
  onPress,
  loading = false,
  showTrustRow = true,
}: PaywallCtaProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 48), backgroundColor: colors.background }]}>
      {showTrustRow ? (
        <View style={styles.trustRow}>
          <Check size={16} color={colors.primary} strokeWidth={3} />
          <Text style={[styles.trustText, { color: colors.textMuted }]}>
            {t.screens.paywall.cta.noPaymentDue}
          </Text>
        </View>
      ) : null}
      <PressableScale onPress={onPress} disabled={loading} scaleTo={0.97} haptic>
        <LinearGradient
          colors={[...PAYWALL_GRADIENT]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.button}>
          <Text style={styles.buttonText}>{loading ? t.common.pleaseWait : label}</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: PAYWALL_H_PADDING,
    paddingTop: 16,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  trustText: {
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
});
