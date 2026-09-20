import { MOVEMENT_TYPE_META, MOVEMENT_TYPE_ORDER } from "@/constants/movement-type";
import type { Movement, MovementType } from "@/types/models";
import { formatDate, formatUSD } from "@/utils/format";
import { cashImpact } from "@/utils/portfolio/cash";

export interface MovementChip {
  type: MovementType;
  label: string; // plural: "Compras"
  selected: boolean;
}

export interface MovementRow {
  id: string;
  title: string; // "Compra AAPL" | "Depósito"
  dateLabel: string; // "15 ene 2025"
  amount: string; // "$447.86" — magnitude, never signed
  type: MovementType; // the component resolves icon/colors from the type
  /** What VoiceOver reads for the whole row. */
  a11yLabel: string;
}

export interface MovementsView {
  /** `empty` = no movements at all (CTA screen). `filtered-empty` = there are
   * movements, none of the selected type. Conflating the two is the classic
   * mistake: offering "add your first movement" to someone who has thirteen. */
  state: "empty" | "filtered-empty" | "ready";
  chips: MovementChip[]; // [] when state is "empty" — nothing to filter
  filteredEmptyMessage: string | null; // "No tienes retiros"
  rows: MovementRow[];
}

/** Newest first: `executionDate` desc, `createdAt` desc to break same-day ties.
 * The engine's chronological order, reversed — a backdated movement lands where
 * it happened, not at the top. Exported so the stock detail lists its ticker's
 * history in the same order as this tab. */
export const byChronologicalDesc = (a: Movement, b: Movement): number => {
  if (a.executionDate !== b.executionDate) {
    return a.executionDate < b.executionDate ? 1 : -1;
  }
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
};

/** "Compra AAPL" for the types that carry a ticker; "Depósito" for the cash
 * ones, so no phantom ticker is implied where none exists. */
const titleOf = (movement: Movement): string => {
  const { label } = MOVEMENT_TYPE_META[movement.type];
  return "ticker" in movement ? `${label} ${movement.ticker}` : label;
};

/** The row's three stacked fields, read as one sentence, plus whatever the
 * screen adds after them. Shared because both view-models that build a
 * `MovementRow` would otherwise carry their own copy, and a drifted
 * accessibility label is invisible until someone turns VoiceOver on. */
export const movementA11yLabel = (
  parts: { title: string; dateLabel: string; amount: string },
  mark?: string | null,
): string => [parts.title, parts.dateLabel, parts.amount, mark].filter(Boolean).join(", ");

/**
 * What the destructive alert names, so the user can see which Movement they are
 * about to delete for good: "Compra AAPL - 15 ene 2025 - $447.86".
 *
 * The same three fields as the row, joined by ASCII hyphens rather than commas,
 * and shared for the same reason: both places that can delete a Movement open
 * this alert, and two copies of a sentence naming what is about to be destroyed
 * is two chances for them to name it differently.
 */
export const movementConfirmLine = (movement: Movement): string =>
  [titleOf(movement), formatDate(movement.executionDate), formatUSD(Math.abs(cashImpact(movement)))].join(" - ");

/**
 * Pure view-model for the Movements screen: turns the raw Movement list into a
 * display-ready view — ordered, filtered, formatted, with every degenerate
 * state as declarative data. The components render this verbatim and hold no
 * derivation or formatting.
 *
 * Each row's amount is the magnitude of the movement's Cash Impact — the same
 * function the engine sums to get Cash, so the list can never drift from the
 * balance it explains. It carries no sign and no colour: the sign is fully
 * derivable from the type, and green/red in Pulso mean gain/loss — a buy is
 * neither.
 */
export function buildMovementsView(movements: Movement[], selectedType: MovementType | null): MovementsView {
  if (movements.length === 0) {
    return { state: "empty", chips: [], filteredEmptyMessage: null, rows: [] };
  }

  const chips: MovementChip[] = MOVEMENT_TYPE_ORDER.map((type) => ({
    type,
    label: MOVEMENT_TYPE_META[type].labelPlural,
    selected: selectedType === type,
  }));

  const ordered = [...movements].sort(byChronologicalDesc);
  const filtered = selectedType ? ordered.filter((m) => m.type === selectedType) : ordered;

  if (selectedType && filtered.length === 0) {
    const { labelPlural } = MOVEMENT_TYPE_META[selectedType];
    return {
      state: "filtered-empty",
      chips,
      filteredEmptyMessage: `No tienes ${labelPlural.toLowerCase()}`,
      rows: [],
    };
  }

  return {
    state: "ready",
    chips,
    filteredEmptyMessage: null,
    rows: filtered.map((movement) => {
      const row = {
        id: movement.id,
        title: titleOf(movement),
        dateLabel: formatDate(movement.executionDate),
        amount: formatUSD(Math.abs(cashImpact(movement))),
        type: movement.type,
      };
      return { ...row, a11yLabel: movementA11yLabel(row) };
    }),
  };
}
