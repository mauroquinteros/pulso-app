import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildDividendMovement, summarizeDividend } from "@/components/add-movement/dividend-view-model";
import { baseFormStyles } from "@/components/add-movement/form-styles";
import { MovementDatePicker } from "@/components/add-movement/movement-date-picker";
import { defaultMovementDeps } from "@/components/add-movement/movement-deps";
import { SaveButton } from "@/components/add-movement/save-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { saveMovement } from "@/lib/history";
import { useMovementsStore } from "@/stores/movements";
import { formatUSD } from "@/utils/format";
import { sanitizeDecimal } from "@/utils/input";

export default function DividendFormScreen() {
  const movementSaved = useMovementsStore((s) => s.movementSaved);
  // Held in state, so the id is minted once per form session rather than once
  // per tap. If the insert lands but its response does not, the second tap
  // carries the id the first one used and Postgres refuses the duplicate -
  // instead of recording the dividend twice and doubling Net Dividends (ADR 0010).
  const [deps] = useState(defaultMovementDeps);
  const [ticker, setTicker] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [tax, setTax] = useState("");
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [touchedTicker, setTouchedTicker] = useState(false);
  const [touchedGross, setTouchedGross] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const summary = summarizeDividend({ ticker, grossAmount, tax, executionDate });
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executionDate), "dd/MM/yyyy");

  const grossActive = summary.gross > 0;
  const taxValue = summary.tax;

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showTickerError = touchedTicker && summary.tickerInvalid;
  const showGrossError = touchedGross && summary.grossInvalid;

  const tickerBorderColor = showTickerError ? Colors.negative : ticker !== "" ? "rgba(0,229,204,0.5)" : Colors.border;

  const grossBorderColor = showGrossError ? Colors.negative : grossActive ? "rgba(0,229,204,0.5)" : Colors.border;

  const taxBorderColor = summary.taxExceedsGross
    ? Colors.negative
    : taxValue > 0
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const totalColor = summary.taxExceedsGross ? Colors.negative : summary.total > 0 ? Colors.textPrimary : "#3E4470";

  // The save waits for Postgres. Nothing is written optimistically: the store is
  // the sole input to the engine, so a dividend it never received would not be a
  // pending write but an Efectivo and a Net Dividends that are wrong with nothing
  // on screen saying so - and the Compra form's funds gate trusts that figure
  // (ADR 0010).
  const onSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveFailed(false);

    const answer = await saveMovement(buildDividendMovement({ ticker, grossAmount, tax, executionDate }, deps));

    if (!answer.ok) {
      // The form stays exactly as the user left it - Símbolo, Monto bruto,
      // Impuestos and Fecha all still typed - and says the save failed. There is
      // nothing to roll back, because nothing was written.
      setSaving(false);
      setSaveFailed(true);
      return;
    }

    // The Movement built from the row Postgres stored, never the one built here.
    // `saving` is deliberately left standing: the form is dismissing, and the
    // button stays inert on the way out.
    movementSaved(answer.movement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title="Dividendo" />

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
              <View style={[styles.smallBox, { borderColor: tickerBorderColor }]}>
                <TextInput
                  style={styles.symbolInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="Ej. AAPL"
                  placeholderTextColor="#3E4470"
                  value={ticker}
                  onChangeText={(t) => setTicker(t.toUpperCase().replace(/[^A-Z]/g, ""))}
                  onBlur={() => setTouchedTicker(true)}
                />
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Fecha</Text>
              <Pressable style={styles.dateBox} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>{dateDisplay}</Text>
                <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          {showTickerError && <Text style={styles.errorText}>Ingresa un símbolo.</Text>}

          {/* MONTO BRUTO + IMPUESTOS */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Monto bruto</Text>
              <View style={[styles.smallBox, { borderColor: grossBorderColor }]}>
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
          {showGrossError && <Text style={styles.errorText}>Ingresa un monto mayor a $0.</Text>}
          {summary.taxExceedsGross && (
            <Text style={styles.errorText}>El impuesto no puede superar el monto bruto.</Text>
          )}

          <MovementDatePicker
            value={executionDate}
            visible={showPicker}
            onChange={setExecutionDate}
            onClose={() => setShowPicker(false)}
          />
        </ScrollView>

        {/* BREAKDOWN + BUTTON */}
        <View style={styles.bottom}>
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Monto bruto</Text>
              <Text style={styles.breakdownValue}>{formatUSD(summary.gross)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Impuestos</Text>
              <Text style={styles.breakdownValue}>{taxValue > 0 ? `-${formatUSD(taxValue)}` : formatUSD(0)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total a recibir</Text>
              <Text style={[styles.totalValue, { color: totalColor }]}>{formatUSD(summary.total)}</Text>
            </View>
          </View>
          {saveFailed && <Text style={styles.saveError}>No pudimos guardar tu dividendo. Inténtalo de nuevo.</Text>}
          <SaveButton canSave={canSave} pending={saving} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ...baseFormStyles,
  symbolInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 1,
    padding: 0,
  },
  firstRow: {
    flexDirection: "row",
    gap: 12,
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
