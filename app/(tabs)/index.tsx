import { AssetsCard } from "@/components/home/assets-card";
import { HomeHeader } from "@/components/home/home-header";
import { ReturnCard } from "@/components/home/return-card";
import { WorthCard } from "@/components/home/worth-card";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const portfolio = usePortfolio();
  const netPnlPercent =
    portfolio.costBasis !== 0
      ? (portfolio.totalReturn.unrealizedPnl / portfolio.costBasis) * 100
      : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <WorthCard
          totalPortfolioValue={portfolio.totalPortfolioValue}
          marketValue={portfolio.marketValue}
          cash={portfolio.cash}
        />
        <ReturnCard
          totalReturn={portfolio.totalReturn}
          netContributedCapital={portfolio.netContributedCapital}
          totalPortfolioValue={portfolio.totalPortfolioValue}
        />
        <AssetsCard
          holdings={portfolio.holdings}
          netPnl={portfolio.totalReturn.unrealizedPnl}
          netPnlPercent={netPnlPercent}
          onPressHolding={(ticker) => router.push(`/stock/${ticker}`)}
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
