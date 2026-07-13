import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DetailIdentity,
  NotFound,
  Receipt,
} from "@/components/movement-detail/receipt";
import { buildMovementDetailView } from "@/components/movement-detail/view-model";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { useMovementsStore } from "@/stores/movements";

export default function MovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movement = useMovementsStore((s) => s.movements.find((m) => m.id === id));
  const view = buildMovementDetailView(movement);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Detalle" />

      {view.state === "not-found" || !view.header || !view.total ? (
        <NotFound />
      ) : (
        <View style={styles.body}>
          <DetailIdentity header={view.header} />
          <Receipt facts={view.facts} money={view.money} total={view.total} />
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
});
