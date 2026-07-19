import { StyleSheet, Text, View } from "react-native";

import { Colors, HoldingBadge } from "@/constants/theme";
import type { StockDetailView, StockReturnBlock, Tone } from "./view-model";

/** Badge + current-price hero. The badge carries the same single tint as every
 * holding row, so the list and its detail read as the same thing. Without a
 * price the hero degrades to a small "Sin precio": quietly dropping it would
 * read as a bug, a minimal marker reads as "we don't have it". */
export function StockIdentity({
  ticker,
  price,
}: {
  ticker: string;
  price: string | null;
}) {
  return (
    <View style={styles.identity}>
      <View style={[styles.badge, { backgroundColor: HoldingBadge.bg }]}>
        <Text style={[styles.badgeText, { color: HoldingBadge.color }]}>
          {ticker}
        </Text>
      </View>
      <View style={styles.identityText}>
        <Text style={styles.heroLabel}>Precio actual</Text>
        {price !== null ? (
          <Text style={styles.heroPrice}>{price}</Text>
        ) : (
          <Text style={styles.heroNoPrice}>Sin precio</Text>
        )}
      </View>
    </View>
  );
}

/** One labelled figure of the position grid. */
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

const toneColor = (tone: Tone) =>
  tone === "negative" ? Colors.negative : Colors.positive;

/** One lifetime-return component row: Dividendos / Realizado / Comisiones.
 * Untoned rows are magnitudes whose direction lives in the label. */
function ComponentRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <View style={styles.componentRow}>
      <Text style={styles.componentLabel}>{label}</Text>
      <Text
        style={[
          styles.componentValue,
          tone !== undefined && { color: toneColor(tone) },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** Net P&L, its three lifetime siblings, and their sum — the Total Return of
 * a stock. The total never carries a % (glossary: there is no honest
 * denominator); the only % is Net P&L's. Realizado only appears once the user
 * has actually sold. */
function ReturnBlock({ block }: { block: StockReturnBlock }) {
  const pnlColor = toneColor(block.netPnlTone);
  return (
    <>
      <View style={styles.divider} />
      <View style={styles.pnlRow}>
        <Text style={styles.pnlLabel}>P&L no realizada</Text>
        <View style={styles.pnlFigures}>
          <Text style={[styles.pnlValue, { color: pnlColor }]}>
            {block.netPnl}
          </Text>
          <Text style={[styles.pnlPercent, { color: pnlColor }]}>
            {block.netPnlPercent}
          </Text>
        </View>
      </View>

      <View style={styles.components}>
        <ComponentRow label="Dividendos" value={block.dividends} />
        {block.realized !== null && (
          <ComponentRow
            label="Realizado"
            value={block.realized}
            tone={block.realizedTone}
          />
        )}
        <ComponentRow label="Comisiones" value={block.fees} />
      </View>

      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Retorno total</Text>
        <Text style={[styles.totalValue, { color: toneColor(block.totalTone) }]}>
          {block.total}
        </Text>
      </View>
    </>
  );
}

/**
 * The "Tu posición" card: the 2×2 grid of today's figures plus the lifetime
 * return block, concluded by the Retorno total. Green/red only on figures that
 * mean gain/loss (Net P&L, Realizado, Retorno total); everything else is a
 * neutral fact. Renders the view verbatim: a null market value drops its cell,
 * a null return block drops entirely and shows the no-price copy instead.
 */
export function PositionCard({
  position,
}: {
  position: NonNullable<StockDetailView["position"]>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tu posición</Text>

      <View style={styles.gridRow}>
        <Cell label="Acciones" value={position.shares} />
        <Cell label="Costo promedio" value={position.avgCost} />
      </View>
      <View style={[styles.gridRow, styles.gridRowLast]}>
        <Cell label="Costo total" value={position.costBasis} />
        {position.marketValue !== null && (
          <Cell label="Valor de mercado" value={position.marketValue} />
        )}
      </View>

      {position.return !== null ? (
        <ReturnBlock block={position.return} />
      ) : (
        <>
          <View style={styles.divider} />
          <Text style={styles.noPriceCopy}>
            Sin precio actual no podemos calcular tu retorno.
          </Text>
        </>
      )}
    </View>
  );
}

export function NotFound() {
  return (
    <View style={styles.notFound}>
      <Text style={styles.notFoundText}>No encontramos esta acción</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 20,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  heroPrice: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  heroNoPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  gridRowLast: {
    marginBottom: 0,
  },
  cell: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  cellValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textBright,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 18,
    marginBottom: 14,
  },
  pnlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pnlLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    paddingBottom: 3,
  },
  pnlFigures: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 9,
  },
  pnlValue: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  pnlPercent: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  components: {
    marginTop: 16,
    gap: 12,
  },
  componentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  componentLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textLight,
  },
  componentValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textBright,
    fontVariant: ["tabular-nums"],
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  noPriceCopy: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  notFoundText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
