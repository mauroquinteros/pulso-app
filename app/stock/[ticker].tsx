import { router, useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MovementRow, MovementSeparator } from "@/components/movements/movement-row";
import { NotFound, PositionCard, StockIdentity } from "@/components/stock-detail/position";
import { buildStockDetailView } from "@/components/stock-detail/view-model";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { useMovementsStore } from "@/stores/movements";
import { useStocksStore } from "@/stores/stocks";
import { usePortfolio } from "@/hooks/use-portfolio";

/** Read-only detail of one open position: how the position stands today, plus
 * the ticker's movement history. Pure consumer — everything is derived by the
 * view-model from the portfolio, the Stock's Quote, and the movements. */
export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { holdings } = usePortfolio();
  const movements = useMovementsStore((s) => s.movements);
  // Nothing is read on the way in: pushing this screen fires no request, so the
  // Quote is whichever one the tabs already hold (ADR 0011). A ticker absent
  // from the store has no price, and the view-model collapses to "Sin precio".
  const stock = useStocksStore((s) => s.stocks[ticker]);
  const view = buildStockDetailView(ticker, holdings, stock?.quote.price, movements);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={view.ticker} />

      {view.state === "not-found" || !view.position ? (
        <NotFound />
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <StockIdentity ticker={view.ticker} price={view.price} />
          <PositionCard position={view.position} />

          {/* The full history — no "View All": there is no per-ticker
              destination elsewhere, and a per-stock history is short. */}
          {view.rows.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Movimientos</Text>
              <View style={styles.movementsCard}>
                {view.rows.map((row, i) => (
                  <Fragment key={row.id}>
                    {i > 0 && <MovementSeparator />}
                    <MovementRow
                      row={row}
                      buyTone={row.buyTone}
                      price={row.price}
                      onPress={() => router.push(`/movement/${row.id}`)}
                    />
                  </Fragment>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingHorizontal: 4,
    paddingTop: 24,
    paddingBottom: 10,
  },
  movementsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 18,
  },
});
