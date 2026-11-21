import { BlurView } from 'expo-blur';
import {
    GlassView,
    isGlassEffectAPIAvailable,
    isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { usePathname } from 'expo-router';
import { History, Pencil, Plus, SlidersHorizontal, X } from 'lucide-react-native';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import {
    FLOATING_PILL_TAB_BAR_HORIZONTAL_INSET,
    HYDRATION_FAB_SIZE,
} from '@/components/floating-pill-tab-bar';
import { BeverageHistoryModal } from '@/components/home/beverage-history-modal';
import { CustomDrinkSheet } from '@/components/home/custom-drink-sheet';
import { QuickPicksEditorSheet } from '@/components/home/quick-picks-editor-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { getFabBottomOffset } from '@/components/tab-bar-insets';
import { BEVERAGE_BY_TYPE, type BeverageType } from '@/constants/beverages';
import { useAppColors, useAppTheme } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { notifyHydrationChanged, subscribeHydrationChanges } from '@/utils/hydration-events';
import {
    applyBeverageIntake,
    getDateKey,
    loadHydrationState,
    normalizeFavoriteBeverageSlots,
    revertBeverageLog,
    saveHydrationState,
    setFavoriteBeverageSlotAtIndex,
    type FavoriteBeverageSlot,
    type HydrationState,
} from '@/utils/hydration-storage';
import { setNativeLogTabHandler } from '@/utils/native-log-tab-handler';

const canUseLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
const MENU_SLIDE_DISTANCE = 72;
const ACTION_TINT = '#2F8FE8';

type FabContextValue = {
  menuOpen: boolean;
  hideFab: boolean;
  setHideFab: (hide: boolean) => void;
  openBottomSheet: () => void;
  closeBottomSheet: () => void;
  toggleBottomSheet: () => void;
};

const HydrationFabContext = createContext<FabContextValue | null>(null);

export function useHydrationFab() {
  const value = useContext(HydrationFabContext);
  if (!value) {
    throw new Error('useHydrationFab must be used within HydrationFabProvider');
  }
  return value;
}

function useShowHydrationFab() {
  const pathname = usePathname();
  return (
    !pathname.includes('/settings') &&
    !pathname.includes('/profile') &&
    !pathname.includes('/theme') &&
    !pathname.includes('/language')
  );
}

function HydrationOverlay() {
  const showFab = useShowHydrationFab();
  const { menuOpen, hideFab, closeBottomSheet } = useHydrationFab();

  useEffect(() => {
    if (!showFab && menuOpen) {
      closeBottomSheet();
    }
  }, [closeBottomSheet, menuOpen, showFab]);

  return (
    <>
      {showFab && !hideFab ? <HydrationActionButton /> : null}
      <HydrationFabHost />
    </>
  );
}

export function HydrationFabProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideFab, setHideFab] = useState(false);

  const openBottomSheet = useCallback(() => setMenuOpen(true), []);
  const closeBottomSheet = useCallback(() => setMenuOpen(false), []);
  const toggleBottomSheet = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    setNativeLogTabHandler(() => {
      setMenuOpen((open) => !open);
    });
    return () => setNativeLogTabHandler(null);
  }, []);

  const value = useMemo<FabContextValue>(
    () => ({
      menuOpen,
      hideFab,
      setHideFab,
      openBottomSheet,
      closeBottomSheet,
      toggleBottomSheet,
    }),
    [closeBottomSheet, hideFab, menuOpen, openBottomSheet, toggleBottomSheet]
  );

  if (Platform.OS === 'ios') {
    return (
      <HydrationFabContext.Provider value={value}>
        {children}
        <HydrationOverlay />
      </HydrationFabContext.Provider>
    );
  }

  return (
    <HydrationFabContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <HydrationOverlay />
      </View>
    </HydrationFabContext.Provider>
  );
}

