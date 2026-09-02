import { AssetsCard } from "@/components/holdings/assets-card";
import { HomeHeader } from "@/components/home/home-header";
import { RefreshFailedBanner } from "@/components/home/refresh-failed-banner";
import { ReturnCard } from "@/components/home/return-card";
import { buildHomeView, showsRefreshFailed } from "@/components/home/view-model";
import { WorthCard } from "@/components/home/worth-card";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useStocksStore } from "@/stores/stocks";
import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const portfolio = usePortfolio();
  const status = useStocksStore((s) => s.status);
  const quotedCount = useStocksStore((s) => Object.keys(s.stocks).length);

  // The status goes in because a withheld figure means two different things
  // before and after a read has answered, and only this knows which (ADR 0011).
  const view = buildHomeView(portfolio, status);

  // No memory of the previous render is needed: only an answer moves `status`,
  // so a refresh in flight cannot blank the banner for the length of its select.
  const refreshFailed = showsRefreshFailed({ status, quotedCount, holdingCount: portfolio.holdings.length });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader />
        {refreshFailed && <RefreshFailedBanner />}
        {/* Each card carries its own `layout`, which is what lets the banner
            mount without any of them jumping the 46pt. A wrapper around all
            three did the same job but also fired whenever a card INSIDE it
            expanded - a layout animation on the parent, nested in the ones its
            children were already running, and on a different duration. */}
        <WorthCard worth={view.worth} note={view.priceNote} withheldLabel={view.withheldLabel} />
        <ReturnCard return={view.return} withheldLabel={view.withheldLabel} />
        {/* The label is deliberately the breakdown row's vocabulary, not this
            card's: the same figure prints as "No realizado" one card above, and
            sharing the noun is what makes the two read as one object. It is
            spelled out in full here because, unlike the breakdown, this card has
            no "Rendimiento total" title above it.

            No percentage on purpose. Net P&L's base is Cost Basis while
            Rendimiento total's is Peak Contributions, so printing both invited a
            part-bigger-than-whole reading with nothing on screen to resolve it.
            The rows keep their percentage, which is self-contained. */}
        <AssetsCard
          holdings={view.assets.holdings}
          onPressHolding={(ticker) => router.push(`/stock/${ticker}`)}
          stat={{
            label: "Rendimiento no realizado",
            value: view.assets.netPnl ?? view.withheldLabel,
            tone: view.assets.netPnl === null ? null : view.assets.netPnlTone,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 36,
  },
});
