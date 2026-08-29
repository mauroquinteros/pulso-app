import type { StocksStatus } from "@/stores/stocks";
import type { Portfolio } from "@/types/models";
import { formatShares, formatSignedPercent, formatSignedUSD, formatUSD } from "@/utils/format";

export type Tone = "positive" | "negative";

/**
 * What a card prints where a price-dependent figure would have gone. Two words,
 * because there are two reasons the figure is missing and only one of them is a
 * failure.
 *
 * Before any read has answered the app does not yet know whether prices exist,
 * so it states the absence and claims nothing about it. Once one has answered
 * and left nothing priced, the figure genuinely could not be worked out, and
 * saying so is what stops an empty slot reading as a rendering glitch. Getting
 * this backwards is the whole point of the distinction: "no se pudo" during a
 * load in progress is a failure the app has no grounds to report yet.
 *
 * Short Spanish phrases rather than a dash - the app already says "Sin precio"
 * in an unpriced holding's row, so these read as the app declining, and neither
 * needs a U+2014 that the ASCII-only rule would force into an escape.
 */
const NOT_YET_KNOWN = "Sin dato";
const COULD_NOT_COMPUTE = "No se pudo calcular";

/**
 * Every field a current price is needed to state is `| null`, so a card cannot
 * print one without first deciding what to show in its absence. The figures
 * derived from the History alone - Efectivo's amount, Aportado, Realizado,
 * Dividendos netos, Comisiones - keep their plain types and always print.
 */
export interface HomeView {
  worth: {
    /** Total Portfolio Value. */
    total: string | null;
    /** The composition bar's "En activos" half - Market Value, and the share of
     * the total it holds. null takes the whole bar with it, since a bar drawn
     * from Efectivo alone would read as an all-cash portfolio. */
    invested: { label: string; pct: string; amount: string; flex: number } | null;
    /** The amount is Cash and always prints; only `pct` needs a price, since it
     * divides by Total Portfolio Value. */
    cash: { label: string; pct: string | null; amount: string; flex: number };
  };
  return: {
    total: string | null;
    tone: Tone;
    percent: string | null;
    // Set only when Peak Contributions exceeds current Net Contributions (a
    // withdrawal has lowered the running total below its high-water mark), so
    // the percentage divides by a base that is not the shown Aportado. null
    // otherwise, when the two coincide and no explanation is needed - and null
    // when there is no percentage on screen for it to explain.
    percentTooltip: string | null;
    aportado: string;
    valeHoy: string | null;
    components: {
      label: string;
      /** null only for "No realizado", the one component holding Net P&L. */
      value: string | null;
      tone: Tone;
      /** Share of the largest component, 0..1. null on every component at once
       * when one of them is withheld - see the note in buildHomeView. */
      fill: number | null;
    }[];
  };
  assets: {
    /** Net P&L over the priced holdings, as a signed amount and nothing else.
     * It carries no percentage: its base is Cost Basis while Rendimiento
     * total's is Peak Contributions, and two same-coloured percentages with
     * unstated and different denominators read as a part exceeding its whole. */
    netPnl: string | null;
    netPnlTone: Tone;
    holdings: {
      ticker: string;
      shares: string;
      priceAvailable: boolean;
      value: string | null;
      pnl: string | null;
      pnlPct: string | null;
      pnlTone: Tone;
    }[];
  };
  /** The one line naming holdings left out of figures that still printed. null
   * when every Holding is priced, and null when none is - a total miss explains
   * itself through `withheldLabel` and the per-holding rows. */
  priceNote: string | null;
  /** What a card prints wherever this view-model says null: what the app does
   * not know yet, or what it could not work out. */
  withheldLabel: string;
}

/** A signed figure is negative only past the ±0.005 rounding threshold. */
const toneOf = (amount: number): Tone => (amount < -0.005 ? "negative" : "positive");

/** One-decimal share-of-total percent, e.g. "94.7%". Guards a zero total. */
const compositionPct = (part: number, total: number): string =>
  `${total !== 0 ? ((part / total) * 100).toFixed(1) : "0.0"}%`;

