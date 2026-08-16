import { useEffect } from "react";

import { readStocks } from "@/lib/stocks";
import { useStocksStore } from "@/stores/stocks";

/**
 * Reads the Stocks when the tabs mount.
 *
 * Mount is the one event that covers a cold start and a fresh sign-in
 * identically: `Stack.Protected` takes `(tabs)` out of the tree when the session
 * guard falls and mounts it again when the next Perfil signs in, so every
 * session asks for Quotes of its own. Tab switches do not fire it - the tabs
 * layout stays mounted across them - and neither does pushing a movement or a
 * stock detail.
 *
 * This is deliberately unlike `RequireHistory`, which triggers on
 * `status === "unread"` and never on mount: a History is re-read only when it is
 * genuinely gone, whereas a Quote from the previous session may be ten minutes
 * or ten hours old (ADR 0011).
 *
 * A hook rather than a wrapper component, because it gates nothing and renders
 * nothing. A Perfil with no Quote for anything still sees their Movements, their
 * Efectivo and their History - a Stock is shared and sits outside the
 * all-or-nothing rule, so a missing one costs a Market Value, not a wrong one.
 * Wrapped in a component it would read as a gate that forgot to gate.
 *
 * It waits on nothing, so this read and the History's go out together.
 */
export function useReadStocks() {
  const startRead = useStocksStore((s) => s.startRead);
  const answerRead = useStocksStore((s) => s.answerRead);

  useEffect(() => {
    startRead();
    readStocks().then(answerRead);
    // Mount only. The two actions are the store's own and never change
    // identity, so listing them here does not make this fire again.
  }, [startRead, answerRead]);
}
