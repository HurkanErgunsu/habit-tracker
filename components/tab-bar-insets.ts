import {
  FAB_TAB_GAP,
  getFloatingTabBarScrollInset,
  getFloatingTabBarTopOffset,
  HYDRATION_FAB_SIZE as ANDROID_FAB_SIZE,
} from '@/components/floating-pill-tab-bar';
import { Platform } from 'react-native';

/** UITabBar content height (labels included), excluding home indicator. */
const NATIVE_IOS_TAB_BAR_HEIGHT = 49;
const TAB_BAR_SCROLL_EXTRA_PADDING = 16;

export const HYDRATION_FAB_SIZE = ANDROID_FAB_SIZE;

export function getTabBarScrollInset(bottomInset: number) {
  const fabClearance = HYDRATION_FAB_SIZE + FAB_TAB_GAP;

  if (Platform.OS === 'ios') {
    return NATIVE_IOS_TAB_BAR_HEIGHT + bottomInset + fabClearance + TAB_BAR_SCROLL_EXTRA_PADDING;
  }

  return getFloatingTabBarScrollInset(bottomInset) + fabClearance;
}

/** Bottom offset of the native iOS 26 floating tab pill, including its height. */
export function getNativeTabBarOffset(bottomInset: number) {
  return Math.max(bottomInset, 8) + 8 + NATIVE_IOS_TAB_BAR_HEIGHT;
}

export function getFabBottomOffset(bottomInset: number) {
  if (Platform.OS === 'ios') {
    return getNativeTabBarOffset(bottomInset) + FAB_TAB_GAP;
  }

  return getFloatingTabBarTopOffset(bottomInset) + FAB_TAB_GAP;
}
