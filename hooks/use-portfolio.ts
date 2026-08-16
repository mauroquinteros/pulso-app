import { useMemo } from "react";

import { useMovementsStore } from "@/stores/movements";
import { useStocksStore } from "@/stores/stocks";
import type { Portfolio } from "@/types/models";
import { assemblePortfolio } from "@/utils/portfolio/valuation";

/**
 * Single source of the derived Portfolio for the UI: the Perfil's Movements and
 * the Stocks in hand, run through the engine and recomputed whenever either
 * changes.
 *
 * The two come from separate stores filled by separate reads, and this is where
 * they meet. Neither waits on the other, so a portfolio is derived from whatever
 * is in hand at the time - with no Stocks that means holdings excluded and
 * flagged, which is the policy the engine has always applied.
 */
export function usePortfolio(): Portfolio {
  const movements = useMovementsStore((s) => s.movements);
  const stocks = useStocksStore((s) => s.stocks);
  return useMemo(() => assemblePortfolio(movements, stocks), [movements, stocks]);
}
