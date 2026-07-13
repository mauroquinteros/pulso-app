import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
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

import {
  buildSellMovement,
  summarizeSell,
} from "@/components/add-movement/sell-view-model";
import { baseFormStyles } from "@/components/add-movement/form-styles";
import { MovementDatePicker } from "@/components/add-movement/movement-date-picker";
import { defaultMovementDeps } from "@/components/add-movement/movement-deps";
import { SaveButton } from "@/components/add-movement/save-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useMovementsStore } from "@/stores/movements";
import { formatShares, formatUSD } from "@/utils/format";
import { sanitizeDecimal } from "@/utils/input";

export default function SellFormScreen() {
  const addMovement = useMovementsStore((s) => s.addMovement);
  const holdings = usePortfolio().holdings;
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [executionPrice, setExecutionPrice] = useState("");
  const [fee, setFee] = useState("");
  const [regulatoryFees, setRegulatoryFees] = useState("");
  const [executionDate, setExecutionDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [touchedTicker, setTouchedTicker] = useState(false);
  const [touchedShares, setTouchedShares] = useState(false);
  const [touchedPrice, setTouchedPrice] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const availableShares =
    holdings.find((h) => h.ticker === ticker)?.shares ?? 0;

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
  const showSharesError =
    touchedShares && (summary.sharesInvalid || summary.insufficientShares);
  const showPriceError = touchedPrice && summary.priceInvalid;

  const sharesErrorMsg = summary.sharesInvalid
    ? "Ingresa una cantidad mayor a 0."
    : availableShares === 0
      ? `No tienes acciones de ${ticker}.`
      : `Solo tienes ${formatShares(availableShares)} acciones.`;

  const showDisponible =
    ticker !== "" &&
    availableShares > 0 &&
    !(touchedShares && summary.insufficientShares);

  const tickerBorderColor = showTickerError
    ? Colors.negative
    : ticker !== ""
      ? "rgba(0,229,204,0.5)"
      : Colors.border;

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

  const totalColor = summary.insufficientShares
    ? Colors.negative
    : summary.total > 0
      ? Colors.textPrimary
      : "#3E4470";

  const onSave = () => {
    if (!canSave) return;
    const movement = buildSellMovement(
      { ticker, shares, executionPrice, fee, regulatoryFees, executionDate },
      defaultMovementDeps(),
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

          {/* ACCIONES + PRECIO */}
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>Acciones</Text>
              <View
                style={[styles.smallBox, { borderColor: sharesBorderColor }]}
              >
                <TextInput
                  style={styles.smallInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#3E4470"
                  value={shares}
                  onChangeText={(t) => setShares(sanitizeDecimal(t))}
                  onBlur={() => setTouchedShares(true)}
                />
              </View>
              {showDisponible && (
                <Text style={styles.helperText}>
                  Disponible {formatShares(availableShares)}
                </Text>
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Precio de ejecución</Text>
              <View
                style={[styles.smallBox, { borderColor: priceBorderColor }]}
              >
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
          {showSharesError && (
            <Text style={styles.errorText}>{sharesErrorMsg}</Text>
          )}
          {showPriceError && !showSharesError && (
            <Text style={styles.errorText}>Ingresa un precio mayor a $0.</Text>
          )}

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
              <Text style={styles.breakdownValue}>
                {formatUSD(summary.gross)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Comisión</Text>
              <Text style={styles.breakdownValue}>
                {feeValue > 0 ? `-${formatUSD(feeValue)}` : formatUSD(0)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Impuestos</Text>
              <Text style={styles.breakdownValue}>
                {regValue > 0 ? `-${formatUSD(regValue)}` : formatUSD(0)}
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
          <SaveButton canSave={canSave} onPress={onSave} />
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
});
