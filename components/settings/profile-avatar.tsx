import { Image } from 'expo-image';
import { Pencil } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useAppColors } from '@/hooks/use-app-colors';

export const DEFAULT_PROFILE_AVATAR = require('@/assets/images/default-avatar.jpg');

type ProfileAvatarProps = {
  photoUri?: string | null;
  size?: number;
  /** Pencil badge for editable profile hero (no border). */
  editable?: boolean;
};

export function ProfileAvatar({
  photoUri,
  size = 56,
  editable = false,
}: ProfileAvatarProps) {
  const colors = useAppColors();
  const hasPhoto = Boolean(photoUri?.trim());
  const badgeSize = Math.max(22, Math.round(size * 0.32));
  const source = hasPhoto ? { uri: photoUri! } : DEFAULT_PROFILE_AVATAR;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}>
        <Image source={source} style={styles.photo} contentFit="cover" />
      </View>

      {editable ? (
        <View
          style={[
            styles.editBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.primary,
              borderColor: colors.surface,
            },
          ]}>
          <Pencil size={Math.round(badgeSize * 0.45)} color="#FFFFFF" strokeWidth={2.6} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#D2EBFB',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