/**
 * The line under the headline about the prices behind it, and it exists for one
 * situation only: a *partial* miss, where the figures still print and something
 * was left out of them. It is the distribution card's caption almost verbatim,
 * since it says the same thing about the same holdings; only what they are
 * excluded from differs.
 *
 * There is deliberately no line for the total miss. The withheld figures already
 * say "No se pudo calcular" and Mis Activos names every unpriced holding, so a
 * sentence there restated what the screen showed twice over - and it had to be
 * kept clear of the History's "No pudimos cargar tus movimientos" and the
 * refresh banner's "No pudimos actualizar los precios" while saying much the
 * same kind of thing. Not writing it is the cheaper way to keep them apart.
 */
function priceNote(missingPrice: number, unpriceable: boolean): string | null {
  // Nothing priced needs no sentence: the withheld figures already read "No se
  // pudo calcular", and Mis Activos lists every holding with "Sin precio"
  // against it, which is the reason. A paragraph repeating that was three lines
  // saying what two words and a list already say.
  if (unpriceable) return null;
  if (missingPrice === 0) return null;
  return missingPrice === 1
    ? "1 activo sin precio, excluido de los totales"
    : `${missingPrice} activos sin precio, excluidos de los totales`;
}

/**
 * Pure view-model for the Home screen: turns the derived Portfolio into
 * display-ready strings, bar ratios, and a tone per signed figure. The Home
 * components render this verbatim and hold no derivation or formatting.
 *
 * It also decides, here and nowhere else, which figures Inicio declines to
 * print. Every price-applied figure the engine reports is a sum over the
 * *priced* holdings, so with none of them priced those sums are zero for want
 * of a price rather than because the portfolio is worth nothing - and printing
 * them renders a dropped connection as a wiped-out account. Only the
 * price-dependent figures are withheld: the ones derived from the History
 * alone are still exactly right and still print.
 *
 * The read's status is deliberately not an input. Whether the Quotes were never
 * asked for, could not be obtained, or do not exist, the app holds no price and
 * the figure is equally unsayable; naming the cause is the refresh banner's job
 * (`showsRefreshFailed`), and only for the one cause it can actually identify.
 */
