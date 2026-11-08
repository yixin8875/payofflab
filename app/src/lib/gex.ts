import { daysUntil, type LiveChain } from "./live";

/**
 * Gamma exposure (GEX) is a positioning estimate, not observed dealer risk:
 * calls are treated as positive gamma and puts as negative gamma, the common
 * "naive GEX" convention. Dollar gamma is expressed per 1% move in the
 * underlying: gamma × OI × 100 × spot² × 0.01.
 */

export type GexRange =
  | { kind: "all" }
  | { kind: "week" }
  | { kind: "expiry"; iso: string };

export type GexStrike = {
  strike: number;
  /** Signed dollar gamma from calls (positive). */
  call: number;
  /** Signed dollar gamma from puts (negative). */
  put: number;
  net: number;
  callOi: number;
  putOi: number;
};

export type GexExpiryRow = {
  iso: string;
  label: string;
  dte: number;
  call: number;
  put: number;
  net: number;
};

export type GexWall = { strike: number; value: number };

export type GexResult = {
  spot: number;
  total: number;
  callTotal: number;
  putTotal: number;
  flip: number | null;
  callWall: GexWall | null;
  putWall: GexWall | null;
  strikes: GexStrike[];
  chartStrikes: GexStrike[];
  byExpiry: GexExpiryRow[];
  includedExpiries: number;
};

const CHART_BARS = 61;

const expiryLabel = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return month && day ? `${month}月${day}日` : iso;
};

const dollarGamma = (gamma: number, oi: number, spot: number) =>
  gamma * oi * 100 * spot * spot * 0.01;

export function inGexRange(iso: string, range: GexRange): boolean {
  if (range.kind === "all") return true;
  if (range.kind === "week") return daysUntil(iso) <= 7;
  return iso === range.iso;
}

export function computeGex(chain: LiveChain, range: GexRange): GexResult {
  const spot = chain.spot > 0 ? chain.spot : 0;
  const empty: GexResult = {
    spot,
    total: 0,
    callTotal: 0,
    putTotal: 0,
    flip: null,
    callWall: null,
    putWall: null,
    strikes: [],
    chartStrikes: [],
    byExpiry: [],
    includedExpiries: 0,
  };
  if (!spot) return empty;

  const byStrike = new Map<number, GexStrike>();
  const byExpiry = new Map<string, GexExpiryRow>();
  const included = new Set<string>();

  for (const [key, quote] of chain.quotes) {
    const [iso, kind, strikeText] = key.split("|");
    if (kind !== "call" && kind !== "put") continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike) || strike <= 0) continue;
    if (quote.oi <= 0 || quote.gamma <= 0) continue;

    const dollars = dollarGamma(quote.gamma, quote.oi, spot);
    const signed = kind === "call" ? dollars : -dollars;

    // Term structure always covers every expiry, independent of the range.
    const row =
      byExpiry.get(iso) ??
      ({
        iso,
        label: expiryLabel(iso),
        dte: daysUntil(iso),
        call: 0,
        put: 0,
        net: 0,
      } satisfies GexExpiryRow);
    if (kind === "call") row.call += dollars;
    else row.put -= dollars;
    row.net += signed;
    byExpiry.set(iso, row);

    if (!inGexRange(iso, range)) continue;
    included.add(iso);

    const slot =
      byStrike.get(strike) ??
      ({ strike, call: 0, put: 0, net: 0, callOi: 0, putOi: 0 } satisfies GexStrike);
    if (kind === "call") {
      slot.call += dollars;
      slot.callOi += quote.oi;
    } else {
      slot.put -= dollars;
      slot.putOi += quote.oi;
    }
    slot.net = slot.call + slot.put;
    byStrike.set(strike, slot);
  }

  const strikes = [...byStrike.values()].sort((a, b) => a.strike - b.strike);
  if (!strikes.length) {
    return {
      ...empty,
      byExpiry: [...byExpiry.values()].sort((a, b) => a.dte - b.dte),
    };
  }

  let callTotal = 0;
  let putTotal = 0;
  for (const row of strikes) {
    callTotal += row.call;
    putTotal += row.put;
  }
  const total = callTotal + putTotal;

  // Gamma flip: the cumulative strike profile closest to spot where it crosses zero.
  const crossings: number[] = [];
  let cumulative = 0;
  let previous = 0;
  for (let index = 0; index < strikes.length; index += 1) {
    cumulative += strikes[index].net;
    if (index > 0) {
      if (previous === 0) {
        crossings.push(strikes[index - 1].strike);
      } else if ((previous < 0 && cumulative > 0) || (previous > 0 && cumulative < 0)) {
        const span = cumulative - previous;
        const ratio = span === 0 ? 0 : -previous / span;
        crossings.push(
          strikes[index - 1].strike +
            (strikes[index].strike - strikes[index - 1].strike) * ratio,
        );
      }
    }
    previous = cumulative;
  }
  const flip = crossings.length
    ? crossings.reduce((best, value) =>
        Math.abs(value - spot) < Math.abs(best - spot) ? value : best,
      )
    : null;

  let callWall: GexWall | null = null;
  let putWall: GexWall | null = null;
  for (const row of strikes) {
    if (row.call > 0 && (!callWall || row.call > callWall.value)) {
      callWall = { strike: row.strike, value: row.call };
    }
    if (row.put < 0 && (!putWall || row.put < putWall.value)) {
      putWall = { strike: row.strike, value: row.put };
    }
  }

  // Keep the chart readable: nearest strikes around spot, then keep price order.
  const chartStrikes = [...strikes]
    .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
    .slice(0, CHART_BARS)
    .sort((a, b) => a.strike - b.strike);

  return {
    spot,
    total,
    callTotal,
    putTotal,
    flip,
    callWall,
    putWall,
    strikes,
    chartStrikes,
    byExpiry: [...byExpiry.values()].sort((a, b) => a.dte - b.dte),
    includedExpiries: included.size,
  };
}

/** "$1.24B", "−$86.4M" — the unit GEX is normally read in. */
export function gexLabel(value: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : opts.sign && value > 0 ? "+" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Shorter form for chart ticks. */
export function gexAxisLabel(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function strikeLabel(strike: number): string {
  return Number.isInteger(strike)
    ? strike.toLocaleString("en-US")
    : strike.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
