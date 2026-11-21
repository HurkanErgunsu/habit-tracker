import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Bell, Check, Crown, Lock } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAYWALL_ACCENT, PAYWALL_GRADIENT, PAYWALL_H_PADDING, getPaywallTitleTop } from '@/components/paywall/PaywallCta';
import { PressableScale } from '@/components/pressable-scale';
import { APP_BRAND_NAME, APP_LEGAL_PRIVACY_URL, getTermsOfUseUrl } from '@/constants/app';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { configureRevenueCatIfNeeded, consumePendingPromoCode, hasAccessEntitlement, presentStorePromoRedemption, purchasePaywallPlan, restorePurchases, usePaywallOfferings } from '@/src/services/revenuecat';
import { getDateKey, loadHydrationState, saveHydrationState } from '@/utils/hydration-storage';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';


// ─── Constants ───────────────────────────────────────────────────────────────
type PlanId = 'yearly' | 'monthly';

const TIMELINE_ICON = 36;
const TIMELINE_LINE = 3;
const TIMELINE_LINE_LEFT = (TIMELINE_ICON - TIMELINE_LINE) / 2;
const TIMELINE_GRADIENT = ['#2F8FE8', '#5BB8F5', '#3AC885'] as const;


// ─── Helpers ─────────────────────────────────────────────────────────────────
async function openLegalUrl(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {}
}

function formatTrialEndDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function TimelineRow({
  icon,
  title,
  body,
  textColor,
  mutedColor,
  isLast = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  textColor: string;
  mutedColor: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.timelineRow, isLast && styles.timelineRowLast]}>
      <View style={styles.timelineIcon}>{icon}</View>
      <View style={styles.timelineCopy}>
        <Text style={[styles.timelineTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.timelineBody, { color: mutedColor }]}>{body}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  subtitle,
  badge,
  surface,
  border,
  text,
  muted,
  primary,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  subtitle: string;
  badge?: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      haptic
      containerStyle={styles.planSlot}
      style={[
        styles.planCard,
        {
          backgroundColor: surface,
          borderColor: selected ? primary : border,
          borderWidth: selected ? 2.5 : 1.5,
        },
      ]}>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: primary }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? primary : border,
            backgroundColor: selected ? primary : 'transparent',
          },
        ]}>
        {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
      </View>
      <Text style={[styles.planTitle, { color: text }]}>{title}</Text>
      <Text style={[styles.planPrice, { color: text }]}>{price}</Text>
      <Text style={[styles.planSubtitle, { color: muted }]}>{subtitle}</Text>
    </PressableScale>
  );
}


