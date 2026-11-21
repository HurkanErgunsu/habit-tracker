import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Hit target + glass face; matches iOS 26 nav-bar platter item. */
export const SHEET_CLOSE_BUTTON_SIZE = 44;

const canUseLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type SheetCloseButtonProps = {
  onPress: () => void;
};

/** Native-style glass dismiss control for modal / sheet headers. */
export function SheetCloseButton({ onPress }: SheetCloseButtonProps) {
  const colors = useAppColors();
  const colorScheme = useColorScheme();
  const t = useAppStrings();
  const isDark = colorScheme === 'dark';

  const icon = (
    <IconSymbol name="xmark" size={15} color={colors.text} weight="semibold" />
  );

  const face = canUseLiquidGlass ? (
    <View style={styles.face}>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        colorScheme={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFillObject, styles.glassFill]}
      />
      {icon}
    </View>
  ) : Platform.OS === 'ios' ? (
    <View style={[styles.face, styles.faceClip]}>
      <BlurView
        intensity={80}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFillObject}
      />
      {icon}
    </View>
  ) : (
    <View
      style={[
        styles.face,
        styles.faceSolid,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      {icon}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t.common.close}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {face}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SHEET_CLOSE_BUTTON_SIZE,
    height: SHEET_CLOSE_BUTTON_SIZE,
  },
  pressed: {
    opacity: 0.82,
  },
  face: {
    width: SHEET_CLOSE_BUTTON_SIZE,
    height: SHEET_CLOSE_BUTTON_SIZE,
    borderRadius: SHEET_CLOSE_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceClip: {
    overflow: 'hidden',
  },
  glassFill: {
    borderRadius: SHEET_CLOSE_BUTTON_SIZE / 2,
  },
  faceSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
