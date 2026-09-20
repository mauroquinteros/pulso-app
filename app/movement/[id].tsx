import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeleteMovementButton, DetailIdentity, NotFound, Receipt } from "@/components/movement-detail/receipt";
import { buildMovementDetailView } from "@/components/movement-detail/view-model";
import { DeleteFailedBanner } from "@/components/ui/delete-failed-banner";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Colors } from "@/constants/theme";
import { useMovementDelete } from "@/hooks/use-movement-delete";
import { useMovementsStore } from "@/stores/movements";

export default function MovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movement = useMovementsStore((s) => s.movements.find((m) => m.id === id));
  const view = buildMovementDetailView(movement);

  // Back, never a route: this screen is reachable from the Movimientos tab and
  // from a stock's own history, and sending everyone to Movimientos would throw
  // whoever arrived from a stock out of the screen they were reading.
  //
  // It runs before the Movement leaves the store, which is the whole reason the
  // hook takes it as a callback - the other order re-renders this screen without
  // its Movement and flashes "No encontramos este movimiento" at someone who
  // just deleted it on purpose.
  const { deleting, deleteFailed, remove } = useMovementDelete(() => router.back());

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Detalle" />

      {view.state === "not-found" || !view.header || !view.total || !movement ? (
        <NotFound />
      ) : (
        <View style={styles.body}>
          {/* The receipt dims while the delete is in flight; the total stays
              anchored to the bottom of this block and the control hangs below. */}
          <View style={[styles.receipt, deleting !== null && styles.busy]}>
            <DetailIdentity header={view.header} />
            <Receipt facts={view.facts} money={view.money} total={view.total} />
          </View>
          <DeleteMovementButton deleting={deleting !== null} onPress={() => remove(movement)} />
        </View>
      )}

      {/* Below the header, never over it: the one control this screen must not
          cover while a delete has failed is the way out of it. */}
      {deleteFailed && <DeleteFailedBanner top={56} />}
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
  receipt: {
    flex: 1,
  },
  busy: {
    opacity: 0.55,
  },
});
