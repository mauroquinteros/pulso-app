import { AssetsCard } from "@/components/home/assets-card";
import { HomeHeader } from "@/components/home/home-header";
import { ReturnCard } from "@/components/home/return-card";
import { buildHomeView } from "@/components/home/view-model";
import { WorthCard } from "@/components/home/worth-card";
import { Colors } from "@/constants/theme";
import { usePortfolio } from "@/hooks/use-portfolio";
import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const view = buildHomeView(usePortfolio());

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <WorthCard worth={view.worth} />
        <ReturnCard return={view.return} />
        <AssetsCard
          assets={view.assets}
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
