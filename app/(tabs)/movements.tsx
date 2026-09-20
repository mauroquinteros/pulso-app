import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/movements/empty-state";
import { FilterChips } from "@/components/movements/filter-chips";
import { FilteredEmpty } from "@/components/movements/filtered-empty";
import { MovementRow, MovementSeparator } from "@/components/movements/movement-row";
import { SwipeToDelete } from "@/components/movements/swipe-to-delete";
import { buildMovementsView } from "@/components/movements/view-model";
import { DeleteFailedBanner } from "@/components/ui/delete-failed-banner";
import { Duration } from "@/constants/motion";
import { Colors } from "@/constants/theme";
import { useMovementDelete } from "@/hooks/use-movement-delete";
import { useMovementsStore } from "@/stores/movements";
import type { MovementType } from "@/types/models";

/**
 * How long after a drag a tap is still assumed to belong to it. The touch that
 * released an open row must not also count as the tap that closes it, and the
 * two arrive back to back.
 */
const AFTER_DRAG_MS = 350;

export default function MovementsScreen() {
  const movements = useMovementsStore((s) => s.movements);
  // `null` = no filter = every movement. The tab navigator keeps this screen
  // mounted, so the filter survives a tab switch with no extra code.
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  // Which row has its destructive action revealed, if any. One value for the
  // whole list is what enforces "one open at a time" - a row cannot open without
  // the previous one losing the only slot there is.
  const [openId, setOpenId] = useState<string | null>(null);
  const lastDragAt = useRef(0);

  const { deleting, deleteFailed, remove } = useMovementDelete();
  const view = buildMovementsView(movements, selectedType, deleting);

  const toggleType = (type: MovementType) => setSelectedType((current) => (current === type ? null : type));

  const closeOpenRow = () => {
    if (Date.now() - lastDragAt.current < AFTER_DRAG_MS) return;
    setOpenId(null);
  };

  // With a row open, the first tap anywhere is spent closing it. Navigating on
  // that same tap would mean a revealed delete button and a push to the detail
  // from one touch, and the user meant only one of them.
  const onRowPress = (id: string) => {
    if (openId) {
      setOpenId(null);
      return;
    }
    router.push(`/movement/${id}`);
  };

  const onDelete = (id: string) => {
    const movement = movements.find((m) => m.id === id);
    if (!movement) return;

    setOpenId(null);
    remove(movement);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* A tap that no row and no chip claimed. It is the way out of an open row
          for someone who does not want to swipe it back. */}
      <Pressable style={styles.flex} onPress={closeOpenRow}>
        <View style={styles.header}>
          <Text style={styles.title}>Movimientos</Text>
        </View>

        {/* Nothing recorded yet means nothing to filter. */}
        {view.state !== "empty" && <FilterChips chips={view.chips} onToggle={toggleType} />}

        {view.state === "empty" && <EmptyState onAddMovement={() => router.push("/add-movement")} />}

        {view.state === "filtered-empty" && (
          <FilteredEmpty message={view.filteredEmptyMessage ?? ""} onClear={() => setSelectedType(null)} />
        )}

        {view.state === "ready" && (
          // Virtualized: movements grow without bound, unlike holdings.
          <Animated.FlatList
            // The rows slide to their new places instead of the list being
            // replaced under the finger. Chosen over remounting the list on the
            // filter, which would have cost the scroll position and flashed the
            // card empty between the two sets. It is also what closes the gap a
            // deleted row leaves rather than snapping it shut.
            itemLayoutAnimation={LinearTransition.duration(Duration.base)}
            style={styles.list}
            contentContainerStyle={styles.card}
            data={view.rows}
            keyExtractor={(row) => row.id}
            renderItem={({ item, index }) => (
              <SwipeToDelete
                open={openId === item.id}
                disabled={deleting !== null}
                // Any other row that was open loses its slot the moment this one
                // is dragged, so two destructive actions are never armed at once.
                onDragStart={() => setOpenId((current) => (current === item.id ? current : null))}
                onSettled={(isOpen) => {
                  lastDragAt.current = Date.now();
                  setOpenId(isOpen ? item.id : null);
                }}
                onDelete={() => onDelete(item.id)}
              >
                {/* The separator rides inside the sliding half rather than
                    between items, so it travels with the row it divides and the
                    panel behind it stays uncrossed. */}
                {index > 0 && <MovementSeparator />}
                <MovementRow row={item} deleting={item.deleting} onPress={() => onRowPress(item.id)} />
              </SwipeToDelete>
            )}
            // Scrolling is a decision to look elsewhere, and an armed delete
            // button should not survive it.
            onScrollBeginDrag={() => setOpenId(null)}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Pressable>

      {/* Clear of the title and of the chips, floating over the top of the list:
          a failed delete must not cover the filter that is still usable. */}
      {deleteFailed && <DeleteFailedBanner top={118} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
    paddingVertical: 4,
    // The rows are padded themselves now, so that a revealed delete panel can
    // reach the card's edge - and this is what makes the radius cut the corner
    // off the panel on the first and the last row.
    overflow: "hidden",
  },
});
