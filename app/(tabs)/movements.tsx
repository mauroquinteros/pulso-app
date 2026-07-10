import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/movements/empty-state";
import {
  MovementRow,
  MovementSeparator,
} from "@/components/movements/movement-row";
import { buildMovementsView } from "@/components/movements/view-model";
import { Colors } from "@/constants/theme";
import { useMovementsStore } from "@/stores/movements";

export default function MovementsScreen() {
  const movements = useMovementsStore((s) => s.movements);
  const view = buildMovementsView(movements, null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos</Text>
      </View>

      {view.state === "empty" ? (
        <EmptyState onAddMovement={() => router.push("/add-movement")} />
      ) : (
        // Virtualized: movements grow without bound, unlike holdings.
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.card}
          data={view.rows}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => <MovementRow row={item} />}
          ItemSeparatorComponent={MovementSeparator}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
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
  list: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 24, // keeps the card clear of the tab bar
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
});
