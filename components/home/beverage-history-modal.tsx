import { Trash2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetCloseButton } from '@/components/home/sheet-close-button';
import { BEVERAGE_BY_TYPE } from '@/constants/beverages';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import type { BeverageLog } from '@/utils/hydration-storage';
import { Haptics, impactAsync } from '@/utils/haptics';
import { fill } from '@/utils/i18n';

type BeverageHistoryModalProps = {
  visible: boolean;
  logs: BeverageLog[];
  onDeleteLog: (logId: string) => void;
  onClose: () => void;
};

function formatLogTime(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function BeverageHistoryModal({
  visible,
  logs,
  onDeleteLog,
  onClose,
}: BeverageHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const t = useAppStrings();

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => b.loggedAt - a.loggedAt),
    [logs]
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={[styles.fullSheetBackdrop, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.fullSheetCard,
            {
              backgroundColor: colors.background,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <View style={styles.sheetTop}>
            <View style={styles.sheetHeader}>
              <SheetCloseButton onPress={onClose} />
            </View>

            <View style={styles.sheetSummary}>
              <Text style={[styles.sheetPrimaryTitle, { color: colors.text }]}>
                {t.sheets.drinks.historyTitle}
              </Text>
            </View>
          </View>

          {sortedLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.sheets.drinks.emptyTitle}</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                {t.sheets.drinks.emptyBody}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {sortedLogs.map((log) => {
                const beverage = BEVERAGE_BY_TYPE[log.type];
                return (
                  <View
                    key={log.id}
                    style={[
                      styles.row,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowEmoji}>{beverage.emoji}</Text>
                      <View style={styles.rowText}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {t.beverages[log.type].label}
                        </Text>
                        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                          {fill(t.sheets.drinks.logMeta, {
                            time: formatLogTime(log.loggedAt),
                            volume: log.volumeMl,
                            net: log.netHydrationMl,
                          })}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        void impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onDeleteLog(log.id);
                      }}
                      style={[styles.deleteButton, { backgroundColor: colors.dangerSubtle }]}
                      accessibilityLabel={fill(t.sheets.drinks.deleteLog, { drink: t.beverages[log.type].label })}>
                      <Trash2 size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullSheetBackdrop: {
    flex: 1,
  },
  fullSheetCard: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetTop: {
    gap: 12,
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
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowEmoji: {
    fontSize: 24,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
