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
  const view = buildHomeView(portfolio);
  const status = useStocksStore((s) => s.status);
  const quotedCount = useStocksStore((s) => Object.keys(s.stocks).length);

  // No memory of the previous render is needed: `status` is how the last read
  // *landed*, and a refresh in flight moves `reading` instead - so a re-read
  // cannot blank the banner for the length of its select.
  const refreshFailed = showsRefreshFailed({ status, quotedCount, holdingCount: portfolio.holdings.length });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader />
        {refreshFailed && <RefreshFailedBanner />}
        <WorthCard worth={view.worth} />
        <ReturnCard return={view.return} />
        <AssetsCard assets={view.assets} onPressHolding={(ticker) => router.push(`/stock/${ticker}`)} />
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
