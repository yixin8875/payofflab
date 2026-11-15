import { daysUntil, type LiveChain } from "./live";
import { bsCharm, bsGamma, bsVanna } from "./options";

/**
 * Gamma exposure (GEX) is a positioning estimate, not observed dealer risk:
 * calls are treated as positive gamma and puts as negative gamma, the common
 * "naive GEX" convention. Dollar gamma is expressed per 1% move in the
 * underlying by default: gamma × qty × 100 × spot² × 0.01. The unit can be
 * switched to dollars per 1 point, and qty can be open interest or volume.
 */

export type GexRange =
  | { kind: "all" }
  | { kind: "week" }
  | { kind: "month" }
  | { kind: "expiry"; iso: string };

export type GexWeight = "oi" | "volume";
export type GexUnit = "pct" | "point";

export type GexOptions = {
  /** Position weight: open interest (default) or today's volume. */
  weight?: GexWeight;
  /** Keep strikes within ±moneyness of spot, e.g. 0.2 for ±20%; null = all. */
  moneyness?: number | null;
  /** Dollars per 1% move (default) or per 1 point. */
  unit?: GexUnit;
  /**
   * Recompute gamma from each leg's IV times this factor, e.g. 0.7 for a
   * post-earnings IV −30% scenario; leave undefined to use the quoted gamma.
   * When set, legs without IV are dropped.
   */
  ivScale?: number;
};

export type GexStrike = {
  strike: number;
  /** Signed dollar gamma from calls (positive). */
  call: number;
  /** Signed dollar gamma from puts (negative). */
  put: number;
  net: number;
  /** Weighted contracts behind each side (open interest or volume). */
  callWeight: number;
  putWeight: number;
  /** Dealer-signed dollar vanna: delta change per volatility point. */
  vanna: number;
  /** Dealer-signed dollar charm: delta change per calendar day. */
  charm: number;
};

export type GexExpiryRow = {
  iso: string;
  label: string;
  dte: number;
  call: number;
  put: number;
  net: number;
};

export type GexWall = {
  strike: number;
  value: number;
  /** Same-side gamma summed over the wall strike ±2 listed strikes. */
  thick: number;
};

export type GexZone = { low: number; high: number };

