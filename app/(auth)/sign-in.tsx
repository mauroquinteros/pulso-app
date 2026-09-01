import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { useEffect, useReducer } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { GoogleG } from "@/components/brand/google-g";
import { LatidoMark } from "@/components/brand/latido-mark";
import { AnimatedPressable, usePressProgress } from "@/components/ui/press-feedback";
import { Duration, Ease } from "@/constants/motion";
import { Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";
import { initialSignInState, signInReducer } from "@/utils/sign-in";

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
  const signing = state.status === "signing";

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

  // Neither hook fits: dimming needs contrast to give up and this surface has
  // 1.25:1 against the screen, and `usePressFill` would REPLACE the button's own
  // backgroundColor rather than layer over it. 8% white over the base instead,
  // interpolated rather than named so the two cannot drift.
  const buttonPress = usePressProgress();
  const buttonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(buttonPress.progress.value * 0.08, [0, 1], [Colors.border, "#FFFFFF"]),
  }));

  const onPress = async () => {
    // The machine ignores this while signing, but the sheet should not be asked
    // to open twice either.
    if (signing) {
      return;
    }
    dispatch({ type: "tapped" });

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

  return (
    <View style={styles.screen}>
      {/* Only the block moves. The background stays put, because a fading
          background reads as the app loading rather than the screen arriving. */}
      <Animated.View style={[styles.block, entranceStyle]}>
        <LatidoMark size={64} />

        <Text style={styles.title}>Entra a Pulso</Text>
        <Text style={styles.supporting}>Tu portafolio de inversión, claro y al día.</Text>

        <AnimatedPressable
          style={[styles.button, signing && styles.buttonSigning, buttonStyle]}
          {...buttonPress.handlers}
          onPress={onPress}
          disabled={signing}
          accessibilityRole="button"
          accessibilityState={{ disabled: signing, busy: signing }}
        >
          {/* The spinner replaces the G rather than joining it, at the same 20pt
              in the same slot, so the label does not shift sideways mid-tap. */}
          <View style={styles.glyph}>
            {signing ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : <GoogleG size={20} />}
          </View>
          <Text style={styles.buttonLabel}>{signing ? "Conectando..." : "Continuar con Google"}</Text>
        </AnimatedPressable>

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
    backgroundColor: Colors.border,
  },
  buttonSigning: {
    opacity: 0.6,
  },
  buttonLabel: {
    ...Typography.cardTitle,
    fontFamily: "Manrope_700Bold",
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  glyph: {
    width: 20,
    height: 20,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
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
