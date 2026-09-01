import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/ui/press-feedback";
import { Colors, Gradients } from "@/constants/theme";
import { readHistory } from "@/lib/history";
import { useMovementsStore } from "@/stores/movements";

// The glyph deliberately does *not* reuse the empty states' ledger-with-a-badge
// illustration, which means "nothing recorded yet" - the single confusion this
// screen exists to prevent. It borrows their outline colour instead, so a
// failure reads as muted rather than as an alarm.
const GLYPH = "#3B4380";

/**
 * The tabs require a History; this is what enforces it. It observes the read and
 * renders one of three things: a spinner while the three selects are in flight,
 * the failure screen if any of them failed, the tabs once the History is in
 * hand. Below it nothing branches on "not yet known" - every screen, every
 * view-model and `usePortfolio` go on receiving a definite `Movement[]`, which
 * mirrors the root layout holding the splash until the session is known.
 *
 * The read is triggered by state, never by lifecycle: *if the History is
 * `unread`, read it*. Cold start, a fresh sign-in and Reintentar all funnel
 * through that one condition, since both sign-out and retry set the status back
 * to `unread`. Nothing else can start a read - not a `TOKEN_REFRESHED` event
 * (the status never leaves `ready`), not a tab switch, not a modal, not the app
 * returning from the background.
 */
export function RequireHistory({ children }: { children: ReactNode }) {
  const status = useMovementsStore((s) => s.status);
  const startRead = useMovementsStore((s) => s.startRead);
  const answerRead = useMovementsStore((s) => s.answerRead);
  const forgetHistory = useMovementsStore((s) => s.forgetHistory);

  useEffect(() => {
    if (status !== "unread") return;

    // The id comes back from the store rather than from a ref here: this
    // component unmounts the moment the session guard falls, so a counter of its
    // own would restart at zero for the next Perfil and their read would answer
    // to the same id as the previous Perfil's in-flight one.
    const readId = startRead();
    readHistory().then((answer) => answerRead(readId, answer));
  }, [status, startRead, answerRead]);

  if (status === "failed") return <HistoryUnavailable onRetry={forgetHistory} />;
  if (status !== "ready") return <ReadingHistory />;

  return <>{children}</>;
}

function ReadingHistory() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color={Colors.textSecondary} />
    </View>
  );
}

/**
 * "No pudimos cargar" is what keeps this screen apart from the empty state's
 * "Todavía no hay movimientos": they name the same noun, and only the verb says
 * that the app failed rather than that the user has recorded nothing. A failed
 * read is never described as *stale* - that word belongs to prices alone.
 */
function HistoryUnavailable({ onRetry }: { onRetry: () => void }) {
  const press = usePressScale(0.97);
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="cloud-offline-outline"
        size={64}
        color={GLYPH}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.title}>No pudimos cargar tus movimientos</Text>
      <Text style={styles.body}>Revisa tu conexión e inténtalo de nuevo.</Text>
      <AnimatedPressable style={press.style} {...press.handlers} onPress={onRetry}>
        <LinearGradient colors={Gradients.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <Text style={styles.ctaText}>Reintentar</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 60,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    maxWidth: 240,
    textAlign: "center",
    marginBottom: 20,
  },
  cta: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.avatarText,
  },
});