export type GexResult = {
  spot: number;
  total: number;
  callTotal: number;
  putTotal: number;
  flip: number | null;
  /** Two or more zero crossings within ±3% of spot, when they exist. */
  flipZone: GexZone | null;
  callWall: GexWall | null;
  putWall: GexWall | null;
  /** Share of gross |net| gamma held by the five largest strikes. */
  concentration: number;
  /** Call gamma divided by the absolute put gamma; null when no put gamma. */
  callPutRatio: number | null;
  /** Net dollar vanna across every included strike (per vol point). */
  vannaTotal: number;
  /** Net dollar charm across every included strike (per day). */
  charmTotal: number;
  weight: GexWeight;
  unit: GexUnit;
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

const dollarGamma = (gamma: number, qty: number, spot: number, unit: GexUnit) =>
  unit === "pct"
    ? gamma * qty * 100 * spot * spot * 0.01
    : gamma * qty * 100 * spot;

const weightFor = (quote: { oi: number; volume: number }, weight: GexWeight) =>
  weight === "volume" ? quote.volume : quote.oi;

const inMoneyness = (
  strike: number,
  spot: number,
  moneyness: number | null | undefined,
) => moneyness == null || Math.abs(strike / spot - 1) <= moneyness;

export function inGexRange(iso: string, range: GexRange): boolean {
  if (range.kind === "all") return true;
  if (range.kind === "week") return daysUntil(iso) <= 7;
  if (range.kind === "month") return daysUntil(iso) <= 30;
  return iso === range.iso;
}

export function computeGex(
  chain: LiveChain,
  range: GexRange,
  options: GexOptions = {},
): GexResult {
  const spot = chain.spot > 0 ? chain.spot : 0;
  const weight = options.weight ?? "oi";
  const unit = options.unit ?? "pct";
  const moneyness = options.moneyness ?? null;
  const ivScale = options.ivScale;
  const empty: GexResult = {
    spot,
    total: 0,
    callTotal: 0,
    putTotal: 0,
    flip: null,
    flipZone: null,
    callWall: null,
    putWall: null,
    concentration: 0,
    callPutRatio: null,
    vannaTotal: 0,
    charmTotal: 0,
    weight,
    unit,
    strikes: [],
    chartStrikes: [],
    byExpiry: [],
    includedExpiries: 0,
  };
  if (!spot) return empty;

  const byStrike = new Map<number, GexStrike>();
  const byExpiry = new Map<string, GexExpiryRow>();
  const included = new Set<string>();
  const yearsByIso = new Map<string, number>();
  const yearsFor = (iso: string) => {
    let years = yearsByIso.get(iso);
    if (years == null) {
      years = Math.max(daysUntil(iso), 1) / 365;
      yearsByIso.set(iso, years);
    }
    return years;
  };

  for (const [key, quote] of chain.quotes) {
    const [iso, kind, strikeText] = key.split("|");
    if (kind !== "call" && kind !== "put") continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike) || strike <= 0) continue;
    const qty = weightFor(quote, weight);
    if (qty <= 0) continue;
    if (!inMoneyness(strike, spot, moneyness)) continue;

    const years = yearsFor(iso);
    let gamma = quote.gamma;
    if (ivScale != null) {
      // Model-based scenarios recompute gamma so every column shares a model.
      if (!(quote.iv > 0)) continue;
      gamma = bsGamma(spot, strike, years, quote.iv * ivScale);
    }
    if (!(gamma > 0)) continue;

    const dollars = dollarGamma(gamma, qty, spot, unit);
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
      ({
        strike,
        call: 0,
        put: 0,
        net: 0,
        callWeight: 0,
        putWeight: 0,
        vanna: 0,
        charm: 0,
      } satisfies GexStrike);
    if (kind === "call") {
      slot.call += dollars;
      slot.callWeight += qty;
    } else {
      slot.put -= dollars;
      slot.putWeight += qty;
    }
    slot.net = slot.call + slot.put;

    // Second-order exposure is built from each leg's own IV, so it stays a
    // "today's vol" reading even when the gamma view is IV-shocked.
    if (quote.iv > 0) {
      const notional = qty * 100 * spot;
      const vanna = bsVanna(spot, strike, years, quote.iv) * 0.01 * notional;
      const charm = (bsCharm(spot, strike, years, quote.iv, kind) / 365) * notional;
      const sign = kind === "call" ? 1 : -1;
      slot.vanna += sign * vanna;
      slot.charm += sign * charm;
    }
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
  let vannaTotal = 0;
  let charmTotal = 0;
  for (const row of strikes) {
    callTotal += row.call;
    putTotal += row.put;
    vannaTotal += row.vanna;
    charmTotal += row.charm;
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
  // A second crossing near spot means the flip is really a band, not a line.
  const nearCrossings = crossings.filter((value) => Math.abs(value - spot) <= spot * 0.03);
  const flipZone =
    nearCrossings.length >= 2
      ? { low: Math.min(...nearCrossings), high: Math.max(...nearCrossings) }
      : null;

  let callWallIndex = -1;
  let putWallIndex = -1;
  let callWallValue = 0;
  let putWallValue = 0;
  for (let index = 0; index < strikes.length; index += 1) {
    const row = strikes[index];
    if (row.call > callWallValue) {
      callWallValue = row.call;
      callWallIndex = index;
    }
    if (row.put < putWallValue) {
      putWallValue = row.put;
      putWallIndex = index;
    }
  }
  const thickness = (index: number, side: "call" | "put") => {
    if (index < 0) return 0;
    let sum = 0;
    const from = Math.max(0, index - 2);
    const to = Math.min(strikes.length - 1, index + 2);
    for (let i = from; i <= to; i += 1) {
      sum += side === "call" ? strikes[i].call : strikes[i].put;
    }
    return sum;
  };
  const callWall =
    callWallIndex >= 0
      ? {
          strike: strikes[callWallIndex].strike,
          value: callWallValue,
          thick: thickness(callWallIndex, "call"),
        }
      : null;
  const putWall =
    putWallIndex >= 0
      ? {
          strike: strikes[putWallIndex].strike,
          value: putWallValue,
          thick: thickness(putWallIndex, "put"),
        }
      : null;

  let gross = 0;
  for (const row of strikes) gross += Math.abs(row.net);
  const topFive = [...strikes]
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 5)
    .reduce((sum, row) => sum + Math.abs(row.net), 0);
  const concentration = gross > 0 ? topFive / gross : 0;
  const callPutRatio = putTotal !== 0 ? callTotal / Math.abs(putTotal) : null;

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
    flipZone,
    callWall,
    putWall,
    concentration,
    callPutRatio,
    vannaTotal,
    charmTotal,
    weight,
    unit,
    strikes,
    chartStrikes,
    byExpiry: [...byExpiry.values()].sort((a, b) => a.dte - b.dte),
    includedExpiries: included.size,
  };
}

