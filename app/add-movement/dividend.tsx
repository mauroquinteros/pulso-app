import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buildDividendMovement,
  summarizeDividend,
} from "@/components/add-movement/dividend-view-model";
import { Colors } from "@/constants/theme";
import { useMovementsStore } from "@/stores/movements";
import { formatUSD } from "@/utils/format";

/** Keep only digits and a single decimal point (UI-level input cleaning). */
function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

export default function DividendFormScreen() {
  const addMovement = useMovementsStore((s) => s.addMovement);
  const [ticker, setTicker] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [tax, setTax] = useState("");
  const [executedAt, setExecutedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [touchedTicker, setTouchedTicker] = useState(false);
  const [touchedGross, setTouchedGross] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const summary = summarizeDividend({ ticker, grossAmount, tax, executedAt });
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executedAt), "dd/MM/yyyy");

  const grossActive = parseFloat(grossAmount) > 0;
  const taxValue = tax === "" ? 0 : parseFloat(tax) || 0;

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showTickerError = touchedTicker && summary.tickerInvalid;
  const showGrossError = touchedGross && summary.grossInvalid;

  const tickerBorderColor = showTickerError
    ? Colors.negative
    : ticker !== ""
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const grossBorderColor = showGrossError
    ? Colors.negative
    : grossActive
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const taxBorderColor = summary.taxExceedsGross
    ? Colors.negative
    : taxValue > 0
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const totalColor = summary.taxExceedsGross
    ? Colors.negative
    : summary.total > 0
      ? Colors.textPrimary
      : "#3E4470";

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    // Android dialog closes itself on any action; commit only on "set".
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "set" && selected) {
      setExecutedAt(format(selected, "yyyy-MM-dd"));
    }
  };

  const onSave = () => {
    if (!canSave) return;
    const movement = buildDividendMovement(
      { ticker, grossAmount, tax, executedAt },
      {
        id: () => `local-${Date.now()}`,
        userId: () => "mock-user-001",
        now: () => new Date().toISOString(),
      },
    );
    addMovement(movement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>Dividendo</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.fields}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SÍMBOLO + FECHA */}
          <View style={styles.firstRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Símbolo</Text>
              <View
                style={[styles.smallBox, { borderColor: tickerBorderColor }]}
              >
                <TextInput
                  style={styles.symbolInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="Ej. AAPL"
                  placeholderTextColor="#3E4470"
                  value={ticker}
                  onChangeText={(t) =>
                    setTicker(t.toUpperCase().replace(/[^A-Z]/g, ""))
                  }
                  onBlur={() => setTouchedTicker(true)}
                />
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Fecha</Text>
              <Pressable
                style={styles.dateBox}
                onPress={() => setShowPicker(true)}
              >
                <Text style={styles.dateText}>{dateDisplay}</Text>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
          {showTickerError && (
            <Text style={styles.errorText}>Ingresa un símbolo.</Text>
          )}

          {/* MONTO BRUTO + IMPUESTOS */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Monto bruto</Text>
              <View
                style={[styles.smallBox, { borderColor: grossBorderColor }]}
              >
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={grossAmount}
                  onChangeText={(t) => setGrossAmount(sanitizeDecimal(t))}
                  onBlur={() => setTouchedGross(true)}
                />
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Impuestos</Text>
              <View style={[styles.smallBox, { borderColor: taxBorderColor }]}>
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={tax}
                  onChangeText={(t) => setTax(sanitizeDecimal(t))}
                />
              </View>
            </View>
          </View>
          {showGrossError && (
            <Text style={styles.errorText}>Ingresa un monto mayor a $0.</Text>
          )}
          {summary.taxExceedsGross && (
            <Text style={styles.errorText}>
              El impuesto no puede superar el monto bruto.
            </Text>
          )}

          {showPicker &&
            (Platform.OS === "ios" ? (
              <Modal transparent animationType="fade" visible>
                <Pressable
                  style={styles.modalBackdrop}
                  onPress={() => setShowPicker(false)}
                >
                  <Pressable style={styles.modalSheet}>
                    <DateTimePicker
                      value={parseISO(executedAt)}
                      mode="date"
                      display="inline"
                      maximumDate={new Date()}
                      themeVariant="dark"
                      accentColor={Colors.accent}
                      onChange={(_, d) =>
                        d && setExecutedAt(format(d, "yyyy-MM-dd"))
                      }
                    />
                    <Pressable
                      style={styles.modalDone}
                      onPress={() => setShowPicker(false)}
                    >
                      <Text style={styles.modalDoneText}>Listo</Text>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </Modal>
            ) : (
              <DateTimePicker
                value={parseISO(executedAt)}
                mode="date"
                maximumDate={new Date()}
                onChange={onChangeDate}
              />
            ))}
        </ScrollView>

        {/* BREAKDOWN + BUTTON */}
        <View style={styles.bottom}>
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Monto bruto</Text>
              <Text style={styles.breakdownValue}>
                {formatUSD(summary.gross)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Impuestos</Text>
              <Text style={styles.breakdownValue}>
                {taxValue > 0 ? `−${formatUSD(taxValue)}` : formatUSD(0)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total a recibir</Text>
              <Text style={[styles.totalValue, { color: totalColor }]}>
                {formatUSD(summary.total)}
              </Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: canSave ? Colors.accent : "#161B3D" },
              canSave && styles.buttonActive,
            ]}
            onPress={onSave}
            disabled={!canSave}
          >
            <Text
              style={[
                styles.buttonText,
                { color: canSave ? "#04211E" : "#4A5070" },
              ]}
            >
              Guardar movimiento
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  fields: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  symbolInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 1,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.negative,
    marginTop: 6,
    marginHorizontal: 2,
  },
  firstRow: {
    flexDirection: "row",
    gap: 12,
  },
  pairRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  smallBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  smallDollar: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5A6080",
    fontVariant: ["tabular-nums"],
  },
  smallInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  breakdown: {
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  button: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonActive: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,10,28,0.7)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  modalDone: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  modalDoneText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#04211E",
  },
});
