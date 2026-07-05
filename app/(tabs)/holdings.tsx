import { AssetsCard } from "@/components/portfolio/assets-card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { buildPortfolioView } from "@/components/portfolio/view-model";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HoldingsScreen() {
  const view = buildPortfolioView(usePortfolio());

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Portafolio</Text>
        </View>

        {view.state === "empty" ? (
          <EmptyState onAddMovement={() => router.push("/add-movement")} />
        ) : (
          view.holdings.length > 0 && (
            <AssetsCard
              holdings={view.holdings}
              onPressHolding={(ticker) => router.push(`/stock/${ticker}`)}
            />
          )
        )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
});
