import { useAppColors } from '@/hooks/use-app-colors';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type SettingsCardColors = {
  surface: string;
  border: string;
};

/** Shared bordered card look for settings / profile groups. */
export function getSettingsCardStyle(colors: SettingsCardColors): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
  };
}

type SettingsGroupProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Card shell — no vertical padding; horizontal inset lives on the row. */
export function SettingsGroup({ children, style }: SettingsGroupProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type SettingsRowProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Single row. Pressed background covers the full card width. */
export function SettingsRow({ children, onPress, style }: SettingsRowProps) {
  const colors = useAppColors();

  if (!onPress) {
    return <View style={[styles.row, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.rowPressed : 'transparent' },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

type SettingsDividerProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Hairline between rows.
 * Default marginLeft (56) = 16 row pad + 24 icon + 16 gap → text column.
 * Override via `style` when rows have no leading icon (e.g. `{ marginLeft: 16 }`).
 */
export function SettingsDivider({ style }: SettingsDividerProps) {
  const colors = useAppColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  row: {
    gap: 12,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    marginLeft: 56,
    marginRight: 16,
    marginVertical: 0,
  },
});
