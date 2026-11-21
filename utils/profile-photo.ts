import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { getStoredAppStrings } from '@/utils/i18n/load';

const PROFILE_PHOTO_FILENAME = 'profile-photo.jpg';

function profilePhotoPath() {
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  return `${root}${PROFILE_PHOTO_FILENAME}`;
}

async function ensureLibraryPermission() {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === 'limited') {
    return true;
  }

  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (next.granted || next.accessPrivileges === 'limited') {
    return true;
  }

  const t = await getStoredAppStrings();
  Alert.alert(t.screens.profile.photoPermissionTitle, t.screens.profile.photoPermissionBody, [
    { text: t.common.cancel, style: 'cancel' },
    { text: t.screens.profile.openSettings, onPress: () => void Linking.openSettings() },
  ]);
  return false;
}

async function ensureCameraPermission() {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const next = await ImagePicker.requestCameraPermissionsAsync();
  if (next.granted) return true;

  const t = await getStoredAppStrings();
  Alert.alert(t.screens.profile.cameraPermissionTitle, t.screens.profile.cameraPermissionBody, [
    { text: t.common.cancel, style: 'cancel' },
    { text: t.screens.profile.openSettings, onPress: () => void Linking.openSettings() },
  ]);
  return false;
}

/** Copies a picked image into app documents so it survives cache clears. */
export async function persistProfilePhoto(sourceUri: string) {
  const destination = profilePhotoPath();
  if (!destination) {
    return sourceUri;
  }

  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return `${destination}?t=${Date.now()}`;
}

export async function clearPersistedProfilePhoto() {
  const destination = profilePhotoPath();
  if (!destination) return;

  const basePath = destination.split('?')[0];
  try {
    const info = await FileSystem.getInfoAsync(basePath);
    if (info.exists) {
      await FileSystem.deleteAsync(basePath, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup.
  }
}

async function finalizePickedAsset(uri: string | undefined) {
  if (!uri) return null;
  return persistProfilePhoto(uri);
}

export async function pickProfilePhotoFromLibrary(): Promise<string | null> {
  try {
    const granted = await ensureLibraryPermission();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return null;
    return finalizePickedAsset(result.assets?.[0]?.uri);
  } catch (error) {
    console.warn('[profile-photo] library pick failed', error);
    return null;
  }
}

export async function takeProfilePhoto(): Promise<string | null> {
  try {
    const granted = await ensureCameraPermission();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return null;
    return finalizePickedAsset(result.assets?.[0]?.uri);
  } catch (error) {
    console.warn('[profile-photo] camera pick failed', error);
    return null;
  }
}
