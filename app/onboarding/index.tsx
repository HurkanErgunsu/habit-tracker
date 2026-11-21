import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { Carousel, Pagination, type CarouselRef } from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  WelcomeScreenMock,
  type WelcomeMockKind,
} from '@/components/onboarding/welcome-screen-mocks';
import { PressableScale } from '@/components/pressable-scale';
import { APP_BRAND_NAME } from '@/constants/app';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { fill } from '@/utils/i18n';
import { trackEvent } from '@/utils/mixpanel';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BRAND_GRADIENT = ['#6BC4F5', '#2F8FE8', '#1A74D0'] as const;

type Slide = { id: WelcomeMockKind; title: string; subtitle: string };

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const copy = t.screens.onboarding.welcome;
  const carouselRef = useRef<CarouselRef>(null);
  const progress = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageH, setStageH] = useState(SCREEN_H * 0.7);

  const slides: Slide[] = [
    {
      id: 'today',
      title: fill(copy.slide1.title, { app: APP_BRAND_NAME }),
      subtitle: fill(copy.slide1.subtitle, { app: APP_BRAND_NAME }),
    },
    {
      id: 'analytics',
      title: fill(copy.slide2.title, { app: APP_BRAND_NAME }),
      subtitle: fill(copy.slide2.subtitle, { app: APP_BRAND_NAME }),
    },
    {
      id: 'settings',
      title: fill(copy.slide3.title, { app: APP_BRAND_NAME }),
      subtitle: fill(copy.slide3.subtitle, { app: APP_BRAND_NAME }),
    },
  ];

  const phoneTop = insets.top + Math.round(SCREEN_H * 0.15);
  const bleed: [string, string, string] = [
    `${colors.background}00`,
    `${colors.background}B3`,
    colors.background,
  ];

  const onContinue = async () => {
    await trackEvent('onboarding_step_completed', {
      step_name: 'welcome',
      step_number: 1,
      carousel_index: activeIndex,
    });
    router.push('/onboarding/biometric');
  };

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={styles.stage}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setStageH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
        }}>
        <Carousel
          ref={carouselRef}
          data={slides}
          loop={false}
          style={{ width: SCREEN_W, height: stageH }}
          itemSize={SCREEN_W}
          progress={progress}
          onSnapToItem={setActiveIndex}
          animation={{ type: 'timing', duration: 280 }}
          overscrollEnabled={false}
          renderItem={({ item }) => (
            <View
              style={{ width: SCREEN_W, height: stageH, backgroundColor: colors.background }}>
              <View style={[styles.phoneStage, { top: phoneTop }]} pointerEvents="none">
                <View style={styles.phoneWrap}>
                  <View style={[styles.phoneFrame, { borderColor: colors.border }]}>
                    <View style={styles.dynamicIsland} />
                    <View
                      style={[
                        styles.phoneScreen,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}>
                      <WelcomeScreenMock kind={item.id} />
                    </View>
                  </View>
                  <LinearGradient colors={bleed} locations={[0, 0.55, 1]} style={styles.phoneBleed} />
                </View>
              </View>

              <View style={styles.copyBlock}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={4}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          )}
        />
      </View>

      <View
        style={[
          styles.bottomChrome,
          { paddingBottom: Math.max(insets.bottom + 16, 80), backgroundColor: colors.background },
        ]}>
        <Pagination
          count={slides.length}
          progress={progress}
          containerStyle={styles.dotsRow}
          dotStyle={{ ...StyleSheet.flatten(styles.dot), backgroundColor: colors.textMuted }}
          activeDotStyle={{
            ...StyleSheet.flatten(styles.dotActive),
            backgroundColor: colors.primary,
          }}
          onPress={(index) => carouselRef.current?.scrollTo({ index })}
        />

        <PressableScale onPress={onContinue} scaleTo={0.96} haptic>
          <LinearGradient colors={[...BRAND_GRADIENT]} style={styles.ctaButton}>
            <View style={styles.ctaPressable}>
              <Text style={styles.ctaText}>{copy.getStarted}</Text>
            </View>
          </LinearGradient>
        </PressableScale>
      </View>
    </GestureHandlerRootView>
  );
}

const PHONE_W = Math.min(280, SCREEN_W * 0.65);
const PHONE_H = PHONE_W * 2;

const styles = StyleSheet.create({
  // —— Layout ——
  screen: { flex: 1 },
  stage: { flex: 1 },

  // —— Phone mock ——
  phoneStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  phoneWrap: {
    width: PHONE_W,
    height: PHONE_H * 0.7,
    overflow: 'hidden',
    alignItems: 'center',
  },
  phoneFrame: {
    width: PHONE_W,
    height: PHONE_H,
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
    backgroundColor: '#000',
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

  // —— Title / subtitle ——
  copyBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 32,
    gap: 8,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    width: '100%',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },

  // —— Bottom chrome ——
  bottomChrome: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 28,
  },
  dotsRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 999,
  },

  // —— CTA (matches OnboardingShell) ——
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
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.4,
  },
});
