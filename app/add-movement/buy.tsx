import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildBuyMovement, summarizeBuy } from "@/components/add-movement/buy-view-model";
import { baseFormStyles } from "@/components/add-movement/form-styles";
import { MovementDatePicker } from "@/components/add-movement/movement-date-picker";
import { defaultMovementDeps } from "@/components/add-movement/movement-deps";
import { SaveButton } from "@/components/add-movement/save-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { saveMovement } from "@/lib/history";
import { resolveStock } from "@/lib/resolve-stock";
import { useMovementsStore } from "@/stores/movements";
import { formatShares, formatUSD } from "@/utils/format";
import { normalizeTicker, sanitizeDecimal, sanitizeSymbol } from "@/utils/input";
import { initialSymbolCheckState, shouldCheck, symbolCheckError, symbolCheckReducer } from "@/utils/symbol-check";

export default function BuyFormScreen() {
  const movementSaved = useMovementsStore((s) => s.movementSaved);
  const availableCash = usePortfolio().cash;
  // Held in state, so the id is minted once per form session rather than once
  // per tap. If the insert lands but its response does not, the second tap
  // carries the id the first one used and Postgres refuses the duplicate -
  // instead of recording the buy twice and doubling Cost Basis (ADR 0010).
  const [deps] = useState(defaultMovementDeps);
  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState("");
  const [executionPrice, setExecutionPrice] = useState("");
  const [fee, setFee] = useState("");
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [touchedTicker, setTouchedTicker] = useState(false);
  const [touchedAmount, setTouchedAmount] = useState(false);
  const [touchedPrice, setTouchedPrice] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [symbolCheck, dispatchSymbolCheck] = useReducer(symbolCheckReducer, initialSymbolCheckState);

  // Ids come from a ref rather than the state so that two checks started in the
  // same render still get different ones. The reducer uses them to drop an
  // answer that is no longer the one being waited on.
  const lastRequestId = useRef(0);

  const summary = summarizeBuy(
    { ticker, amount, executionPrice, fee, executionDate },
    availableCash,
    symbolCheck.status,
  );
  const canSave = summary.saveEnabled;
  const dateDisplay = format(parseISO(executionDate), "dd/MM/yyyy");

  const amountActive = summary.amountPositive;
  const sharesDisplay = summary.shares > 0 ? formatShares(summary.shares) : "";
  const feeValue = summary.fee;

  // Errors surface only after a field is touched-then-invalid (no typing spam).
  const showTickerError = touchedTicker && summary.tickerInvalid;
  const showAmountError =
    touchedAmount && (summary.amountInvalid || summary.amountTooSmall || summary.insufficientFunds);
  const showPriceError = touchedPrice && summary.priceInvalid;

  // Both refusals name a relationship and quote no figure: Disponible sits above this
  // field and Total a pagar below it, so the numbers are already on screen.
  const amountErrorMsg = summary.amountInvalid
    ? "Ingresa un monto mayor a $0."
    : summary.amountTooSmall
      ? "El monto es muy pequeño para ese precio."
      : "El total a pagar supera tu efectivo.";

  // The empty-field error and a failed check can never both apply, since a check
  // only ever runs on a non-empty symbol. Empty wins the slot anyway, which
  // leaves "Ingresa un símbolo." behaving exactly as it did before this slice.
  const tickerErrorMsg = showTickerError ? "Ingresa un símbolo." : symbolCheckError(symbolCheck);

  // Teal reports a fact, not effort. It used to arrive on the first keystroke,
  // which gave APPL the same encouraging border as AAPL - the colour was
  // congratulating the user for typing. It now waits for the symbol to be real.
  const tickerBorderColor = tickerErrorMsg
    ? Colors.negative
    : symbolCheck.status === "confirmed"
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const amountBorderColor = showAmountError
    ? Colors.negative
    : amountActive && !summary.insufficientFunds
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const priceBorderColor = showPriceError
    ? Colors.negative
    : summary.pricePositive
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

  const totalColor = summary.insufficientFunds ? Colors.negative : summary.total > 0 ? Colors.textPrimary : "#3E4470";

  // Leaving Símbolo confirms it against the provider while the user moves on to
  // Monto, so nobody ever waits for the round trip. `shouldCheck` decides whether
  // this blur is worth a request at all.
  const onTickerBlur = () => {
    setTouchedTicker(true);

    const symbol = normalizeTicker(ticker);
    if (!shouldCheck(symbolCheck, symbol)) return;

    const requestId = ++lastRequestId.current;
    dispatchSymbolCheck({ type: "checkStarted", ticker: symbol, requestId });
    resolveStock(symbol).then((answer) => dispatchSymbolCheck({ type: "answered", requestId, answer }));
  };

  // The save waits for Postgres. Nothing is written optimistically: the store is
  // the sole input to the engine, so a buy it never received would not be a
  // pending write but a Holding and a Cash figure that are wrong with nothing on
  // screen saying so - and this form's own funds gate trusts that figure (ADR 0010).
  const onSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveFailed(false);

    const answer = await saveMovement(buildBuyMovement({ ticker, amount, executionPrice, fee, executionDate }, deps));

    if (!answer.ok) {
      // The form stays exactly as the user left it - Símbolo, Monto, Precio,
      // Comisión and Fecha all still typed, and the símbolo still confirmed - and
      // says the save failed. There is nothing to roll back, because nothing was
      // written.
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
        <ScreenHeader title="Compra" />

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
                  onChangeText={(t) => {
                    const symbol = sanitizeSymbol(t);
                    if (symbol !== ticker) dispatchSymbolCheck({ type: "edited" });
                    setTicker(symbol);
                  }}
                  onBlur={onTickerBlur}
                />
                {/* Rendered in every state, even when it holds nothing. A slot
                    that came and went would resize the input mid-check, so the
                    spinner would announce itself by shoving the ticker sideways.
                    Same slot trick as the sign-in button's glyph. */}
                <View style={styles.symbolStatus}>
                  {symbolCheck.status === "checking" && <ActivityIndicator size="small" color={Colors.textSecondary} />}
                  {symbolCheck.status === "confirmed" && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                </View>
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
          {tickerErrorMsg && <Text style={styles.errorText}>{tickerErrorMsg}</Text>}

          {/* MONTO COMPRADO */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, styles.labelInRow]}>Monto comprado</Text>
            <Text style={styles.available}>Disponible {formatUSD(availableCash)}</Text>
          </View>
          <View style={[styles.amountBox, { borderColor: amountBorderColor }]}>
            <Text style={[styles.amountDollar, { color: amountActive ? Colors.textPrimary : "#5A6080" }]}>$</Text>
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

          {/* PRECIO + COMISIÓN */}
          <View style={styles.pairRow}>
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
          </View>
          {showPriceError && <Text style={styles.errorText}>Ingresa un precio mayor a $0.</Text>}

          {/* FEE HINT (one line) */}
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={14} color="#7BA7E8" />
            <Text style={styles.hintText}>La comisión se suma al total a pagar.</Text>
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
              <Text style={styles.breakdownLabel}>Acciones</Text>
              <Text style={styles.breakdownValue}>{sharesDisplay || "—"}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Comisión</Text>
              <Text style={styles.breakdownValue}>{feeValue > 0 ? `+${formatUSD(feeValue)}` : formatUSD(0)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={[styles.totalValue, { color: totalColor }]}>{formatUSD(summary.total)}</Text>
            </View>
          </View>
          {saveFailed && <Text style={styles.saveError}>No pudimos guardar tu compra. Inténtalo de nuevo.</Text>}
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
    marginTop: 18,
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
  symbolInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 1,
    padding: 0,
  },
  // 20pt matches the sign-in glyph and is what ActivityIndicator "small"
  // occupies, so the check mark can be smaller without the slot resizing.
  symbolStatus: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
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
  firstRow: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    marginHorizontal: 2,
  },
  hintText: {
    fontSize: 12.5,
    color: "#A9B7D0",
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
