import { Stack } from 'expo-router';
import { Fragment, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getSettingsModalOptions,
  SettingsModalStaticChrome,
} from '@/components/navigation/settings-sheet-chrome';
import {
  getSettingsCardStyle,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
} from '@/components/settings/settings-group';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ThemePreference } from '@/constants/app-locales';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { Haptics, impactAsync } from '@/utils/haptics';

const THEME_OPTIONS: {
  value: ThemePreference;
  icon: ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { value: 'light', icon: 'sun.max.fill' },
  { value: 'dark', icon: 'moon.fill' },
  { value: 'system', icon: 'circle.lefthalf.filled' },
];

export default function ThemeSettingsScreen() {
  const colors = useAppColors();
  const { theme, strings: t, setTheme } = useAppPreferences();

  const labels: Record<ThemePreference, string> = {
    light: t.screens.settings.light,
    dark: t.screens.settings.dark,
    system: t.screens.settings.system,
  };

  return (
    <>
      <Stack.Screen options={getSettingsModalOptions(colors.background)} />
      <SettingsModalStaticChrome title={t.screens.settings.theme}>
        <SettingsGroup style={getSettingsCardStyle(colors)}>
          {THEME_OPTIONS.map((option, index) => (
            <Fragment key={option.value}>
              <SettingsRow
                onPress={() => {
                  void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void setTheme(option.value);
                }}>
                <View style={styles.rowLeft}>
                  <IconSymbol name={option.icon} size={24} color={colors.text} />
                  <ThemedText style={[styles.rowText, { color: colors.text }]}>
                    {labels[option.value]}
                  </ThemedText>
                </View>
                {theme === option.value ? (
                  <IconSymbol name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </SettingsRow>
              {index < THEME_OPTIONS.length - 1 ? (
                <SettingsDivider style={{ backgroundColor: colors.border }} />
              ) : null}
            </Fragment>
          ))}
        </SettingsGroup>
      </SettingsModalStaticChrome>
    </>
  );
}

const styles = StyleSheet.create({
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowText: { fontSize: 16, fontWeight: '500', lineHeight: 20 },
});
