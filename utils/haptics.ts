import * as Haptics from 'expo-haptics';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function getHapticsEnabled() {
  return hapticsEnabled;
}

export async function impactAsync(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
) {
  if (!hapticsEnabled) {
    return;
  }
  await Haptics.impactAsync(style);
}

export { Haptics };
