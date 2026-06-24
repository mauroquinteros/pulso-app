import { MOCK_PORTFOLIO_SUMMARY } from "@/lib/mock-data";
import type { Portfolio } from "@/types/models";

/**
 * Single source of the derived Portfolio for the UI. Returns the mock portfolio
 * today; swap this for a store/Supabase-backed selector later without touching
 * any screen.
 */
export function usePortfolio(): Portfolio {
  return MOCK_PORTFOLIO_SUMMARY;
}
