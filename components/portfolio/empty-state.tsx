import { Colors } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onAddMovement?: () => void;
};

/** Shown when there are no holdings and no cash: a short prompt and a CTA into
 * the add-movement picker, in place of the cards. */
export function EmptyState({ onAddMovement }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Tu portafolio está vacío</Text>
      <Text style={styles.body}>
        Registra tu primer movimiento para ver cómo se distribuye tu dinero.
      </Text>
      <Pressable style={styles.cta} onPress={onAddMovement}>
        <Text style={styles.ctaText}>Agregar movimiento</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  cta: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.avatarText,
  },
});
