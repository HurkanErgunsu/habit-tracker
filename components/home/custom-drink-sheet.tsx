import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetCloseButton } from '@/components/home/sheet-close-button';
import { PressableScale } from '@/components/pressable-scale';
import {
  BEVERAGES,
  computeNetHydrationMl,
  type BeverageConfig,
  type BeverageType,
} from '@/constants/beverages';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { clampFavoriteVolumeMl } from '@/utils/hydration-storage';
import { fill } from '@/utils/i18n';

const DRINK_CARD_SIZE = 80;
const DRINK_GRID_ROWS = 2;
const SHEET_SECTION_SPACING = 8;

type CustomDrinkSheetProps = {
  visible: boolean;
  onAddBeverage: (type: BeverageType, volumeMl: number) => void;
  onClose: () => void;
};

function formatHydrationFactor(factor: number) {
  return `${factor}×`;
}

function DrinkCard({
  beverage,
  isSelected,
  onPress,
}: {
  beverage: BeverageConfig;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const t = useAppStrings();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.drinkCard,
        {
          width: DRINK_CARD_SIZE,
          height: DRINK_CARD_SIZE,
          backgroundColor: colors.background,
          borderColor: colors.chipBorder,
        },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.tintSubtle },
      ]}>
      <Text style={styles.drinkCardEmoji}>{beverage.emoji}</Text>
      <Text
        style={[
          styles.drinkCardLabel,
          { color: colors.text },
          isSelected && { color: colors.primary },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {t.beverages[beverage.type].shortLabel}
      </Text>
      <Text style={[styles.drinkCardFactor, { color: colors.textMuted }, isSelected && { color: colors.primary }]}>
        {formatHydrationFactor(beverage.hydrationFactor)}
      </Text>
    </Pressable>
  );
}

const DRINK_COLUMNS: BeverageConfig[][] = [];
for (let index = 0; index < BEVERAGES.length; index += DRINK_GRID_ROWS) {
  DRINK_COLUMNS.push(BEVERAGES.slice(index, index + DRINK_GRID_ROWS));
}

export function CustomDrinkSheet({ visible, onAddBeverage, onClose }: CustomDrinkSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const [sheetType, setSheetType] = useState<BeverageType>('water');
  const [sheetVolumeMl, setSheetVolumeMl] = useState(250);
  const [sheetVolumeInput, setSheetVolumeInput] = useState('250');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSheetType('water');
    setSheetVolumeMl(250);
    setSheetVolumeInput('250');
  }, [visible]);

  const parsedVolume = Number(sheetVolumeInput);
  const effectiveVolume =
    !Number.isNaN(parsedVolume) && parsedVolume > 0 ? parsedVolume : sheetVolumeMl;
  const sheetNetMl = computeNetHydrationMl(sheetType, effectiveVolume);
  const logButtonBottomPad = keyboardVisible ? 8 : Math.max(insets.bottom, 16);

  function closeSheet() {
    Keyboard.dismiss();
    onClose();
  }

  function updateSheetVolume(nextVolume: number) {
    const clamped = clampFavoriteVolumeMl(nextVolume);
    setSheetVolumeMl(clamped);
    setSheetVolumeInput(String(clamped));
  }

  function handleSheetVolumeInputChange(value: string) {
    setSheetVolumeInput(value);
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      updateSheetVolume(parsed);
    }
  }

  function getSheetVolumeMl() {
    const parsed = Number(sheetVolumeInput);
    return Number.isNaN(parsed) || parsed <= 0
      ? sheetVolumeMl
      : clampFavoriteVolumeMl(parsed);
  }

  function handleConfirmSheet() {
    onAddBeverage(sheetType, getSheetVolumeMl());
    closeSheet();
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={closeSheet}>
      <View style={[styles.fullSheetBackdrop, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          keyboardVerticalOffset={0}
          style={styles.fullSheetContainer}>
          <View
            style={[
              styles.fullSheetCard,
              { paddingTop: Math.max(insets.top, 12), backgroundColor: colors.background },
            ]}>
            <ScrollView
              style={styles.sheetScrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.fullSheetContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <SheetCloseButton onPress={closeSheet} />
              </View>

              <View style={styles.sheetSummary}>
                <Text style={[styles.sheetPrimaryTitle, { color: colors.text }]}>
                  {fill(t.sheets.drinks.customTitle, {
                    volume: sheetVolumeInput || '0',
                    drink: t.beverages[sheetType].label,
                  })}
                </Text>
                <Text style={[styles.sheetSecondaryTitle, { color: colors.primary }]}>
                  {fill(t.sheets.drinks.netHydration, { ml: sheetNetMl })}
                </Text>
              </View>

              <View style={styles.drinkSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>{t.sheets.drinks.drink}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.drinkColumnsScroll}
                  keyboardShouldPersistTaps="handled">
                  {DRINK_COLUMNS.map((column, columnIndex) => (
                    <View key={`col-${columnIndex}`} style={styles.drinkColumn}>
                      {column.map((beverage) => (
                        <DrinkCard
                          key={beverage.type}
                          beverage={beverage}
                          isSelected={sheetType === beverage.type}
                          onPress={() => setSheetType(beverage.type)}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.volumeSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>{t.sheets.drinks.volume}</Text>
                <TextInput
                  value={sheetVolumeInput}
                  onChangeText={handleSheetVolumeInputChange}
                  keyboardType="number-pad"
                  placeholder="250"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.volumeInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>
            </ScrollView>

            <View
              style={[
                styles.sheetBottomBar,
                {
                  paddingTop: keyboardVisible ? 6 : 12,
                  paddingBottom: logButtonBottomPad,
                  backgroundColor: colors.background,
                },
              ]}>
              <PressableScale
                onPress={handleConfirmSheet}
                scaleTo={0.97}
                haptic
                style={styles.logButton}>
                <Text style={styles.logButtonText}>{t.sheets.drinks.logDrink}</Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullSheetBackdrop: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullSheetContainer: {
    flex: 1,
  },
  fullSheetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  sheetScrollArea: {
    flex: 1,
  },
  fullSheetContent: {
    gap: 12,
    paddingBottom: 12,
  },
  drinkSection: {
    marginTop: SHEET_SECTION_SPACING,
    gap: 8,
  },
  volumeSection: {
    marginTop: SHEET_SECTION_SPACING,
    gap: 8,
  },
  sheetBottomBar: {
    backgroundColor: '#FFFFFF',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheetSummary: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 12,
  },
  sheetPrimaryTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheetSecondaryTitle: {
    color: '#2F8FE8',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetSectionLabel: {
    color: '#667085',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  drinkColumnsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  drinkColumn: {
    gap: 8,
  },
  drinkCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 4,
  },
  drinkCardActive: {
    borderColor: '#2F8FE8',
    backgroundColor: '#E6F4FC',
  },
  drinkCardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  drinkCardLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '100%',
    marginBottom: 2,
  },
  drinkCardLabelActive: {
    color: '#3730A3',
  },
  drinkCardFactor: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '500',
  },
  drinkCardFactorActive: {
    color: '#2F8FE8',
  },
  volumeInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  logButton: {
    borderRadius: 999,
    backgroundColor: '#2F8FE8',
    minHeight: 44,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