// ─── Screen ──────────────────────────────────────────────────────────────────
export default function SubscribePaywallScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const { catalog, loading, refresh } = usePaywallOfferings();
  const params = useLocalSearchParams<{ reminderDays?: string }>();
  const reminderDays = Number(params.reminderDays ?? '1') === 2 ? 2 : 1;
  const [plan, setPlan] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState(false);

  const trialDays = catalog.trialDays;
  const selectedPlan = plan === 'yearly' ? catalog.yearly : catalog.monthly;
  const trialCta = fill(t.screens.paywall.cta.tryFor, { price: catalog.trialCtaLabel });
  const ctaLabel =
    plan === 'yearly' || selectedPlan.hasFreeTrial
      ? trialCta
      : `${t.common.continue} · ${fill(t.screens.paywall.subscribe.perMonth, { price: selectedPlan.priceString })}`;
  const subscriptionStartLabel = useMemo(() => formatTrialEndDate(trialDays), [trialDays]);
  const reminderDayLabel = fill(t.screens.paywall.subscribe.reminderDay, { n: reminderDays });
  const discountBadge =
    catalog.discountPercent && catalog.discountPercent > 0
      ? fill(t.screens.paywall.subscribe.percentOff, { n: catalog.discountPercent })
      : undefined;

  const completePaywall = useCallback(async () => {
    const existing = await loadHydrationState();
    const today = getDateKey();
    await saveHydrationState({
      ...existing,
      paywallCompleted: true,
      trialReminderDays: reminderDays,
      lastProgressDate: existing.lastProgressDate ?? today,
    });
    router.replace('/(tabs)');
  }, [reminderDays]);

  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingPromoCode();
      if (pending) {
        void presentStorePromoRedemption(pending).catch(() => {});
      }
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    let listener: ((info: CustomerInfo) => void) | undefined;

    void (async () => {
      const configured = await configureRevenueCatIfNeeded();
      if (!configured || cancelled) return;

      listener = (info) => {
        if (hasAccessEntitlement(info)) {
          void completePaywall();
        }
      };
      Purchases.addCustomerInfoUpdateListener(listener);
    })();

    return () => {
      cancelled = true;
      if (listener) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [completePaywall]);

  const handlePurchase = async () => {
    setBusy(true);
    try {
      if (loading) return;

      await trackEvent('paywall_purchase_tapped', {
        plan,
        reminder_days: reminderDays,
        price_string: selectedPlan.priceString,
        has_package: Boolean(selectedPlan.package),
      });

      let result = await purchasePaywallPlan(selectedPlan);

      if (!result.success && result.reason === 'package_not_available') {
        await refresh();
        result = await purchasePaywallPlan(selectedPlan);
      }

      if (result.success) {
        await completePaywall();
        return;
      }

      if (result.reason === 'cancelled') return;

      if (result.reason === 'missing_api_key') {
        Alert.alert(
          t.screens.paywall.subscribe.purchasesUnavailableTitle,
          t.screens.paywall.subscribe.purchasesUnavailableBody
        );
        return;
      }

      if (result.reason === 'package_not_available') {
        Alert.alert(
          t.screens.paywall.subscribe.subscriptionsUnavailableTitle,
          t.screens.paywall.subscribe.subscriptionsUnavailableBody
        );
        return;
      }

      if (result.reason === 'network_error') {
        Alert.alert(
          t.screens.paywall.subscribe.connectionErrorTitle,
          t.screens.paywall.subscribe.connectionErrorBody
        );
        return;
      }

      Alert.alert(
        t.screens.paywall.subscribe.purchaseUnavailableTitle,
        t.screens.paywall.subscribe.purchaseUnavailableBody
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePromoPress = async () => {
    await trackEvent('paywall_promo_tapped');
    try {
      await presentStorePromoRedemption();
    } catch {
      Alert.alert(
        t.screens.paywall.subscribe.promoUnavailableTitle,
        t.screens.paywall.subscribe.promoUnavailableBody
      );
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      await trackEvent('paywall_restore_tapped');
      const result = await restorePurchases();
      if (result.success) {
        if (result.alreadyActive) {
          Alert.alert(t.screens.paywall.subscribe.alreadyActive);
        }
        await completePaywall();
        return;
      }
      Alert.alert(t.screens.paywall.subscribe.nothingToRestore, t.screens.paywall.subscribe.noPurchasesFound);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: getPaywallTitleTop(insets.top) },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {fill(t.screens.paywall.subscribe.startTrial, { days: trialDays })}
        </Text>

        <View style={styles.middle}>
          <View style={styles.timeline}>
            <View style={styles.timelineLine}>
              <LinearGradient
                colors={[...TIMELINE_GRADIENT]}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            <TimelineRow
              icon={<Lock size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />}
              title={t.screens.paywall.subscribe.today}
              body={fill(t.screens.paywall.subscribe.unlockBody, { app: APP_BRAND_NAME })}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <TimelineRow
              icon={<Bell size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />}
              title={reminderDayLabel}
              body={t.screens.paywall.subscribe.reminderBody}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <TimelineRow
              icon={<Crown size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />}
              title={fill(t.screens.paywall.subscribe.trialEndDay, { n: trialDays })}
              body={fill(t.screens.paywall.subscribe.trialEndBody, { date: subscriptionStartLabel })}
              textColor={colors.text}
              mutedColor={colors.textMuted}
              isLast
            />
          </View>

          <View style={styles.plansRow}>
            <PlanCard
              selected={plan === 'yearly'}
              onPress={() => setPlan('yearly')}
              title={t.screens.paywall.subscribe.yearly}
              price={fill(t.screens.paywall.subscribe.perYear, { price: catalog.yearly.priceString })}
              subtitle={fill(t.screens.paywall.subscribe.yearlySubtitle, {
                price: catalog.yearly.priceString,
              })}
              badge={discountBadge}
              surface={colors.surface}
              border={colors.border}
              text={colors.text}
              muted={colors.textMuted}
              primary={colors.primary}
            />
            <PlanCard
              selected={plan === 'monthly'}
              onPress={() => setPlan('monthly')}
              title={t.screens.paywall.subscribe.monthly}
              price={fill(t.screens.paywall.subscribe.perMonth, {
                price: catalog.monthly.priceString,
              })}
              subtitle={t.screens.paywall.subscribe.monthlySubtitle}
              surface={colors.surface}
              border={colors.border}
              text={colors.text}
              muted={colors.textMuted}
              primary={colors.primary}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 48), backgroundColor: colors.background },
        ]}>
        <Pressable onPress={handlePromoPress} disabled={busy} style={styles.promoButton}>
          <Text style={[styles.promoButtonText, { color: colors.primary }]}>
            {t.screens.paywall.subscribe.promoCode}
          </Text>
        </Pressable>

        {plan === 'yearly' || selectedPlan.hasFreeTrial ? (
          <View style={styles.trustRow}>
            <Check size={16} color={colors.primary} strokeWidth={3} />
            <Text style={[styles.trustText, { color: colors.textMuted }]}>
              {t.screens.paywall.cta.noPaymentDue}
            </Text>
          </View>
        ) : (
          <View style={styles.trustSpacer} />
        )}

        <PressableScale onPress={handlePurchase} disabled={busy || loading} scaleTo={0.97} haptic>
          <LinearGradient
            colors={[...PAYWALL_GRADIENT]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.cta}>
            <Text style={styles.ctaText}>
              {busy ? t.common.pleaseWait : loading ? t.common.loading : ctaLabel}
            </Text>
          </LinearGradient>
        </PressableScale>

        <Text style={[styles.legal, { color: colors.textMuted }]}>
          {plan === 'yearly'
            ? fill(t.screens.paywall.subscribe.perYear, { price: catalog.yearly.priceString })
            : fill(t.screens.paywall.subscribe.perMonth, { price: catalog.monthly.priceString })}
          {t.screens.paywall.subscribe.autoRenews}
        </Text>

        <View style={styles.linksRow}>
          <Pressable onPress={handleRestore} disabled={busy}>
            <Text style={[styles.linkBold, { color: colors.text }]}>
              {t.screens.paywall.subscribe.restore}
            </Text>
          </Pressable>
          <Pressable onPress={() => void openLegalUrl(getTermsOfUseUrl())}>
            <Text style={[styles.linkBold, { color: colors.text }]}>
              {t.screens.paywall.subscribe.terms}
            </Text>
          </Pressable>
          <Pressable onPress={() => void openLegalUrl(APP_LEGAL_PRIVACY_URL)}>
            <Text style={[styles.linkBold, { color: colors.text }]}>
              {t.screens.paywall.subscribe.privacy}
            </Text>
          </Pressable>
        </View>
      </View>
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
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },

  // —— Timeline ——
  timeline: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: TIMELINE_LINE_LEFT,
    top: TIMELINE_ICON / 2,
    bottom: TIMELINE_ICON / 2,
    width: TIMELINE_LINE,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  timelineRowLast: { marginBottom: 0 },
  timelineIcon: {
    width: TIMELINE_ICON,
    height: TIMELINE_ICON,
    borderRadius: TIMELINE_ICON / 2,
    backgroundColor: PAYWALL_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineCopy: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  timelineBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // —— Plans ——
  plansRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  planSlot: { 
    flex: 1 
  },
  planCard: {
    width: '100%',
    minHeight: 132,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 14,
  },
  badge: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    left: '18%',
    right: '18%',
    borderRadius: 999,
    paddingVertical: 4,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  radio: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  // —— Footer ——
  footer: {
    paddingHorizontal: PAYWALL_H_PADDING,
    paddingTop: 8,
  },
  promoButton: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  trustSpacer: { 
    height: 12 
  },
  trustText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cta: {
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
  legal: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
  },
  linksRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  linkBold: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
