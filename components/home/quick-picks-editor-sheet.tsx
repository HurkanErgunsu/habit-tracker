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
  BEVERAGE_BY_TYPE,
  BEVERAGES,
  computeNetHydrationMl,
  type BeverageConfig,
  type BeverageType,
} from '@/constants/beverages';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import {
  clampFavoriteVolumeMl,
  type FavoriteBeverageSlot,
} from '@/utils/hydration-storage';
import { fill } from '@/utils/i18n';

const DRINK_CARD_SIZE = 80;
const DRINK_GRID_ROWS = 2;
const SHEET_SECTION_SPACING = 8;

type QuickPicksEditorSheetProps = {
  visible: boolean;
  slots: FavoriteBeverageSlot[];
  onChangeSlot: (slotIndex: number, update: Partial<FavoriteBeverageSlot>) => void;
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
      <Text
        style={[
          styles.drinkCardFactor,
          { color: colors.textMuted },
          isSelected && { color: colors.primary },
        ]}>
        {formatHydrationFactor(beverage.hydrationFactor)}
      </Text>
    </Pressable>
  );
}

const DRINK_COLUMNS: BeverageConfig[][] = [];
for (let index = 0; index < BEVERAGES.length; index += DRINK_GRID_ROWS) {
  DRINK_COLUMNS.push(BEVERAGES.slice(index, index + DRINK_GRID_ROWS));
}

export function QuickPicksEditorSheet({
  visible,
  slots,
  onChangeSlot,
  onClose,
}: QuickPicksEditorSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [volumeInput, setVolumeInput] = useState('250');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const selectedSlot = slots[selectedIndex] ?? slots[0];
  const selectedType = selectedSlot?.type ?? 'water';
  const selectedVolume = selectedSlot?.volumeMl ?? 250;
  const sheetNetMl = computeNetHydrationMl(selectedType, selectedVolume);
  const logButtonBottomPad = keyboardVisible ? 8 : Math.max(insets.bottom, 16);

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
    setSelectedIndex(0);
    setVolumeInput(String(slots[0]?.volumeMl ?? 250));
  }, [visible]);

  function closeSheet() {
    Keyboard.dismiss();
    onClose();
  }

  function handleSelectSlot(index: number) {
    setSelectedIndex(index);
    setVolumeInput(String(slots[index]?.volumeMl ?? 250));
  }

  function handleSelectType(type: BeverageType) {
    onChangeSlot(selectedIndex, { type });
  }

  function handleVolumeInputChange(value: string) {
    setVolumeInput(value);
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onChangeSlot(selectedIndex, { volumeMl: clampFavoriteVolumeMl(parsed) });
    }
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
                    volume: volumeInput || '0',
                    drink: t.beverages[selectedType].label,
                  })}
                </Text>
                <Text style={[styles.sheetSecondaryTitle, { color: colors.primary }]}>
                  {fill(t.sheets.drinks.netHydration, { ml: sheetNetMl })}
                </Text>
              </View>

              <View style={styles.quickSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                  {t.sheets.fab.editQuick}
                </Text>
                <View style={styles.quickRow}>
                  {slots.map((slot, index) => {
                    const beverage = BEVERAGE_BY_TYPE[slot.type];
                    const isSelected = index === selectedIndex;
                    return (
                      <Pressable
                        key={`slot-${index}`}
                        onPress={() => handleSelectSlot(index)}
                        style={[
                          styles.quickCard,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.chipBorder,
                          },
                          isSelected && {
                            borderColor: colors.primary,
                            backgroundColor: colors.tintSubtle,
                          },
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
                          {t.beverages[slot.type].shortLabel}
                        </Text>
                        <Text
                          style={[
                            styles.drinkCardFactor,
                            { color: colors.textMuted },
                            isSelected && { color: colors.primary },
                          ]}>
                          {slot.volumeMl} {t.common.ml}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.drinkSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                  {t.sheets.drinks.drink}
                </Text>
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
                          isSelected={selectedType === beverage.type}
                          onPress={() => handleSelectType(beverage.type)}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.volumeSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                  {t.sheets.drinks.volume}
                </Text>
                <TextInput
                  value={volumeInput}
                  onChangeText={handleVolumeInputChange}
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
              <PressableScale onPress={closeSheet} scaleTo={0.97} haptic style={styles.logButton}>
                <Text style={styles.logButtonText}>{t.common.done}</Text>
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
  quickSection: {
    marginTop: SHEET_SECTION_SPACING,
    gap: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickCard: {
    flex: 1,
    minHeight: DRINK_CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 4,
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  drinkColumnsScroll: {
    gap: 8,
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
  drinkCardFactor: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '500',
  },
  volumeInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
