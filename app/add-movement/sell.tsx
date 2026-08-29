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
import { buildSellMovement, summarizeSell } from "@/components/add-movement/sell-view-model";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { saveMovement } from "@/lib/history";
import { useMovementsStore } from "@/stores/movements";
import { formatShares, formatUSD } from "@/utils/format";
import { sanitizeDecimal } from "@/utils/input";
import { maxSellableAsOf } from "@/utils/portfolio/reducer";

export default function SellFormScreen() {
  const movementSaved = useMovementsStore((s) => s.movementSaved);
  const movements = useMovementsStore((s) => s.movements);
  const holdings = usePortfolio().holdings;
  // Held in state, so the id is minted once per form session rather than once
  // per tap. If the insert lands but its response does not, the second tap
  // carries the id the first one used and Postgres refuses the duplicate -
  // instead of recording the sale twice and closing a position that is still
  // open (ADR 0010).
  const [deps] = useState(defaultMovementDeps);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [executionPrice, setExecutionPrice] = useState("");
  const [fee, setFee] = useState("");
  const [regulatoryFees, setRegulatoryFees] = useState("");
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [touchedTicker, setTouchedTicker] = useState(false);
  const [touchedShares, setTouchedShares] = useState(false);
  const [touchedPrice, setTouchedPrice] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // What the user holds today (for the "never owned it" message) vs. what a
  // sell dated `executionDate` may actually take: a backdated sale is limited
  // by the holdings AT that date and by later sells that already spent them —
  // otherwise the engine's replay would meet a sell with nothing behind it.
  const currentShares = holdings.find((h) => h.ticker === ticker)?.shares ?? 0;
  const availableShares = maxSellableAsOf(movements, ticker, executionDate);

  const summary = summarizeSell(
    { ticker, shares, executionPrice, fee, regulatoryFees, executionDate },
    availableShares,
  );
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executionDate), "dd/MM/yyyy");

  const sharesActive = summary.sharesPositive;
  const feeValue = summary.fee;
  const regValue = summary.regulatoryFees;

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showTickerError = touchedTicker && summary.tickerInvalid;
  const showSharesError = touchedShares && (summary.sharesInvalid || summary.insufficientShares);
  const showPriceError = touchedPrice && summary.priceInvalid;

  // The date-qualified variants only appear when the chosen date (not the
  // current position) is what binds — the common today-dated case reads plain.
  const sharesErrorMsg = summary.sharesInvalid
    ? "Ingresa una cantidad mayor a 0."
    : currentShares === 0
      ? `No tienes acciones de ${ticker}.`
      : availableShares === 0
        ? `No tenías acciones de ${ticker} en esa fecha.`
        : availableShares === currentShares
          ? `Solo tienes ${formatShares(availableShares)} acciones.`
          : `En esa fecha solo puedes vender ${formatShares(availableShares)} acciones.`;

  const showDisponible = ticker !== "" && availableShares > 0 && !(touchedShares && summary.insufficientShares);

  // Deliberately not `showDisponible`: that hides the helper while an over-sell
  // error is up, which is exactly when this button is worth reaching for.
  const canSellAll = ticker !== "" && availableShares > 0 && !saving;

  // The count the app believes, not the one the broker filled - a position sold
  // at the broker's figure keeps Dust forever (ADR 0014).
  const onSellAll = () => {
    setShares(formatShares(availableShares));
    setTouchedShares(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const tickerBorderColor = showTickerError ? Colors.negative : ticker !== "" ? "rgba(0,229,204,0.5)" : Colors.border;

  const sharesBorderColor = showSharesError
    ? Colors.negative
    : sharesActive && !summary.insufficientShares
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const priceBorderColor = showPriceError
    ? Colors.negative
    : summary.pricePositive
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const totalColor =
    summary.insufficientShares || summary.feesExceedGross
      ? Colors.negative
      : summary.total > 0
        ? Colors.textPrimary
        : "#3E4470";

  // The save waits for Postgres. Nothing is written optimistically: the store is
  // the sole input to the engine, so a sell it never received would not be a
  // pending write but a position shown as closed that is still open, an
  // overstated Cash and a Realized P&L for a sale that did not happen - and
  // this form's own shares gate trusts those figures (ADR 0010).
  const onSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveFailed(false);

    const answer = await saveMovement(
      buildSellMovement({ ticker, shares, executionPrice, fee, regulatoryFees, executionDate }, deps),
    );

    if (!answer.ok) {
      // The form stays exactly as the user left it - Símbolo, Acciones, Precio,
      // Comisión, Impuestos and Fecha all still typed - and says the save
      // failed. There is nothing to roll back, because nothing was written.
      setSaving(false);
      setSaveFailed(true);
      return;
    }

    // The Movement built from the row Postgres stored, never the one built
    // here - so `createdAt` arrives from the database's clock, which for a sell
    // is what orders it against a same-day buy and therefore decides the
    // Average Cost the sale is measured against. `saving` is deliberately left
    // standing: the form is dismissing, and the button stays inert on the way
    // out.
    movementSaved(answer.movement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title="Venta" />

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

          {/* ACCIONES + PRECIO */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Acciones</Text>
              <View style={[styles.smallBox, { borderColor: sharesBorderColor }]}>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#3E4470"
                  value={shares}
                  onChangeText={(t) => setShares(sanitizeDecimal(t, 5))}
                  onBlur={() => setTouchedShares(true)}
                />
              </View>
              {showDisponible && <Text style={styles.helperText}>Disponible {formatShares(availableShares)}</Text>}
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Precio de ejecución</Text>
              <View style={[styles.smallBox, { borderColor: priceBorderColor }]}>
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={executionPrice}
                  onChangeText={(t) => setExecutionPrice(sanitizeDecimal(t))}
                  onBlur={() => setTouchedPrice(true)}
                />
              </View>
            </View>
          </View>
          {showSharesError && <Text style={styles.errorText}>{sharesErrorMsg}</Text>}
          {showPriceError && !showSharesError && <Text style={styles.errorText}>Ingresa un precio mayor a $0.</Text>}

          {/* COMISIÓN + IMPUESTOS */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Comisión</Text>
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
              <Text style={styles.label}>Impuestos</Text>
              <View style={styles.smallBox}>
                <Text style={styles.smallDollar}>$</Text>
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#3E4470"
                  value={regulatoryFees}
                  onChangeText={(t) => setRegulatoryFees(sanitizeDecimal(t))}
                />
              </View>
            </View>
          </View>

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
              <Text style={styles.breakdownLabel}>Comisión</Text>
              <Text style={styles.breakdownValue}>{feeValue > 0 ? `-${formatUSD(feeValue)}` : formatUSD(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Impuestos</Text>
              <Text style={styles.breakdownValue}>{regValue > 0 ? `-${formatUSD(regValue)}` : formatUSD(0)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total a recibir</Text>
              <Text style={[styles.totalValue, { color: totalColor }]}>{formatUSD(summary.total)}</Text>
            </View>
            {summary.feesExceedGross && (
              <Text style={styles.errorText}>La comisión y los impuestos superan el monto bruto</Text>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sellAll,
              canSellAll ? styles.sellAllActive : styles.sellAllDisabled,
              pressed && styles.sellAllPressed,
            ]}
            onPress={onSellAll}
            disabled={!canSellAll}
            accessibilityRole="button"
            accessibilityLabel={`Vender todo, ${formatShares(availableShares)} acciones`}
          >
            <Text style={[styles.sellAllText, !canSellAll && styles.sellAllTextDisabled]}>Vender todo</Text>
          </Pressable>
          {saveFailed && <Text style={styles.saveError}>No pudimos guardar tu venta. Inténtalo de nuevo.</Text>}
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
  helperText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5A6080",
    fontVariant: ["tabular-nums"],
    marginTop: 6,
    marginHorizontal: 2,
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
  // Secondary to Guardar movimiento in every respect but width and radius: no
  // fill, lighter label, and none of its teal glow.
  sellAll: {
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    marginBottom: 10,
  },
  sellAllActive: {
    borderColor: "rgba(0,229,204,0.35)",
  },
  sellAllDisabled: {
    borderColor: Colors.border,
  },
  sellAllPressed: {
    opacity: 0.6,
  },
  sellAllText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.accent,
  },
  sellAllTextDisabled: {
    color: "#4A5070",
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
