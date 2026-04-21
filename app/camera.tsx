import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { WaterColors } from '@/constants/colors';
import { verifyHydrationPhoto } from '@/utils/hydration-ai';
import {
  getDateKey,
  getPreviousDateKey,
  loadHydrationState,
  saveHydrationState,
} from '@/utils/hydration-storage';

type VerificationState = 'idle' | 'analyzing' | 'success' | 'rejected';

export default function CameraScreen() {
  const params = useLocalSearchParams<{ goal?: string; recommended?: string; verifyAmount?: string }>();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  const verifyAmount = useMemo(() => {
    const parsed = Number(params.verifyAmount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 250;
    }

    return parsed;
  }, [params.verifyAmount]);

  const isBusy = verificationState !== 'idle';
  const isAnalyzing = verificationState === 'analyzing';

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (isAnalyzing) {
      pulseScale.value = withRepeat(
        withTiming(1.18, { duration: 900, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.05, { duration: 900, easing: Easing.out(Easing.quad) }),
        -1,
        true
      );
      return;
    }

    pulseScale.value = withTiming(1, { duration: 180 });
    pulseOpacity.value = withTiming(0.35, { duration: 180 });
  }, [isAnalyzing, pulseOpacity, pulseScale]);

  async function handleCapture() {
    if (!cameraRef.current || isBusy) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true,
      });
      setVerificationState('analyzing');
      setFeedbackMessage('');

      const result = await verifyHydrationPhoto(photo.base64 ?? '');

      if (result.status === 'confirmed') {
        setFeedbackMessage('Great, water added!');
        setVerificationState('success');
        return;
      }

      setFeedbackMessage(
        result.reason ||
          "Oops! That doesn't look like water to me. Are you sure you're drinking your hydration? 💧"
      );
      setVerificationState('rejected');
    } catch {
      setVerificationState('idle');
      Alert.alert(
        'Photo not captured yet',
        'No worries, please try another water photo so we can verify your hydration. 😊'
      );
    }
  }

  function handleTryAgain() {
    setFeedbackMessage('');
    setVerificationState('idle');
  }

  function handleBackToDashboard() {
    setFeedbackMessage('');
    setVerificationState('idle');
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/dashboard');
  }

  async function handleConfirmSuccess() {
    const todayKey = getDateKey();
    const yesterdayKey = getPreviousDateKey(todayKey);
    const currentState = await loadHydrationState();

    const nextDrank = currentState.drankMl + verifyAmount;
    let nextStreak = currentState.streakCount;
    let nextCompletedDate = currentState.lastCompletedDate;
    const reachedGoalNow = currentState.drankMl < currentState.goalMl && nextDrank >= currentState.goalMl;

    if (reachedGoalNow && currentState.lastCompletedDate !== todayKey) {
      nextStreak = currentState.lastCompletedDate === yesterdayKey ? currentState.streakCount + 1 : 1;
      nextCompletedDate = todayKey;
    }

    await saveHydrationState({
      ...currentState,
      drankMl: nextDrank,
      lastIntakeAt: Date.now(),
      streakCount: nextStreak,
      lastCompletedDate: nextCompletedDate,
      lastProgressDate: todayKey,
    });

    handleBackToDashboard();
  }

  if (!permission) {
    return (
      <View style={styles.fallbackContainer}>
        <ActivityIndicator size="large" color={WaterColors.primaryDark} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access is needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera access so we can verify your hydration photo.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.topSection}>
            <Text style={styles.promptText}>Time to hydrate! Send us a photo of your water.</Text>
          </View>

          <View style={styles.reticleZone}>
            <Animated.View style={[styles.reticlePulse, pulseAnimatedStyle]} />
            <View style={styles.reticle}>
              <View style={[styles.reticleCorner, styles.reticleTopLeft]} />
              <View style={[styles.reticleCorner, styles.reticleTopRight]} />
              <View style={[styles.reticleCorner, styles.reticleBottomLeft]} />
              <View style={[styles.reticleCorner, styles.reticleBottomRight]} />
            </View>
            {isAnalyzing && (
              <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)}>
                <Text style={styles.scanText}>Checking your photo...</Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.bottomSection}>
            <Pressable
              onPress={handleCapture}
              disabled={isBusy}
              style={[styles.captureButton, isBusy && styles.captureButtonDisabled]}>
              <View style={styles.captureButtonInner} />
            </Pressable>
          </View>
        </View>
      </CameraView>

      {isAnalyzing && (
        <Animated.View
          style={styles.loadingOverlay}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}>
          <Text style={styles.loadingText}>Analyzing... 🔍</Text>
        </Animated.View>
      )}

      {verificationState === 'success' && (
        <Animated.View
          style={styles.centerFeedbackPanel}
          entering={SlideInDown.springify().damping(15).stiffness(160)}>
          <Text style={styles.successText}>Great, water added!</Text>
          <Text style={styles.successSubText}>Nice work staying consistent with your hydration today.</Text>
          <Pressable style={styles.resultActionButton} onPress={() => void handleConfirmSuccess()}>
            <Text style={styles.resultActionButtonText}>Back to Dashboard</Text>
          </Pressable>
        </Animated.View>
      )}

      {verificationState === 'rejected' && (
        <Animated.View
          style={styles.centerFeedbackPanel}
          entering={SlideInDown.springify().damping(15).stiffness(160)}>
          <Text style={styles.rejectTitle}>Oops!</Text>
          <Text style={styles.rejectSubText}>
            {feedbackMessage ||
              "Oops! That doesn't look like water to me. Are you sure you're drinking your hydration? 💧"}
          </Text>
          <Pressable style={styles.resultActionButton} onPress={handleBackToDashboard}>
            <Text style={styles.resultActionButtonText}>Back to Dashboard</Text>
          </Pressable>
          <Pressable style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WaterColors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 52,
  },
  topSection: {
    alignItems: 'center',
  },
  reticleZone: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticlePulse: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 194, 0.42)',
    backgroundColor: 'rgba(0, 255, 194, 0.04)',
  },
  reticle: {
    width: 200,
    height: 200,
    borderRadius: 14,
  },
  reticleCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(0, 255, 194, 0.95)',
  },
  reticleTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  reticleTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  reticleBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  reticleBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanText: {
    marginTop: 14,
    color: WaterColors.primary,
    fontSize: 13,
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'System',
  },
  promptText: {
    color: WaterColors.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
    backgroundColor: WaterColors.surface,
    borderWidth: 1,
    borderColor: WaterColors.border,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    overflow: 'hidden',
    fontFamily: 'System',
  },
  bottomSection: {
    alignItems: 'center',
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 194, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 194, 0.15)',
  },
  captureButtonDisabled: {
    opacity: 0.55,
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: WaterColors.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WaterColors.overlay,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingTop: 146,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: WaterColors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'System',
  },
  centerFeedbackPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    transform: [{ translateY: -90 }],
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  successText: {
    color: '#22C55E',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'System',
  },
  successSubText: {
    marginTop: 6,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  rejectTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'System',
  },
  rejectSubText: {
    marginTop: 8,
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'System',
  },
  tryAgainButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  resultActionButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WaterColors.background,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WaterColors.background,
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: WaterColors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  permissionBody: {
    marginTop: 10,
    textAlign: 'center',
    color: WaterColors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'System',
  },
  permissionButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 12,
    backgroundColor: WaterColors.primaryDark,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 194, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: '#04130F',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'System',
  },
});