export function buildHomeView(portfolio: Portfolio, status: StocksStatus): HomeView {
  const { totalReturn, holdings } = portfolio;

  // Holdings, none of them priced. An empty portfolio is not an unpriceable
  // one: with nothing held, Total Portfolio Value is Cash, which is exact.
  const unpriceable = holdings.length > 0 && portfolio.holdingsMissingPrice === holdings.length;

  // Worth — composition of Total Portfolio Value into Market Value vs Cash.
  const total = portfolio.totalPortfolioValue;
  const worth: HomeView["worth"] = {
    total: unpriceable ? null : formatUSD(total),
    invested: unpriceable
      ? null
      : {
          label: "En activos",
          pct: compositionPct(portfolio.marketValue, total),
          amount: formatUSD(portfolio.marketValue),
          flex: Math.max(portfolio.marketValue, 0.0001),
        },
    cash: {
      label: "Efectivo",
      pct: unpriceable ? null : compositionPct(portfolio.cash, total),
      amount: formatUSD(portfolio.cash),
      flex: Math.max(portfolio.cash, 0.0001),
    },
  };

  // Return — Total Return + the four proportional components. Only the first
  // component needs a price; the other three come from the History alone.
  const componentAmounts = [
    {
      label: "No realizado",
      amount: totalReturn.unrealizedPnl,
      priceDependent: true,
    },
    { label: "Realizado", amount: totalReturn.realizedPnl, priceDependent: false },
    { label: "Dividendos netos", amount: totalReturn.netDividends, priceDependent: false },
    { label: "Comisiones", amount: -totalReturn.totalFees, priceDependent: false },
  ];
  const maxAbs = Math.max(...componentAmounts.map((c) => Math.abs(c.amount)), 0.0001);
  const peakExceedsNet = portfolio.peakContributions > portfolio.netContributions;
  const returnView: HomeView["return"] = {
    total: unpriceable ? null : formatSignedUSD(totalReturn.total),
    tone: toneOf(totalReturn.total),
    percent: unpriceable ? null : formatSignedPercent(totalReturn.percent),
    percentTooltip:
      peakExceedsNet && !unpriceable
        ? `Calculado sobre tu aportado máximo (${formatUSD(portfolio.peakContributions)}), no el actual, para que un retiro no infle tu rendimiento.`
        : null,
    aportado: formatUSD(portfolio.netContributions),
    valeHoy: unpriceable ? null : formatUSD(total),
    components: componentAmounts.map((c) => ({
      label: c.label,
      value: unpriceable && c.priceDependent ? null : formatSignedUSD(c.amount),
      tone: toneOf(c.amount),
      // A fill is a share of the largest component, so a withheld component
      // takes the scale with it: rescaling to the three that remain would draw
      // whichever is largest of *those* as a full bar, stating a proportion of
      // a total the card has just refused to give. Every fill goes at once.
      fill: unpriceable ? null : Math.abs(c.amount) / maxAbs,
    })),
  };

  // Assets — aggregate Net P&L as an amount, plus per-holding rows. The rows
  // already say "Sin precio" one by one; only the aggregate is withheld.
  const netPnl = totalReturn.unrealizedPnl;
  const assets: HomeView["assets"] = {
    netPnl: unpriceable ? null : formatSignedUSD(netPnl),
    netPnlTone: toneOf(netPnl),
    holdings: holdings.map((h) => ({
      ticker: h.ticker,
      shares: formatShares(h.shares),
      priceAvailable: h.priceAvailable,
      value: h.priceAvailable && h.marketValue !== null ? formatUSD(h.marketValue) : null,
      pnl: h.priceAvailable && h.netPnl !== null ? formatSignedUSD(h.netPnl) : null,
      pnlPct: h.priceAvailable && h.netPnl !== null ? formatSignedPercent(h.netPnlPercent ?? 0) : null,
      pnlTone: toneOf(h.netPnl ?? 0),
    })),
  };

  return {
    worth,
    return: returnView,
    assets,
    priceNote: priceNote(portfolio.holdingsMissingPrice, unpriceable),
    // `unread` is the one state where nothing has come back yet, so the app
    // cannot say a figure could not be worked out - it has not tried and
    // finished. Every other state has an answer behind it (ADR 0011).
    withheldLabel: status === "unread" ? NOT_YET_KNOWN : COULD_NOT_COMPUTE,
  };
}

export interface RefreshFailedInput {
  /** How the last read that landed came out. A read in flight does not enter this. */
  status: StocksStatus;
  /** Stocks in hand right now - the size of the store's map. */
  quotedCount: number;
  /** Currently-held tickers. Zero means there is no price on screen to be about. */
  holdingCount: number;
}

/**
 * Whether Inicio says the prices could not be updated.
 *
 * This decides the fourth situation and only the fourth: the app *has* Quotes
 * and could not find out whether newer ones exist (ADR 0011, CONTEXT.md). It is
 * derived rather than stored, and it needs no memory of what it last answered -
 * the store keeps whether a read is in flight apart from how the last one ended,
 * so a refresh in progress cannot overwrite the fault the banner is about.
 *
 * Two silences are deliberate:
 *
 * - `quotedCount === 0` says nothing. A failed *first* read has no Quote it is
 *   failing to refresh, so it stays exactly what it already was: holdings
 *   excluded and flagged. This also covers the rarer case of a re-read that had
 *   only ever been answered with an empty map, which these facts cannot tell
 *   from a first read - and where the sentence would be just as untrue.
 * - `holdingCount === 0` says nothing. A user holding nothing has no price on
 *   screen for a failed refresh to be news about.
 */
export function showsRefreshFailed({ status, quotedCount, holdingCount }: RefreshFailedInput): boolean {
  if (holdingCount === 0 || quotedCount === 0) return false;
  return status === "failed";
}
