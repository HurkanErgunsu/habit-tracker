import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-colors';
import { Haptics, impactAsync } from '@/utils/haptics';

const TAB_ACTIVE = '#2F8FE8';
const TAB_INACTIVE = '#8E8E93';

export const FLOATING_PILL_TAB_BAR_HEIGHT = 58;
export const FLOATING_PILL_TAB_BAR_BOTTOM_GAP = 8;
export const FLOATING_PILL_TAB_BAR_HORIZONTAL_INSET = 20;
export const FAB_TAB_GAP = 10;
export const HYDRATION_FAB_SIZE = 56;

export function getFloatingTabBarScrollInset(bottomInset: number) {
  return (
    FLOATING_PILL_TAB_BAR_HEIGHT +
    FLOATING_PILL_TAB_BAR_BOTTOM_GAP +
    bottomInset +
    12
  );
}

export function getFloatingTabBarBottomOffset(bottomInset: number) {
  return Math.max(bottomInset, 8);
}

export function getFloatingTabBarTopOffset(bottomInset: number) {
  return getFloatingTabBarBottomOffset(bottomInset) + FLOATING_PILL_TAB_BAR_HEIGHT;
}

export function FloatingPillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme, colors } = useAppTheme();
  const bottomOffset = getFloatingTabBarBottomOffset(insets.bottom);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingHorizontal: FLOATING_PILL_TAB_BAR_HORIZONTAL_INSET,
          paddingBottom: bottomOffset,
        },
      ]}>
      <View style={styles.pillShadow}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={95}
            tint={colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={styles.pill}>
            <TabBarContent
              state={state}
              descriptors={descriptors}
              navigation={navigation}
            />
          </BlurView>
        ) : (
          <View style={[styles.pill, styles.androidPill, { backgroundColor: colors.surface }]}>
            <TabBarContent
              state={state}
              descriptors={descriptors}
              navigation={navigation}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function TabBarContent({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.tabsRow}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? TAB_ACTIVE : TAB_INACTIVE;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (Platform.OS === 'ios') {
              void impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabButton, isFocused && styles.tabButtonActive]}>
            {options.tabBarIcon?.({
              focused: isFocused,
              color,
              size: 24,
            })}
            {options.tabBarShowLabel !== false ? (
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pillShadow: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  pill: {
    minHeight: FLOATING_PILL_TAB_BAR_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.16)',
  },
  androidPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 46,
    borderRadius: 22,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(47, 127, 232, 0.1)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
