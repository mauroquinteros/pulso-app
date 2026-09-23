import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useReducer, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { GoogleG } from "@/components/brand/google-g";
import { LatidoMark } from "@/components/brand/latido-mark";
import { AnimatedPressable, usePressSpring } from "@/components/ui/press-feedback";
import { Duration, Ease } from "@/constants/motion";
import { Colors, Gradients } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { syncAppleProfileNameAfterSignIn } from "@/lib/apple-profile-name";
import { signInWithApple } from "@/lib/apple-sign-in";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";
import { initialSignInState, signInReducer } from "@/utils/sign-in";

/** `Gradients.avatar` darkened, which is what the design's pressed state is.
 * A gradient's stops cannot be animated, so the button stacks this one over the
 * idle one and crossfades its opacity instead. */
const PRESSED_GRADIENT = ["#00C4AF", "#177F75"] as const;

/** 135deg, the angle the design draws every Pulso gradient at. */
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/**
 * A failed exchange is only worth blaming the network for when the request never
 * landed. `isAuthRetryableFetchError` also covers a 503, and telling someone to
 * check their internet while Supabase is the thing that is down sends them to
 * fix something that was never broken - hence the status check.
 */
function isOffline(error: unknown): boolean {
  return isAuthRetryableFetchError(error) && (error as { status?: number }).status === 0;
}

