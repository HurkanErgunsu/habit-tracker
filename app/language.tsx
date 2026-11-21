import { Stack } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { APP_LANGUAGES } from '@/constants/app-locales';
import { useAppPreferences } from '@/contexts/app-preferences-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { Haptics, impactAsync } from '@/utils/haptics';

export default function LanguageSettingsScreen() {
  const colors = useAppColors();
  const { language, strings: t, setLanguage } = useAppPreferences();

  return (
    <>
      <Stack.Screen options={getSettingsModalOptions(colors.background)} />
      <SettingsModalStaticChrome title={t.screens.settings.language}>
        <SettingsGroup style={getSettingsCardStyle(colors)}>
          {APP_LANGUAGES.map((item, index) => (
            <Fragment key={item.code}>
              <SettingsRow
                onPress={() => {
                  void impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void setLanguage(item.code);
                }}>
                <View style={styles.rowLeft}>
                  <Text style={styles.flag}>{item.flag}</Text>
                  <ThemedText style={[styles.rowText, { color: colors.text }]}>
                    {item.nativeName}
                  </ThemedText>
                </View>
                {language === item.code ? (
                  <IconSymbol name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </SettingsRow>
              {index < APP_LANGUAGES.length - 1 ? (
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
  flag: { fontSize: 24, lineHeight: 24, width: 24, textAlign: 'center' },
  rowText: { fontSize: 16, fontWeight: '500', lineHeight: 20 },
});
