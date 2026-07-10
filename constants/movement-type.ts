import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import type { MovementType } from "@/types/models";

export interface MovementTypeMeta {
  label: string; // "Compra" — row titles, form headers
  labelPlural: string; // "Compras" — filter chips
  icon: keyof typeof Ionicons.glyphMap;
  bg: string; // badge background (saturated hue, low alpha)
  color: string; // badge icon/text (pastel)
}

/**
 * Single source of truth for a movement type's identity: its Spanish copy and
 * its visual tokens. Consumed by the add-movement picker and the movements
 * list, so the icon you pick is the icon you later see in your history.
 *
 * Rule: the icon identifies the TYPE, it never hints at a cash direction. Buys
 * and deposits move cash in opposite directions, so they must not share an
 * arrow — in a dense list an arrow reads as direction and would lie. Direction
 * is communicated by the type itself (see docs and the movements UX spec).
 */
export const MOVEMENT_TYPE_META: Record<MovementType, MovementTypeMeta> = {
  buy: {
    label: "Compra",
    labelPlural: "Compras",
    icon: "cart-outline",
    bg: "rgba(120,160,255,0.16)",
    color: "#9DB8FF",
  },
  sell: {
    label: "Venta",
    labelPlural: "Ventas",
    icon: "pricetag-outline",
    bg: "rgba(255,140,140,0.14)",
    color: "#FF9D9D",
  },
  dividend: {
    label: "Dividendo",
    labelPlural: "Dividendos",
    icon: "cash-outline",
    bg: "rgba(0,229,204,0.12)",
    color: "#4FE9D6",
  },
  deposit: {
    label: "Depósito",
    labelPlural: "Depósitos",
    icon: "add-circle-outline",
    // Background derived from `positive`'s rgb, per the palette's convention
    // (saturated background, pastel foreground). Depósito no longer shares
    // Dividendo's teal.
    bg: "rgba(0,200,83,0.16)",
    color: Colors.depositGreen,
  },
  withdrawal: {
    label: "Retiro",
    labelPlural: "Retiros",
    icon: "remove-circle-outline",
    bg: "rgba(142,142,147,0.14)",
    color: "#B8BCCB",
  },
};

/** The app's one taxonomy: operations first, cash movements second. Mirrors the
 * add-movement picker's OPERACIONES → EFECTIVO grouping. */
export const MOVEMENT_TYPE_ORDER: MovementType[] = [
  "buy",
  "sell",
  "dividend",
  "deposit",
  "withdrawal",
];
