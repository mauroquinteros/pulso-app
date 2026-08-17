import { AssetsCard } from "@/components/home/assets-card";
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
        <WorthCard worth={view.worth} note={view.priceNote} withheldLabel={view.withheldLabel} />
        <ReturnCard return={view.return} withheldLabel={view.withheldLabel} />
        <AssetsCard
          assets={view.assets}
          onPressHolding={(ticker) => router.push(`/stock/${ticker}`)}
          withheldLabel={view.withheldLabel}
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