export default function SignInScreen() {
  const [state, dispatch] = useReducer(signInReducer, initialSignInState);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const signing = state.status === "signing";
  const signingProvider = state.status === "signing" ? state.provider : null;

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let mounted = true;
    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setAppleAvailable(available);
      })
      .catch(() => {
        if (mounted) setAppleAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 0 -> 1 drives both halves of the entrance: fade in, and rise the last 10px.
  const entrance = useSharedValue(0);

  useEffect(() => {
    // Nothing here asks about reduce motion, and that is the reason this screen
    // moved off RN's `Animated`: `withTiming` consults the system setting itself
    // and assigns the end value outright, which is the same "arrives already
    // composed" this used to spell out by hand - and it decides it on the first
    // frame rather than whenever a promise resolved.
    entrance.value = withTiming(1, { duration: Duration.enter, easing: Ease.enter });
  }, [entrance]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 10 }],
  }));

  const buttonPress = usePressSpring();

  // `shadowOffset` is an object and Reanimated has no path to one, so it holds
  // the idle 8pt while opacity and radius carry the glow closing in.
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - buttonPress.progress.value * 0.03 }],
    shadowOpacity: 0.25 - buttonPress.progress.value * 0.1,
    shadowRadius: 24 - buttonPress.progress.value * 14,
  }));

  const pressedGradientStyle = useAnimatedStyle(() => ({
    opacity: buttonPress.progress.value,
  }));

  const onGooglePress = async () => {
    // The machine ignores this while signing, but the sheet should not be asked
    // to open twice either.
    if (signing) {
      return;
    }
    dispatch({ type: "tapped", provider: "google" });

    const result = await signInWithGoogle();

    if (result.outcome === "cancelled") {
      dispatch({ type: "cancelled" });
      return;
    }

    if (result.outcome !== "token") {
      // The adapter has already classified it; the screen only renames its
      // catch-all, which the machine calls `other`.
      dispatch({ type: "failed", reason: result.outcome === "offline" ? "offline" : "other" });
      return;
    }

    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: result.idToken });

    // On success nothing is dispatched: the session lands, the guard swaps the
    // tree, and this screen stops existing. Moving the machine first would be a
    // state nobody ever sees.
    if (error) {
      dispatch({ type: "failed", reason: isOffline(error) ? "offline" : "other" });
    }
  };

  const onApplePress = async () => {
    if (signing) {
      return;
    }
    dispatch({ type: "tapped", provider: "apple" });

    const result = await signInWithApple();

    if (result.outcome === "cancelled") {
      dispatch({ type: "cancelled" });
      return;
    }

    if (result.outcome !== "token") {
      dispatch({ type: "failed", reason: result.outcome === "offline" ? "offline" : "other" });
      return;
    }

    const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: result.idToken });

    if (error) {
      dispatch({ type: "failed", reason: isOffline(error) ? "offline" : "other" });
      return;
    }

    if (result.fullName && data.user) {
      await syncAppleProfileNameAfterSignIn(data.user, result.fullName);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Only the block moves. The background stays put, because a fading
          background reads as the app loading rather than the screen arriving. */}
      <Animated.View style={[styles.block, entranceStyle]}>
        <LatidoMark size={64} disc="gradient" />

        <Text style={styles.title}>Entra a Pulso</Text>
        <Text style={styles.supporting}>Tu portafolio de inversión, claro y al día.</Text>

        <AnimatedPressable
          style={[styles.button, signing && styles.buttonSigning, buttonStyle]}
          {...buttonPress.handlers}
          onPress={onGooglePress}
          disabled={signing}
          accessibilityRole="button"
          accessibilityState={{ disabled: signing, busy: signing }}
        >
          {/* Declared first so they paint behind the label, and absolute so they
              stay out of the row that centres it. */}
          <LinearGradient colors={Gradients.avatar} start={GRADIENT_START} end={GRADIENT_END} style={styles.fill} />
          <Animated.View style={[StyleSheet.absoluteFill, pressedGradientStyle]}>
            <LinearGradient colors={PRESSED_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.fill} />
          </Animated.View>
          {/* The spinner replaces the G rather than joining it, at the same 20pt
              in the same slot, so the label does not shift sideways mid-tap. */}
          <View style={styles.glyph}>
            {signingProvider === "google" ? (
              <ActivityIndicator size="small" color={Colors.avatarText} />
            ) : (
              <GoogleG size={16} color={Colors.avatarText} />
            )}
          </View>
          <Text style={styles.buttonLabel}>
            {signingProvider === "google" ? "Conectando..." : "Continuar con Google"}
          </Text>
        </AnimatedPressable>

        {Platform.OS === "ios" ? (
          <View
            style={[styles.appleButtonSlot, signingProvider === "google" && styles.appleButtonDisabled]}
            pointerEvents={signing ? "none" : "auto"}
          >
            {signingProvider === "apple" ? (
              <View
                style={styles.appleLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: true, busy: true }}
              >
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.appleLoadingLabel}>Conectando...</Text>
              </View>
            ) : appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={28}
                style={styles.appleButton}
                onPress={onApplePress}
                accessibilityState={{ disabled: signing }}
              />
            ) : null}
          </View>
        ) : null}

        {/* Reserved whether or not it holds anything: a message that appears has
            to arrive without shoving the button out from under a finger. */}
        <View style={styles.errorSlot}>
          {state.status === "failed" ? (
            <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
              {state.message}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    // Not centered and not pinned: a bottom-pinned CTA reads as a form footer
    // and there is no form. The fixed offset plus the gaps below put the
    // button's center around 43% of the screen, and only the space underneath
    // flexes - so the composition holds on a small phone.
    paddingTop: 84,
  },
  // Carries the centring the screen used to do, so the button's `alignSelf:
  // stretch` still measures against the gutters and not against its own label.
  block: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  title: {
    ...Typography.heroValue,
    color: Colors.textPrimary,
    marginTop: 40,
    textAlign: "center",
  },
  supporting: {
    ...Typography.body,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 12,
    maxWidth: 280,
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    height: 56,
    marginTop: 40,
    borderRadius: 9999,
    // Under the gradients and never seen, but a transparent view casts no
    // reliable shadow on iOS - this is what the glow is thrown from.
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  /** EVERY gradient carries this, because nothing above them clips: the button
   * cannot take `overflow: hidden` without iOS clipping the glow it casts, so a
   * gradient that does not round itself paints square corners over the ones the
   * button drew. */
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
  buttonSigning: {
    opacity: 0.6,
  },
  buttonLabel: {
    ...Typography.cardTitle,
    fontSize: 21,
    fontFamily: Platform.select({ ios: "System", default: "Manrope_600SemiBold" }),
    fontWeight: "600",
    color: Colors.avatarText,
  },
  glyph: {
    width: 20,
    height: 20,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  appleButtonSlot: {
    alignSelf: "stretch",
    height: 56,
    marginTop: 12,
  },
  appleButton: {
    width: "100%",
    height: 56,
  },
  appleButtonDisabled: {
    opacity: 0.6,
  },
  appleLoading: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  appleLoadingLabel: {
    ...Typography.cardTitle,
    fontSize: 19,
    fontFamily: "System",
    fontWeight: "600",
    color: "#000000",
  },
  errorSlot: {
    height: 36,
    marginTop: 16,
    justifyContent: "center",
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Manrope_600SemiBold",
    color: Colors.negative,
    textAlign: "center",
  },
});
