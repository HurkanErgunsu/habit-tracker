import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppColors } from '@/hooks/use-app-colors';

const STICKY_HEADER_HEIGHT = 44;
const LARGE_TITLE_TOP_GAP = 6;
const COLLAPSE_DISTANCE = 44;
const GRADIENT_FADE = 28;

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

type CollapsibleLargeTitleScreenProps = {
  title: string;
  subtitle?: string;
  stickyTitle?: string;
  scrollBottomInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function CollapsibleLargeTitleScreen({
  title,
  subtitle,
  stickyTitle,
  scrollBottomInset = 16,
  contentContainerStyle,
  children,
}: CollapsibleLargeTitleScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const scrollY = useSharedValue(0);
  const compactTitle = stickyTitle ?? title;
  const stickyHeight = insets.top + STICKY_HEADER_HEIGHT + GRADIENT_FADE;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 18, COLLAPSE_DISTANCE], [1, 0.55, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, -12], Extrapolation.CLAMP),
      },
    ],
  }));

  const stickyChromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [12, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [22, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [22, COLLAPSE_DISTANCE], [6, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: scrollBottomInset },
          contentContainerStyle,
        ]}>
        <Animated.View style={[styles.titleBlock, largeTitleStyle]}>
          <Animated.Text style={[styles.largeTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Animated.Text>
          {subtitle ? (
            <Animated.Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Animated.Text>
          ) : null}
        </Animated.View>
        {children}
      </Animated.ScrollView>

      <View pointerEvents="none" style={[styles.stickyHeader, { height: stickyHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFill, stickyChromeStyle]}>
          <LinearGradient
            colors={[
              withAlpha(colors.background, 'FF'),
              withAlpha(colors.background, 'F2'),
              withAlpha(colors.background, '00'),
            ]}
            locations={[0, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[styles.stickyTitleWrap, { height: insets.top + STICKY_HEADER_HEIGHT, paddingTop: insets.top }]}>
          <Animated.Text
            style={[styles.compactTitle, { color: colors.text }, compactTitleStyle]}
            numberOfLines={1}>
            {compactTitle}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 16,
  },
  titleBlock: {
    gap: 2,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  stickyTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});
