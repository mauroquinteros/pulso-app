import { useMemo } from "react";

import { MOCK_PRICES } from "@/lib/mock-data";
import { useMovementsStore } from "@/stores/movements";
import type { Portfolio } from "@/types/models";
import { assemblePortfolio } from "@/utils/portfolio/valuation";

/**
 * Single source of the derived Portfolio for the UI. Derives from the raw
 * movements in the store (recomputed whenever they change), keeping prices on
 * the mock map for now. This stays the single swap-point for a Supabase-backed
 * source later without touching any screen.
 */
export function usePortfolio(): Portfolio {
  const movements = useMovementsStore((s) => s.movements);
  return useMemo(() => assemblePortfolio(movements, MOCK_PRICES), [movements]);
}
