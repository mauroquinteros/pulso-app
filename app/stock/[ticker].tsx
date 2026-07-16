import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  NotFound,
  PositionCard,
  StockIdentity,
} from "@/components/stock-detail/position";
import { buildStockDetailView } from "@/components/stock-detail/view-model";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { MOCK_PRICES } from "@/lib/mock-data";
import { useMovementsStore } from "@/stores/movements";
import { usePortfolio } from "@/hooks/use-portfolio";

/** Read-only detail of one open position: how the position stands today, plus
 * the ticker's movement history. Pure consumer — everything is derived by the
 * view-model from the portfolio, the price map, and the movements. */
export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { holdings } = usePortfolio();
  const movements = useMovementsStore((s) => s.movements);
  const view = buildStockDetailView(
    ticker,
    holdings,
    MOCK_PRICES[ticker],
    movements,
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={view.ticker} />

      {view.state === "not-found" || !view.position ? (
        <NotFound />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <StockIdentity
            ticker={view.ticker}
            badge={view.badge}
            price={view.price}
          />
          <PositionCard position={view.position} />
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
});
