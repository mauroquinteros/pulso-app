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
};

// Operaciones and Retiro are visible but inert this slice — only Depósito is
// wired (the tracer bullet). The other forms arrive in later PRDs.
const OPERACIONES: RowSpec[] = [
  {
    icon: "arrow-down",
    iconBg: "rgba(120,160,255,0.14)",
    iconColor: "#9DB8FF",
    title: "Compra",
    subtitle: "Adquirir acciones o ETF",
  },
  {
    icon: "arrow-up",
    iconBg: "rgba(255,140,140,0.14)",
    iconColor: "#FF9D9D",
    title: "Venta",
    subtitle: "Vender una posición",
  },
  {
    icon: "cash-outline",
    iconBg: "rgba(0,229,204,0.12)",
    iconColor: "#4FE9D6",
    title: "Dividendo",
    subtitle: "Ingreso por dividendos",
  },
];

const RETIRO: RowSpec = {
  icon: "arrow-up",
  iconBg: "rgba(142,142,147,0.14)",
  iconColor: "#B8BCCB",
  title: "Retiro",
  subtitle: "Retirar efectivo de tu cuenta",
};

function TypeRow({ spec }: { spec: RowSpec }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: spec.iconBg }]}>
        <Ionicons name={spec.icon} size={18} color={spec.iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{spec.title}</Text>
        <Text style={styles.rowSubtitle}>{spec.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#3E4470" />
    </View>
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
          <Pressable
            style={[styles.row, styles.rowHighlight]}
            onPress={() => router.push("/add-movement/form")}
          >
            <View style={[styles.rowIcon, styles.rowIconDeposit]}>
              <Ionicons name="arrow-down" size={18} color="#04211E" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Depósito</Text>
              <Text style={[styles.rowSubtitle, styles.rowSubtitleDeposit]}>
                Agregar efectivo a tu cuenta
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
          </Pressable>
          <TypeRow spec={RETIRO} />
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
  rowHighlight: {
    backgroundColor: "rgba(0,229,204,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(0,229,204,0.45)",
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDeposit: {
    backgroundColor: Colors.accent,
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
  rowSubtitleDeposit: {
    color: "#7FE9DC",
  },
});
