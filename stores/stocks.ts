import { create } from "zustand";

import type { StocksAnswer } from "@/lib/stocks";
import type { Stock } from "@/types/models";

/**
 * The Stocks the app has read, keyed by ticker, and the status of the read that
 * fetched them. Named for what it holds, exactly like `stores/movements.ts`.
 *
 * The status lives beside the map because a ticker's absence means nothing on
 * its own: a Quote not yet read, a Quote that could not be obtained and a Stock
 * the provider has no Quote for are three different sentences (CONTEXT.md,
 * ADR 0011), and only the status tells the first two from each other and from
 * the third. It is deliberately not inside the derivation engine - that stays a
 * pure function over facts and never learns a read exists.
 *
 * The lifecycle lives in this store rather than in a separate pure reducer like
 * the History's. That reducer exists for an all-or-nothing rule that must not be
 * half-applied and for a race that could show one Perfil's Movements to another;
 * neither applies to a Stock, which is shared and owned by nobody. The worst
 * race here is a slightly staler map winning, which costs nothing.
 */

/**
 * How the last read that finished came out. There is deliberately no `reading`
 * member and no in-flight state anywhere in this store: nothing on screen waits
 * on a price - the Stocks gate nothing, so a select being in progress is not a
 * fact any component needs - and holding one cost more than it looked.
 *
 * It cost the fact beside it. An earlier version set `status` to `reading` when
 * a select began, which overwrote `failed` on every refresh: the banner saying
 * the prices could not be updated (ADR 0011) blanked for as long as the next
 * select took, announcing a fault, silently unannouncing it, then announcing it
 * again. Only an answer moves this now, so nothing can unsay a failure before
 * another one lands - the guarantee holds by construction rather than by test.
 */
export type StocksStatus =
  | "unread" // nobody has tried to read them yet
  | "ready" // whatever the database could price is in hand
  | "failed"; // a fault; whatever was already in hand stays

interface StocksData {
  status: StocksStatus;
  /** Keyed by ticker. A ticker absent from it has no Quote, for one of the three causes. */
  stocks: Record<string, Stock>;
}

interface StocksState extends StocksData {
  answerRead: (answer: StocksAnswer) => void;
  /**
   * Throws the Stocks away and returns to `unread`. A Perfil signing out, and
   * nothing else - the read fires on mount, so no retry needs this.
   */
  forgetStocks: () => void;
}

export const initialStocksState: StocksData = { status: "unread", stocks: {} };

export const useStocksStore = create<StocksState>((set) => ({
  ...initialStocksState,

  // The only thing that moves either field. A failed read keeps the Stocks, and
  // that is the whole of "a failed refresh is not an absence": the app holds
  // Quotes and could not find out whether newer ones exist. Hiding them would
  // report a fault as an absence. Saying nothing would present them as current,
  // which is why the status says `failed` and the screens do the talking.
  //
  // Note the Stocks survive a *starting* read too, unlike the History, which is
  // emptied the moment one begins - a History is one thing and a partial one is
  // wrong, so it is thrown away before it is re-read, while a map of Quotes is
  // simply a map of Quotes. Here that costs no code at all: nothing runs when a
  // read starts.
  answerRead: (answer) => set(answer.ok ? { status: "ready", stocks: answer.stocks } : { status: "failed" }),

  forgetStocks: () => set(initialStocksState),
}));
