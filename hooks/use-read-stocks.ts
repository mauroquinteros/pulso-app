import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { readStocks } from "@/lib/stocks";
import { useStocksStore } from "@/stores/stocks";

/**
 * Reads the Stocks when the tabs mount, and again whenever the app comes back
 * from the background.
 *
 * Mount is the one event that covers a cold start and a fresh sign-in
 * identically: `Stack.Protected` takes `(tabs)` out of the tree when the session
 * guard falls and mounts it again when the next Perfil signs in, so every
 * session asks for Quotes of its own. Tab switches do not fire it - the tabs
 * layout stays mounted across them - and neither does pushing a movement or a
 * stock detail.
 *
 * This is deliberately unlike `RequireHistory`, which triggers on
 * `status === "unread"`, never on mount and expressly never on returning from
 * the background: a History is re-read only when it is genuinely gone, because
 * Movements do not change behind the user's back. A Quote is the opposite - the
 * cron rewrites it every ten minutes through the trading day, so a Quote from
 * the previous session may be ten minutes or ten hours old, and every return is
 * a reason to ask again (ADR 0011).
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

  /**
   * Whether the app has actually been away since the last time this fired. It is
   * set on `background` rather than inferred from the state seen just before
   * `active`, because iOS passes through `inactive` on the way back up: the
   * previous event is `inactive` whether the app spent the night in the
   * background or the user pulled down Control Centre for a second, so it cannot
   * tell the two apart. What the app was doing before that can.
   */
  const wasBackgrounded = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        wasBackgrounded.current = true;
        return;
      }

      // A true background return only. Keying on `active` alone would re-read
      // for every notification banner, Control Centre pull or declined call,
      // which on iOS raise `inactive` and then `active` again - a select seconds
      // after the last one, for a value the cron cannot have rewritten in that
      // time. It gets worse rather than cheaper later: once a failed refresh
      // raises a banner of its own (ADR 0011), a shade pulled down over a bad
      // connection would put one on screen for a user who did nothing.
      if (state !== "active" || !wasBackgrounded.current) return;

      wasBackgrounded.current = false;

      // Fired without asking whether a read is already in flight. Guarding on
      // `status === "reading"` would save a duplicate select in a window
      // milliseconds wide - the user would have to background the app mid-read -
      // and would cost the one case that matters: a read that hangs rather than
      // fails leaves the status at `reading` indefinitely, and that is precisely
      // when a returning user needs a fresh attempt. Overlap is safe here by
      // design, since the store keeps no readId guard: the worst race is a
      // slightly staler map winning, which costs nothing (ADR 0011).
      startRead();
      readStocks().then(answerRead);
    });

    // Removed when the tabs unmount, which is what signing out does - otherwise
    // every session would leave a listener behind, still reading Stocks for a
    // Perfil who has gone.
    return () => subscription.remove();
  }, [startRead, answerRead]);
}