function menuSlideIn() {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: MENU_SLIDE_DISTANCE }],
    },
    animations: {
      opacity: withTiming(1, { duration: 180 }),
      transform: [
        {
          translateY: withTiming(0, {
            duration: 280,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    },
  };
}

function menuSlideOut() {
  'worklet';
  return {
    initialValues: {
      opacity: 1,
      transform: [{ translateY: 0 }],
    },
    animations: {
      opacity: withTiming(0, { duration: 160 }),
      transform: [
        {
          translateY: withTiming(MENU_SLIDE_DISTANCE, {
            duration: 220,
            easing: Easing.in(Easing.cubic),
          }),
        },
      ],
    },
  };
}

type MenuAction = {
  key: string;
  label: string;
  sublabel?: string;
  icon: ReactNode;
  onPress: () => void;
};

function MenuIconCircle({ children }: { children: ReactNode }) {
  const colors = useAppColors();
  return (
    <View style={[styles.iconCircle, { backgroundColor: colors.backgroundAlt }]}>{children}</View>
  );
}

function HydrationActionButton() {
  const insets = useSafeAreaInsets();
  const { colorScheme, colors } = useAppTheme();
  const t = useAppStrings();
  const { menuOpen, openBottomSheet, closeBottomSheet } = useHydrationFab();
  const size = HYDRATION_FAB_SIZE;
  const bottom = getFabBottomOffset(insets.bottom);
  const right = FLOATING_PILL_TAB_BAR_HORIZONTAL_INSET;
  const isDark = colorScheme === 'dark';
  const faceStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const shadowStyle = isDark
    ? {
        shadowColor: '#000000',
        shadowOpacity: 0.55,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 16,
      }
    : {
        shadowColor: '#0F172A',
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 14,
      };

  const icon = menuOpen ? (
    <X size={size * 0.46} color={ACTION_TINT} strokeWidth={2.4} />
  ) : (
    <Plus size={size * 0.5} color={ACTION_TINT} strokeWidth={2.4} />
  );

  const iconLayer = <View style={styles.actionIconLayer}>{icon}</View>;

  const face = canUseLiquidGlass ? (
    <View style={[styles.actionGlass, faceStyle]}>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        colorScheme={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
      />
      {iconLayer}
    </View>
  ) : Platform.OS === 'ios' ? (
    <View style={[styles.actionGlass, faceStyle]}>
      <BlurView
        intensity={95}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
      />
      {iconLayer}
    </View>
  ) : (
    <View
      style={[
        styles.actionGlass,
        styles.actionSolid,
        faceStyle,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      {iconLayer}
    </View>
  );

  const button = (
    <View pointerEvents="box-none" style={[styles.actionWrap, { bottom, right }]}>
      <PressableScale
        haptic
        scaleTo={0.92}
        onPress={() => {
          if (menuOpen) {
            closeBottomSheet();
          } else {
            openBottomSheet();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={menuOpen ? t.sheets.fab.closeMenu : t.sheets.fab.logWater}
        style={[shadowStyle, faceStyle]}>
        {face}
      </PressableScale>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <View pointerEvents="box-none" style={styles.overlayRoot}>
          {button}
        </View>
      </FullWindowOverlay>
    );
  }

  return button;
}

function HydrationFabHost() {
  const insets = useSafeAreaInsets();
  const { colorScheme, colors } = useAppTheme();
  const t = useAppStrings();
  const { menuOpen, closeBottomSheet, setHideFab } = useHydrationFab();
  const [hydrationState, setHydrationState] = useState<HydrationState | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const todayKey = getDateKey();
  const slots = normalizeFavoriteBeverageSlots(hydrationState?.favoriteBeverageSlots);
  const menuBottom = getFabBottomOffset(insets.bottom) + HYDRATION_FAB_SIZE + 12;
  const backdropBottom = 0;

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      const stored = await loadHydrationState();
      if (isMounted) {
        setHydrationState(stored);
      }
    }

    void refresh();
    const unsubscribe = subscribeHydrationChanges(() => {
      void refresh();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setHideFab(customOpen || editorOpen || historyOpen);
  }, [customOpen, editorOpen, historyOpen, setHideFab]);

  function openSheet(setter: (open: boolean) => void) {
    closeBottomSheet();
    setter(true);
  }

  const persist = useCallback(async (next: HydrationState) => {
    setHydrationState(next);
    await saveHydrationState(next);
    notifyHydrationChanged();
  }, []);

  async function handleAddBeverage(type: BeverageType, volumeMl: number) {
    const current = (await loadHydrationState()) ?? hydrationState;
    if (!current) {
      return;
    }
    const { state: nextState } = applyBeverageIntake(current, type, volumeMl, todayKey);
    await persist(nextState);
  }

  function handleQuickLog(slot: FavoriteBeverageSlot) {
    closeBottomSheet();
    void handleAddBeverage(slot.type, slot.volumeMl);
  }

  async function handleDeleteLog(logId: string) {
    const current = (await loadHydrationState()) ?? hydrationState;
    if (!current) {
      return;
    }
    await persist(revertBeverageLog(current, logId, todayKey));
  }

  async function handleUpdateFavoriteSlot(
    slotIndex: number,
    update: Partial<FavoriteBeverageSlot>
  ) {
    const current = (await loadHydrationState()) ?? hydrationState;
    if (!current) {
      return;
    }
    await persist({
      ...current,
      favoriteBeverageSlots: setFavoriteBeverageSlotAtIndex(
        current.favoriteBeverageSlots,
        slotIndex,
        update
      ),
    });
  }

  const actions: MenuAction[] = [
    ...slots.map((slot, index) => {
      const beverage = BEVERAGE_BY_TYPE[slot.type];
      return {
        key: `quick-${index}`,
        label: t.beverages[slot.type].shortLabel,
        sublabel: `${slot.volumeMl} ${t.common.ml}`,
        icon: <Text style={styles.quickEmoji}>{beverage.emoji}</Text>,
        onPress: () => handleQuickLog(slot),
      };
    }),
    {
      key: 'edit',
      label: t.sheets.fab.editQuick,
      icon: <Pencil size={20} color={colors.text} strokeWidth={2.2} />,
      onPress: () => openSheet(setEditorOpen),
    },
    {
      key: 'custom',
      label: t.sheets.fab.custom,
      icon: <SlidersHorizontal size={20} color={colors.text} strokeWidth={2.2} />,
      onPress: () => openSheet(setCustomOpen),
    },
    {
      key: 'history',
      label: t.sheets.fab.history,
      icon: <History size={20} color={colors.text} strokeWidth={2.2} />,
      onPress: () => openSheet(setHistoryOpen),
    },
  ];

  const menu = menuOpen ? (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={[styles.backdropWrap, { bottom: backdropBottom }]}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]} onPress={closeBottomSheet} />
      </Animated.View>
      <Animated.View
        entering={menuSlideIn}
        exiting={menuSlideOut}
        style={[styles.menuWrap, { bottom: menuBottom }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={95}
            tint={colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={[styles.menu, { borderColor: colors.border }]}>
            <MenuGrid actions={actions} />
          </BlurView>
        ) : (
          <View
            style={[
              styles.menu,
              styles.menuSolid,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <MenuGrid actions={actions} />
          </View>
        )}
      </Animated.View>
    </View>
  ) : null;

  return (
    <>
      {Platform.OS === 'ios' && menu ? (
        <FullWindowOverlay>{menu}</FullWindowOverlay>
      ) : (
        menu
      )}

      <CustomDrinkSheet
        visible={customOpen}
        onAddBeverage={handleAddBeverage}
        onClose={() => setCustomOpen(false)}
      />
      <QuickPicksEditorSheet
        visible={editorOpen}
        slots={slots}
        onChangeSlot={handleUpdateFavoriteSlot}
        onClose={() => setEditorOpen(false)}
      />
      <BeverageHistoryModal
        visible={historyOpen}
        logs={hydrationState?.todayBeverageLogs ?? []}
        onDeleteLog={handleDeleteLog}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}

function MenuGrid({ actions }: { actions: MenuAction[] }) {
  const colors = useAppColors();
  const { width: windowWidth } = useWindowDimensions();
  // menu margins 16×2 + padding 24×2 + column gaps 12×2
  const labelMaxWidth = (windowWidth - 32 - 48 - 24) / 3;
  const rows = [actions.slice(0, 3), actions.slice(3, 6)];

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((action) => {
            // Wrap only between words; a single word shrinks instead of splitting.
            const labelLines = /\s/.test(action.label) ? 2 : 1;

            return (
              <View key={action.key} style={styles.cell}>
                <PressableScale
                  style={styles.action}
                  scaleTo={0.94}
                  haptic
                  onPress={action.onPress}
                  accessibilityLabel={
                    action.sublabel ? `${action.label} ${action.sublabel}` : action.label
                  }>
                  <MenuIconCircle>{action.icon}</MenuIconCircle>
                  <View style={[styles.actionCopy, { maxWidth: labelMaxWidth }]}>
                    <Text
                      style={[styles.actionLabel, { color: colors.text, maxWidth: labelMaxWidth }]}
                      numberOfLines={labelLines}
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}>
                      {action.label}
                    </Text>
                    {action.sublabel ? (
                      <Text
                        style={[
                          styles.actionSublabel,
                          { color: colors.textMuted, maxWidth: labelMaxWidth },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}>
                        {action.sublabel}
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  actionWrap: {
    position: 'absolute',
    zIndex: 30,
  },
  actionGlass: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconLayer: {
    zIndex: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSolid: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.16)',
  },
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  menuWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  menu: {
    width: '100%',
    padding: 24,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.16)',
  },
  menuSolid: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  grid: {
    gap: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },
  action: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    gap: 6,
  },
  actionCopy: {
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 0,
  },
  iconCircle: {
    width: HYDRATION_FAB_SIZE,
    height: HYDRATION_FAB_SIZE,
    borderRadius: HYDRATION_FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    alignSelf: 'stretch',
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionSublabel: {
    alignSelf: 'stretch',
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});
