import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { baseFormStyles } from "@/components/add-movement/form-styles";
import { MovementDatePicker } from "@/components/add-movement/movement-date-picker";
import { defaultMovementDeps } from "@/components/add-movement/movement-deps";
import { SaveButton } from "@/components/add-movement/save-button";
import { buildWithdrawalMovement, summarizeWithdrawal } from "@/components/add-movement/withdrawal-view-model";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { saveMovement } from "@/lib/history";
import { useMovementsStore } from "@/stores/movements";
import { formatUSD } from "@/utils/format";
import { sanitizeDecimal } from "@/utils/input";

export default function WithdrawalFormScreen() {
  const movementSaved = useMovementsStore((s) => s.movementSaved);
  const availableCash = usePortfolio().cash;
  // Held in state, so the id is minted once per form session rather than once
  // per tap. If the insert lands but its response does not, the second tap
  // carries the id the first one used and Postgres refuses the duplicate -
  // instead of recording the withdrawal twice and draining Cash twice (ADR 0010).
  const [deps] = useState(defaultMovementDeps);
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [touchedAmount, setTouchedAmount] = useState(false);
  const [touchedFee, setTouchedFee] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const summary = summarizeWithdrawal({ amount, transferFee: fee, executionDate }, availableCash);
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executionDate), "dd/MM/yyyy");

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showAmountError = touchedAmount && (summary.amountInvalid || summary.insufficientFunds);
  const showFeeError = touchedFee && summary.feeInvalid;

  const amountErrorMsg = summary.amountInvalid
    ? "Ingresa un monto mayor a $0."
    : `Solo tienes ${formatUSD(availableCash)} disponible.`;

  const amountBorderColor = showAmountError
    ? Colors.negative
    : summary.amountPositive && !summary.insufficientFunds
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const summaryColor =
    summary.feeInvalid || summary.recibiras < -0.005
      ? Colors.negative
      : summary.amountPositive
        ? Colors.accent
        : "#3E4470";

  // The save waits for Postgres. Nothing is written optimistically: the store is
  // the sole input to the engine, so a withdrawal it never received would not be
  // a pending write but a Cash figure that is wrong with nothing on screen
  // saying so - and this form's own gate trusts that figure (ADR 0010).
  const onSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveFailed(false);

    const answer = await saveMovement(buildWithdrawalMovement({ amount, transferFee: fee, executionDate }, deps));

    if (!answer.ok) {
      // The form stays exactly as the user left it - Monto, Comisión and Fecha
      // all still typed - and says the save failed. There is nothing to roll
      // back, because nothing was written.
      setSaving(false);
      setSaveFailed(true);
      return;
    }

    // The Movement built from the row Postgres stored, never the one built
    // here. `saving` is deliberately left standing: the form is dismissing, and
    // the button stays inert on the way out.
    movementSaved(answer.movement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title="Retiro" />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.fields}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* MONTO */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, styles.labelInRow]}>Monto</Text>
            <Text style={styles.available}>Disponible {formatUSD(availableCash)}</Text>
          </View>
          <View style={[styles.amountBox, { borderColor: amountBorderColor }]}>
            <Text
              style={[
                styles.amountDollar,
                {
                  color: summary.amountPositive ? Colors.textPrimary : "#5A6080",
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
          {showAmountError && <Text style={styles.errorText}>{amountErrorMsg}</Text>}

          {/* COMISIÓN + FECHA */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Comisión</Text>
              <View style={[styles.smallBox, showFeeError && { borderColor: Colors.negative }]}>
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={fee}
                  onChangeText={(t) => setFee(sanitizeDecimal(t))}
                  onBlur={() => setTouchedFee(true)}
                />
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Fecha</Text>
              <Pressable
                style={styles.dateBox}
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Fecha, ${dateDisplay}`}
              >
                <Text style={styles.dateText}>{dateDisplay}</Text>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={Colors.textSecondary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            </View>
          </View>
          {showFeeError && <Text style={styles.errorText}>La comisión debe ser menor al monto.</Text>}

          <MovementDatePicker
            value={executionDate}
            visible={showPicker}
            onChange={setExecutionDate}
            onClose={() => setShowPicker(false)}
          />

          {/* INFO HINT */}
          <View style={styles.hint}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#7BA7E8"
              style={styles.hintIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.hintText}>
              Revisa la comisión que aplica tu banco; se descuenta de lo que recibes, no del efectivo que sale.
            </Text>
          </View>
        </ScrollView>

        {/* LIVE SUMMARY + BUTTON */}
        <View style={styles.bottom}>
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryLabel}>RECIBIRÁS EN TU BANCO</Text>
            <Text style={[styles.summaryValue, { color: summaryColor }]}>{formatUSD(summary.recibiras)}</Text>
          </View>
          {saveFailed && <Text style={styles.saveError}>No pudimos guardar tu retiro. Inténtalo de nuevo.</Text>}
          <SaveButton canSave={canSave} pending={saving} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ...baseFormStyles,
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  labelInRow: {
    marginBottom: 0,
  },
  available: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5A6080",
    fontVariant: ["tabular-nums"],
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
  // Above the button rather than beside a field: the failure is the save's, not
  // any one input's, and it has to be readable without scrolling back up.
  saveError: {
    fontSize: 12.5,
    fontWeight: "600",
    color: Colors.negative,
    textAlign: "center",
    marginBottom: 10,
  },
});
