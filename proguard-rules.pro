# WaterSync — R8 / ProGuard keep rules for Expo release builds.
# Loaded via expo-build-properties (extraProguardRules).

# ── React Native / Hermes ────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ── Reanimated / Worklets / Screens / Gesture Handler ────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ── RevenueCat Purchases ─────────────────────────────────────────────────────
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# ── Mixpanel (JS-mode analytics; native package may still be linked) ─────────
-keep class com.mixpanel.** { *; }
-dontwarn com.mixpanel.**

# ── AsyncStorage ─────────────────────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ── Expo modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }

# ── Crash / stack traces ─────────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions
-keep public class * extends java.lang.Exception

# ── No ads ───────────────────────────────────────────────────────────────────
# App does not use advertising. AD_ID is blocked in app config.
# Do not add -keep rules for com.google.android.gms.ads.identifier.**
-dontwarn com.google.android.gms.ads.identifier.**
