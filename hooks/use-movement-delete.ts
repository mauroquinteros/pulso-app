import { useState } from "react";
import { Alert } from "react-native";

import { movementConfirmLine } from "@/components/movements/view-model";
import { deleteMovement } from "@/lib/history";
import { useMovementsStore } from "@/stores/movements";
import type { Movement } from "@/types/models";

/**
 * The whole delete cycle - confirm, delete, apply or fail - for the two places
 * that can start one: a Movement's detail and the row in the history.
 *
 * Shared because there are two call sites, not because it is testable in
 * isolation: it is a hook precisely because nothing here is going to be tested
 * without a renderer. The argument for keeping it in one piece is the save
 * block's, which began as two copies and is five today.
 *
 * Nothing is optimistic. The Movement stays in the store until the database says
 * it is gone (ADR 0010) - so a delete Postgres never performed leaves a History
 * that still holds it, which is the honest answer, rather than a row that
 * vanished from a screen and nowhere else.
 *
 * `onDeleted` runs *before* the removal is applied, which matters on the detail:
 * that screen has to leave first, or it re-renders without its Movement and says
 * "No encontramos este movimiento" for an instant - an error sentence about
 * something the user just deleted on purpose.
 */
export function useMovementDelete(onDeleted?: () => void) {
  const applyDeleted = useMovementsStore((s) => s.movementDeleted);
  /** The id in flight, or `null`. An id rather than a flag, because the history
   * has many rows and exactly one of them is the one being deleted. */
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const confirmed = async (movement: Movement) => {
    setDeleting(movement.id);

    const answer = await deleteMovement(movement);

    if (!answer.ok) {
      // The Movement is still there, untouched, and there is nothing to roll
      // back because nothing was removed. The banner says so and the same
      // control asks again.
      setDeleting(null);
      setDeleteFailed(true);
      return;
    }

    onDeleted?.();
    applyDeleted(movement.id);
    setDeleting(null);
  };

  const remove = (movement: Movement) => {
    if (deleting) return;

    // Asking again is what clears a previous failure, so cancelling out of the
    // alert leaves no banner standing over a screen nothing is wrong with.
    setDeleteFailed(false);

    Alert.alert("¿Eliminar este movimiento?", movementConfirmLine(movement), [
      { text: "Cancelar", style: "cancel" },
      // No "Deshacer" anywhere after this: the delete is hard in the database
      // (ADR 0007), so this alert is the only chance to change your mind.
      { text: "Eliminar", style: "destructive", onPress: () => confirmed(movement) },
    ]);
  };

  return { deleting, deleteFailed, remove };
}
