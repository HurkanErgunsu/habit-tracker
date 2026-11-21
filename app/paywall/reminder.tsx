import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAYWALL_GRADIENT, PAYWALL_H_PADDING, PaywallCta, getPaywallTitleTop } from '@/components/paywall/PaywallCta';
import { PressableScale } from '@/components/pressable-scale';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { usePaywallOfferings } from '@/src/services/revenuecat';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
type ReminderOption = 1 | 2;


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function TrialReminderScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const { catalog } = usePaywallOfferings();
  const [selected, setSelected] = useState<ReminderOption>(1);

  const options: { days: ReminderOption; label: string; recommended?: boolean }[] = [
    { days: 1, label: t.screens.paywall.reminder.oneDayBefore, recommended: true },
    { days: 2, label: t.screens.paywall.reminder.twoDaysBefore },
  ];

  const handleContinue = async () => {
    await trackEvent('paywall_reminder_selected', { days_before: selected });
    router.push({ pathname: '/paywall/subscribe', params: { reminderDays: String(selected) } });
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: getPaywallTitleTop(insets.top) },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.screens.paywall.reminder.title}
        </Text>

        <View style={styles.middle}>
          <View style={styles.hero}>
            <LinearGradient
              colors={[...PAYWALL_GRADIENT]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[styles.bellOrb, { shadowColor: colors.primary }]}>
              <Bell size={72} color="#FFFFFF" strokeWidth={2.2} fill="rgba(255,255,255,0.18)" />
            </LinearGradient>
            <View style={[styles.badge, { borderColor: colors.background }]}>
              <Text style={styles.badgeText}>1</Text>
            </View>
          </View>

          <View style={styles.options}>
            {options.map((option) => {
              const isSelected = selected === option.days;
              return (
                <PressableScale
                  key={option.days}
                  onPress={() => setSelected(option.days)}
                  scaleTo={0.98}
                  haptic
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2.5 : 1.5,
                    },
                  ]}>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                    {option.recommended ? (
                      <Text style={[styles.recommended, { color: colors.primary }]}>
                        {t.common.recommended}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}>
                    {isSelected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                </PressableScale>
              );
            })}
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
  middle: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
  },

  // —— Hero ——
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellOrb: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: '32%',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },

  // —— Options ——
  options: { 
    gap: 12 
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  recommended: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});