export type GexProfilePoint = {
  price: number;
  call: number;
  put: number;
  net: number;
};

export type GexProfile = {
  points: GexProfilePoint[];
  current: GexProfilePoint;
  /** Hypothetical prices where net gamma crosses zero. */
  crossings: number[];
  low: number;
  high: number;
  span: number;
};

/**
 * Spot-shifted gamma profile: hold today's positions and each leg's IV fixed,
 * move the underlying within ±span, and recompute gamma with Black-Scholes.
 * This answers "does the wall/flip survive if price gets there?".
 */
export function computeGexProfile(
  chain: LiveChain,
  range: GexRange,
  options: GexOptions = {},
  span = 0.1,
  steps = 32,
): GexProfile {
  const spot = chain.spot > 0 ? chain.spot : 0;
  const empty: GexProfile = {
    points: [],
    current: { price: spot, call: 0, put: 0, net: 0 },
    crossings: [],
    low: spot,
    high: spot,
    span,
  };
  if (!spot) return empty;

  const weight = options.weight ?? "oi";
  const unit = options.unit ?? "pct";
  const moneyness = options.moneyness ?? null;

  const legs: {
    strike: number;
    kind: "call" | "put";
    qty: number;
    iv: number;
    years: number;
  }[] = [];
  for (const [key, quote] of chain.quotes) {
    const [iso, kind, strikeText] = key.split("|");
    if (kind !== "call" && kind !== "put") continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike) || strike <= 0) continue;
    const qty = weightFor(quote, weight);
    if (qty <= 0 || !(quote.iv > 0)) continue;
    if (!inMoneyness(strike, spot, moneyness)) continue;
    if (!inGexRange(iso, range)) continue;
    legs.push({
      strike,
      kind,
      qty,
      iv: quote.iv,
      // 0DTE gamma is a spike at the strike; floor the clock at one day.
      years: Math.max(daysUntil(iso), 1) / 365,
    });
  }
  // No model legs means the curve would be a flat zero line; show the empty
  // state instead of a chart that implies "no gamma anywhere".
  if (!legs.length) return empty;

  const netAt = (price: number): GexProfilePoint => {
    let call = 0;
    let put = 0;
    for (const leg of legs) {
      const gamma = bsGamma(price, leg.strike, leg.years, leg.iv);
      if (!(gamma > 0)) continue;
      const dollars = dollarGamma(gamma, leg.qty, price, unit);
      if (leg.kind === "call") call += dollars;
      else put -= dollars;
    }
    return { price, call, put, net: call + put };
  };

  const low = spot * (1 - span);
  const high = spot * (1 + span);
  const points: GexProfilePoint[] = [];
  for (let index = 0; index <= steps; index += 1) {
    points.push(netAt(low + ((high - low) * index) / steps));
  }

  const crossings: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (left.net === 0) {
      crossings.push(left.price);
      continue;
    }
    if ((left.net < 0 && right.net > 0) || (left.net > 0 && right.net < 0)) {
      const ratio = -left.net / (right.net - left.net);
      crossings.push(left.price + (right.price - left.price) * ratio);
    }
  }

  return { points, current: netAt(spot), crossings, low, high, span };
}

/** One strike/expiry intersection of the GEX heatmap. */
export type GexHeatCell = {
  call: number;
  put: number;
  net: number;
};

export type GexHeatRow = {
  strike: number;
  /** One entry per displayed expiry, or null when nothing is listed there. */
  cells: (GexHeatCell | null)[];
};

