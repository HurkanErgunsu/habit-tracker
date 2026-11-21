import { MotiPressable, mergeAnimateProp, type MotiPressableProps } from 'moti/interactions';
import React, { useMemo } from 'react';

import { Haptics, impactAsync } from '@/utils/haptics';

type PressableScaleProps = MotiPressableProps & {
  scaleTo?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
};

export function PressableScale({
  animate,
  scaleTo = 0.94,
  transition,
  haptic,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  return (
    <MotiPressable
      {...props}
      disabled={disabled}
      transition={transition ?? { type: 'timing', duration: 120 }}
      onPress={(event) => {
        if (!disabled && haptic) {
          const style =
            haptic === true ? Haptics.ImpactFeedbackStyle.Medium : haptic;
          void impactAsync(style);
        }
        onPress?.(event);
      }}
      animate={useMemo(
        () => (interaction) => {
          'worklet';
          return mergeAnimateProp(interaction, animate, {
            scale: interaction.pressed ? scaleTo : 1,
          });
        },
        [animate, scaleTo]
      )}
    />
  );
}
