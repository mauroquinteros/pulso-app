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
  buildDepositMovement,
  summarizeDeposit,
} from "@/components/add-movement/deposit-view-model";
import { Colors } from "@/constants/theme";
import { useMovementsStore } from "@/stores/movements";
import { formatUSD } from "@/utils/format";
import { sanitizeDecimal } from "@/utils/input";

export default function DepositFormScreen() {
  const addMovement = useMovementsStore((s) => s.addMovement);
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [executedAt, setExecutedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [touchedAmount, setTouchedAmount] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const summary = summarizeDeposit({ amount, transferFee: fee, executedAt });
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executedAt), "dd/MM/yyyy");

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showAmountError = touchedAmount && summary.amountInvalid;

  const amountBorderColor = showAmountError
    ? Colors.negative
    : summary.amountPositive
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const summaryColor = summary.amountPositive ? Colors.accent : "#3E4470";

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    // Android dialog closes itself on any action; commit only on "set".
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "set" && selected) {
      setExecutedAt(format(selected, "yyyy-MM-dd"));
    }
  };

  const onSave = () => {
    if (!canSave) return;
    const movement = buildDepositMovement(
      { amount, transferFee: fee, executedAt },
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
          <Text style={styles.headerTitle}>Depósito</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.fields}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* MONTO */}
          <Text style={styles.label}>Monto</Text>
          <View style={[styles.amountBox, { borderColor: amountBorderColor }]}>
            <Text
              style={[
                styles.amountDollar,
                {
                  color: summary.amountPositive
                    ? Colors.textPrimary
                    : "#5A6080",
                },
              ]}
            >
              $
            </Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#3E4470"
              value={amount}
              onChangeText={(t) => setAmount(sanitizeDecimal(t))}
              onBlur={() => setTouchedAmount(true)}
            />
          </View>
          {showAmountError && (
            <Text style={styles.errorText}>Ingresa un monto mayor a $0.</Text>
          )}

          {/* COMISIÓN + FECHA */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Comisión transf.</Text>
              <View style={styles.smallBox}>
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={fee}
                  onChangeText={(t) => setFee(sanitizeDecimal(t))}
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

          {/* INFO HINT */}
          <View style={styles.hint}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#7BA7E8"
              style={styles.hintIcon}
            />
            <Text style={styles.hintText}>
              Revisa la comisión. Se suma a tu monto para formar lo que aportas.
            </Text>
          </View>
        </ScrollView>

        {/* LIVE SUMMARY + BUTTON */}
        <View style={styles.bottom}>
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryLabel}>APORTARÁS</Text>
            <Text style={[styles.summaryValue, { color: summaryColor }]}>
              {formatUSD(summary.aportado)}
            </Text>
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
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
  },
  amountDollar: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.negative,
    marginTop: 6,
    marginHorizontal: 2,
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
  hint: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(91,134,196,0.08)",
    borderWidth: 1,
    borderColor: "rgba(91,134,196,0.25)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 18,
  },
  hintIcon: {
    marginTop: 1,
  },
  hintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: "#A9B7D0",
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  summaryWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 3,
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