export type GexHeatExpiry = {
  iso: string;
  label: string;
  dte: number;
};

export type GexHeatmapData = {
  spot: number;
  expiries: GexHeatExpiry[];
  /** Rows run from the highest strike down to the lowest. */
  rows: GexHeatRow[];
  /** 90th percentile of |net| across displayed cells — the color cap. */
  scale: number;
  hiddenExpiries: number;
  hiddenStrikes: number;
};

const HEAT_MAX_EXPIRIES = 12;
const HEAT_MAX_STRIKES = 121;

/**
 * Same naive dollar gamma as computeGex, but kept two-dimensional:
 * strike × expiry. The band is a percentage window around spot so the grid
 * stays readable on coarse (SPY) and fine (single names) strike ladders alike.
 */
export function computeGexHeatmap(
  chain: LiveChain,
  bandPct = 0.1,
  options: GexOptions = {},
): GexHeatmapData {
  const spot = chain.spot > 0 ? chain.spot : 0;
  const weight = options.weight ?? "oi";
  const unit = options.unit ?? "pct";
  const moneyness = options.moneyness ?? null;
  const empty: GexHeatmapData = {
    spot,
    expiries: [],
    rows: [],
    scale: 1,
    hiddenExpiries: 0,
    hiddenStrikes: 0,
  };
  if (!spot) return empty;

  const cells = new Map<string, GexHeatCell>();
  const expiries = new Set<string>();
  const strikes = new Set<number>();

  for (const [key, quote] of chain.quotes) {
    const [iso, kind, strikeText] = key.split("|");
    if (kind !== "call" && kind !== "put") continue;
    const strike = Number(strikeText);
    if (!Number.isFinite(strike) || strike <= 0) continue;
    const qty = weightFor(quote, weight);
    if (qty <= 0 || quote.gamma <= 0) continue;
    if (!inMoneyness(strike, spot, moneyness)) continue;

    const dollars = dollarGamma(quote.gamma, qty, spot, unit);
    const id = `${iso}|${strike}`;
    const cell = cells.get(id) ?? { call: 0, put: 0, net: 0 };
    if (kind === "call") cell.call += dollars;
    else cell.put -= dollars;
    cell.net = cell.call + cell.put;
    cells.set(id, cell);
    expiries.add(iso);
    strikes.add(strike);
  }

  const allExpiries = [...expiries]
    .map((iso) => ({ iso, label: expiryLabel(iso), dte: daysUntil(iso) }))
    .sort((a, b) => a.dte - b.dte);
  const shownExpiries = allExpiries.slice(0, HEAT_MAX_EXPIRIES);

  const sorted = [...strikes].sort((a, b) => a - b);
  let band = sorted.filter((strike) => Math.abs(strike - spot) <= spot * bandPct);
  // Coarse ladders can fall through a narrow band; fall back to nearest strikes.
  if (band.length < 5) {
    band = [...sorted]
      .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))
      .slice(0, 15);
  }
  const hiddenStrikes = Math.max(0, band.length - HEAT_MAX_STRIKES);
  const shownStrikes = [...band].sort((a, b) => a - b);
  const keptStrikes =
    shownStrikes.length > HEAT_MAX_STRIKES
      ? [...shownStrikes]
          .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))
          .slice(0, HEAT_MAX_STRIKES)
          .sort((a, b) => a - b)
      : shownStrikes;

  const rows = [...keptStrikes].reverse().map((strike) => ({
    strike,
    cells: shownExpiries.map((expiry) => cells.get(`${expiry.iso}|${strike}`) ?? null),
  }));

  // Clip the color scale at the 90th percentile so one huge expiry does not
  // wash out the rest of the grid.
  const magnitudes = rows
    .flatMap((row) => row.cells)
    .filter((cell): cell is GexHeatCell => cell !== null)
    .map((cell) => Math.abs(cell.net))
    .sort((a, b) => a - b);
  const scale = magnitudes.length
    ? Math.max(1, magnitudes[Math.floor((magnitudes.length - 1) * 0.9)])
    : 1;

  return {
    spot,
    expiries: shownExpiries,
    rows,
    scale,
    hiddenExpiries: allExpiries.length - shownExpiries.length,
    hiddenStrikes,
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
