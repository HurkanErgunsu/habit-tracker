import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { BarChart3, Droplets, Settings2 } from 'lucide-react-native';
import React from 'react';
import { DynamicColorIOS, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FLOATING_PILL_TAB_BAR_BOTTOM_GAP,
  FLOATING_PILL_TAB_BAR_HEIGHT,
  FloatingPillTabBar,
} from '@/components/floating-pill-tab-bar';
import { HydrationFabProvider } from '@/components/home/hydration-fab';
import { TrialReminderProvider } from '@/contexts/trial-reminder-context';
import { useAppStrings } from '@/hooks/use-app-strings';

const TAB_ACTIVE = '#2F8FE8';
const TAB_INACTIVE = '#8E8E93';

const iosLabelColor = DynamicColorIOS({
  light: TAB_INACTIVE,
  dark: '#AEAEB2',
});

const iosIconColor = DynamicColorIOS({
  light: TAB_INACTIVE,
  dark: '#AEAEB2',
});

function IosNativeTabs() {
  const t = useAppStrings();

  return (
    <NativeTabs
      minimizeBehavior="never"
      tintColor={TAB_ACTIVE}
      labelStyle={{
        default: { color: iosLabelColor },
        selected: { color: TAB_ACTIVE, fontWeight: '600' },
      }}
      iconColor={{
        default: iosIconColor,
        selected: TAB_ACTIVE,
      }}>
      <NativeTabs.Trigger name="index">
        <Label>{t.navigation.tabs.today}</Label>
        <Icon sf={{ default: 'drop', selected: 'drop.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analytics">
        <Label>{t.navigation.tabs.analytics}</Label>
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>{t.navigation.tabs.settings}</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log" hidden>
        <Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AndroidTabs() {
  const insets = useSafeAreaInsets();
  const t = useAppStrings();
  const reservedTabBarHeight =
    FLOATING_PILL_TAB_BAR_HEIGHT +
    FLOATING_PILL_TAB_BAR_BOTTOM_GAP +
    Math.max(insets.bottom, 8);

  return (
    <Tabs
      tabBar={(props) => <FloatingPillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          position: 'absolute',
          height: reservedTabBarHeight,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarShowLabel: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.navigation.tabs.today,
          tabBarIcon: ({ color, size, focused }) => (
            <Droplets
              color={color}
              size={focused ? size + 1 : size}
              strokeWidth={focused ? 2.4 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.navigation.tabs.analytics,
          tabBarIcon: ({ color, size, focused }) => (
            <BarChart3
              color={color}
              size={focused ? size + 1 : size}
              strokeWidth={focused ? 2.4 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.navigation.tabs.settings,
          tabBarIcon: ({ color, size, focused }) => (
            <Settings2
              color={color}
              size={focused ? size + 1 : size}
              strokeWidth={focused ? 2.4 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen name="log" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <HydrationFabProvider>
      <TrialReminderProvider>
        {Platform.OS === 'ios' ? <IosNativeTabs /> : <AndroidTabs />}
      </TrialReminderProvider>
    </HydrationFabProvider>
  );
}
