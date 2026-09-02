import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Duration } from "@/constants/motion";

/**
 * Inicio's banner for a Quote refresh that failed: the prices stay on screen and
 * this says the app could not update them.
 *
 * It lives on Inicio, and only on Inicio. Portafolio also renders price-applied
 * figures, but Inicio is the tab the app opens on - so a user returning from the
 * background, which is the one thing that fires a refresh at all, lands here -
 * and it is where the price-applied *headline* is: Vale hoy and Total Return are
 * the figures whose meaning changes most when the prices behind them could not
 * be refreshed. Portafolio's own price caveat is already spelled out on the
 * Distribución card ("N activos sin precio"), which names an absence; a second
 * sentence about a fault sitting beside it would be read as the same one. One
 * screen also keeps this a banner rather than the beginnings of a notification
 * system - if the gap ever matters, rendering this component on Portafolio too
 * is one line.
 *
 * The wording says what the *attempt* did, never how old the prices are.
 * "No pudimos actualizar los precios" is a fact about the app and needs no
 * market calendar; how old a Quote is relative to market activity is a Stale
 * Price judgement, which is a different signal and deliberately not lit here
 * (ADR 0011). "actualizar" is also only sayable about something already in hand,
 * which is exactly what separates this from the History's "No pudimos cargar tus
 * movimientos" - a different verb about a different noun, naming a failure to
 * obtain rather than a failure to renew. The two can never share a screen
 * anyway: a failed History replaces the tabs entirely.
 */
export function RefreshFailedBanner() {
  return (
    // Both are up-side animations, which is the symmetry this wants: it arrives
    // from the edge it lives against and leaves the same way. Neither asks about
    // reduce motion - Reanimated's builders default to `ReduceMotion.System`.
    <Animated.View
      style={styles.banner}
      entering={FadeInUp.duration(Duration.enter)}
      exiting={FadeOutUp.duration(Duration.base)}
    >
      <Ionicons
        name="cloud-offline-outline"
        size={15}
        color={Colors.textSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.text}>No pudimos actualizar los precios</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
