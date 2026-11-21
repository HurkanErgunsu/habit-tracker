import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { DEFAULT_PROFILE_AVATAR } from '@/components/settings/profile-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AvatarOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProfilePhotoExpandProps = {
  visible: boolean;
  origin: AvatarOrigin | null;
  photoUri?: string | null;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onDismissed?: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TARGET_SIZE = Math.min(SCREEN_W * 0.72, 300);

export function ProfilePhotoExpand({
  visible,
  origin,
  photoUri,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
  onDismissed,
}: ProfilePhotoExpandProps) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const colorScheme = useColorScheme();
  const t = useAppStrings();
  const copy = t.screens.profile;
  const hasPhoto = Boolean(photoUri?.trim());
  const avatarSource = hasPhoto ? { uri: photoUri! } : DEFAULT_PROFILE_AVATAR;

  const [rendered, setRendered] = useState(visible);
  const progress = useSharedValue(0);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  const start = origin ?? {
    x: (SCREEN_W - 64) / 2,
    y: SCREEN_H * 0.2,
    width: 64,
    height: 64,
  };

  const targetLeft = (SCREEN_W - TARGET_SIZE) / 2;
  const targetTop = (SCREEN_H - TARGET_SIZE) / 2 - 36;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!rendered) return;

    progress.value = withTiming(
      0,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setRendered)(false);
        }
      }
    );
  }, [visible, rendered, progress]);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    if (!rendered && !visible) {
      onDismissedRef.current?.();
    }
  }, [rendered, visible]);

  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [start.width, TARGET_SIZE]);
    const left = interpolate(progress.value, [0, 1], [start.x, targetLeft]);
    const top = interpolate(progress.value, [0, 1], [start.y, targetTop]);
    return {
      position: 'absolute' as const,
      left,
      top,
      width: size,
      height: size,
      borderRadius: size / 2,
    };
  });

  const chromeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0.6, 1]),
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 1], [0, 1]),
    transform: [
      {
        translateY: interpolate(progress.value, [0.45, 1], [24, 0]),
      },
    ],
  }));

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={() => {
        onDismissedRef.current?.();
      }}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, chromeAnimatedStyle]}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 55 : 80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  colorScheme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.28)',
              },
            ]}
          />
        </Animated.View>

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t.common.close} />

        <Animated.View
          style={[styles.avatarShell, { backgroundColor: '#D2EBFB' }, avatarAnimatedStyle]}
          pointerEvents="none">
          <Image
            source={avatarSource}
            style={styles.photo}
            contentFit="cover"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 20) + 8 },
            actionsAnimatedStyle,
          ]}>
          <PressableScale
            onPress={onTakePhoto}
            scaleTo={0.94}
            haptic
            style={styles.actionItem}
            accessibilityLabel={copy.takePhoto}>
            <View style={styles.actionCircle}>
              <Camera size={26} color="#111827" strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={2}>
              {copy.takePhoto}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={onChooseFromLibrary}
            scaleTo={0.94}
            haptic
            style={styles.actionItem}
            accessibilityLabel={copy.chooseFromGallery}>
            <View style={styles.actionCircle}>
              <ImageIcon size={26} color="#111827" strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={2}>
              {copy.chooseFromGallery}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  avatarShell: {
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    paddingHorizontal: 24,
  },
  actionItem: {
    width: 96,
    alignItems: 'center',
    gap: 10,
  },
  actionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
