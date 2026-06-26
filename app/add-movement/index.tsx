import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

type RowSpec = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  disabled: boolean;
  onPress?: () => void;
};

// Only Depósito is wired (the tracer bullet). The other four read as
// not-yet-built ("Pronto") and get re-enabled as their forms land.
const OPERACIONES: RowSpec[] = [
  {
    icon: "arrow-down",
    iconBg: "rgba(120,160,255,0.14)",
    iconColor: "#9DB8FF",
    title: "Compra",
    subtitle: "Adquirir acciones o ETF",
    disabled: true,
  },
  {
    icon: "arrow-up",
    iconBg: "rgba(255,140,140,0.14)",
    iconColor: "#FF9D9D",
    title: "Venta",
    subtitle: "Vender una posición",
    disabled: true,
  },
  {
    icon: "cash-outline",
    iconBg: "rgba(0,229,204,0.12)",
    iconColor: "#4FE9D6",
    title: "Dividendo",
    subtitle: "Ingreso por dividendos",
    disabled: true,
  },
];

const EFECTIVO: RowSpec[] = [
  {
    icon: "arrow-down",
    iconBg: "rgba(0,229,204,0.14)",
    iconColor: "#4FE9D6",
    title: "Depósito",
    subtitle: "Agregar efectivo a tu cuenta",
    disabled: false,
    onPress: () => router.push("/add-movement/form"),
  },
  {
    icon: "arrow-up",
    iconBg: "rgba(142,142,147,0.14)",
    iconColor: "#B8BCCB",
    title: "Retiro",
    subtitle: "Retirar efectivo de tu cuenta",
    disabled: true,
  },
];

function TypeRow({ spec }: { spec: RowSpec }) {
  const inner = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: spec.iconBg }]}>
        <Ionicons name={spec.icon} size={18} color={spec.iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{spec.title}</Text>
        <Text style={styles.rowSubtitle}>{spec.subtitle}</Text>
      </View>
      {spec.disabled ? (
        <View style={styles.prontoTag}>
          <Text style={styles.prontoText}>Pronto</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
      )}
    </>
  );

  if (spec.disabled) {
    return <View style={[styles.row, styles.rowDisabled]}>{inner}</View>;
  }
  return (
    <Pressable style={styles.row} onPress={spec.onPress}>
      {inner}
    </Pressable>
  );
}

export default function SelectMovementTypeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.dismiss()} hitSlop={8}>
          <Ionicons name="close" size={16} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuevo movimiento</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>OPERACIONES</Text>
        <View style={styles.group}>
          {OPERACIONES.map((spec) => (
            <TypeRow key={spec.title} spec={spec} />
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>EFECTIVO</Text>
        <View style={styles.group}>
          {EFECTIVO.map((spec) => (
            <TypeRow key={spec.title} spec={spec} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 34,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#5A6080",
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  sectionLabelSpaced: {
    marginTop: 22,
  },
  group: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  prontoTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: "rgba(142,142,147,0.14)",
  },
  prontoText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
});
