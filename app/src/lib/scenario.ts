import { ticker } from "../data/tickers";
import { cachedChain, daysUntil, quoteKey } from "./live";
import { greeks, legPrice, type Leg } from "./options";
import type { SavedTrade } from "./store";

export type ScenarioMode = "uniform" | "beta" | "custom";

export type ScenarioInput = {
  mode: ScenarioMode;
  /** Market move in percent; in uniform mode it applies to every symbol. */
  marketPct: number;
  /** Volatility shift in points (1 point = 1 vol percentage point). */
  ivPts: number;
  /** Percentage cut applied to each leg's IV before the point shift. */
  ivCrushPct: number;
  /** Days forward from today. */
  days: number;
  /** Extra per-symbol move in custom mode, in percent. */
  extras: Record<string, number>;
};

export const DEFAULT_SCENARIO: ScenarioInput = {
  mode: "uniform",
  marketPct: 0,
  ivPts: 0,
  ivCrushPct: 0,
  days: 0,
  extras: {},
};

export type GreekTotals = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
};

export type PositionScenario = {
  trade: SavedTrade;
  spot: number;
  current: number;
  scenario: number;
  change: number;
  delta: number;
  vega: number;
};

export type SymbolRisk = {
  symbol: string;
  spot: number;
  beta: number;
  movePct: number;
  current: number;
  scenario: number;
  pnl: number;
  delta: number;
  /** Dollar change in delta for a 1% move: Γ × S² × 0.01. */
  dollarGamma: number;
  vega: number;
  theta: number;
};

export const SPOT_RANGE = 20;

/**
 * Static, approximate beta to SPY. These are a starting point for stress
 * testing, not measured regressions; the custom mode lets you override any
 * symbol directly.
 */
const BETAS: Record<string, number> = {
  SPY: 1, VOO: 1, VTI: 1, IVV: 1, DIA: 0.9, QQQ: 1.08, IWM: 1.15,
  TQQQ: 3.2, SQQQ: -3.2, SPXL: 3, SPXS: -3, UPRO: 3, SDOW: -3,
  UVXY: -3.5, VXX: -3, ARKK: 1.6, SOXL: 3, LABU: 2.6,
  AAPL: 1.15, MSFT: 1.0, GOOGL: 1.05, AMZN: 1.2, NVDA: 1.7, META: 1.25,
  TSLA: 2.0, NFLX: 1.2, AMD: 1.8, AVGO: 1.5, MU: 1.6, INTC: 1.2,
  SMCI: 2.0, ARM: 1.8, PLTR: 1.7, SOFI: 1.6, COIN: 2.4, HOOD: 2.0,
  MSTR: 2.6, GME: 1.8, AMC: 2.2, IBIT: 1.5, BA: 1.3, DIS: 1.0,
  JPM: 1.0, GS: 1.2, BAC: 1.1, WFC: 1.0, XLF: 1.0, XLE: 0.9,
  XOM: 0.8, CVX: 0.8, XLK: 1.1, XLV: 0.7, GLD: 0.1, SLV: 0.3,
  TLT: -0.25, HYG: 0.5, USO: 0.6,
};

export function betaFor(symbol: string): number {
  return BETAS[symbol.toUpperCase()] ?? 1;
}

export function maxDte(trades: SavedTrade[]): number {
  let max = 0;
  for (const trade of trades) {
    for (const leg of trade.legs) {
      if (leg.qty <= 0 || leg.kind === "stock") continue;
      max = Math.max(max, daysUntil(leg.expiry));
    }
  }
  return max;
}

function baseOf(trade: SavedTrade) {
  const base = ticker(trade.symbol);
  const live = cachedChain(trade.symbol);
  return { spot: live?.spot ?? base.spot, iv: live?.iv30 ?? base.iv };
}

export function symbolMovePct(symbol: string, input: ScenarioInput): number {
  const key = symbol.toUpperCase();
  if (input.mode === "beta") return input.marketPct * betaFor(key);
  if (input.mode === "custom") {
    return input.marketPct + (input.extras[key] ?? 0);
  }
  return input.marketPct;
}

function shockedIv(current: number, input: ScenarioInput): number {
  const crush = Math.min(90, Math.max(0, input.ivCrushPct)) / 100;
  return Math.max(0.01, current * (1 - crush) + input.ivPts / 100);
}

function legWithIv(leg: Leg, symbol: string, baseIv: number, input: ScenarioInput): Leg {
  if (leg.kind === "stock") return leg;
  const quote = cachedChain(symbol)?.quotes.get(
    quoteKey(leg.expiry, leg.kind, leg.strike),
  );
  const current = quote && quote.iv > 0 ? quote.iv : leg.iv ?? baseIv;
  return { ...leg, iv: shockedIv(current, input) };
}

export function legMark(
  leg: Leg,
  spot: number,
  days: number,
  baseIv: number,
): number {
  // Saved legs keep their expiry date, so the position ages with the calendar.
  const remaining = Math.max(daysUntil(leg.expiry) - days, 0);
  return leg.side * leg.qty * 100 * (legPrice(leg, spot, remaining / 365, baseIv) - leg.fill);
}

export function tradeMark(trade: SavedTrade, input: ScenarioInput): number {
  const base = baseOf(trade);
  const spot = base.spot * (1 + symbolMovePct(trade.symbol, input) / 100);
  const fallbackIv = shockedIv(base.iv, input);
  return trade.legs.reduce(
    (sum, leg) =>
      sum + legMark(legWithIv(leg, trade.symbol, base.iv, input), spot, input.days, fallbackIv),
    0,
  );
}

export function portfolioMark(trades: SavedTrade[], input: ScenarioInput): number {
  return trades.reduce((sum, trade) => sum + tradeMark(trade, input), 0);
}

function legsGreeks(legs: Leg[], spot: number, iv: number, days: number): GreekTotals {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") {
      delta += leg.side * leg.qty * 100;
      continue;
    }
    const T = Math.max(daysUntil(leg.expiry) - days, 0) / 365;
    // Expired options no longer carry sensitivity.
    if (T <= 0) continue;
    const g = greeks([leg], spot, T, iv);
    delta += g.delta;
    gamma += g.gamma;
    theta += g.theta;
    vega += g.vega;
  }
  return { delta, gamma, theta, vega };
}

export function tradeGreeks(trade: SavedTrade, input: ScenarioInput): GreekTotals {
  const base = baseOf(trade);
  const spot = base.spot * (1 + symbolMovePct(trade.symbol, input) / 100);
  const fallbackIv = shockedIv(base.iv, input);
  const legs = trade.legs.map((leg) =>
    legWithIv(leg, trade.symbol, base.iv, input),
  );
  return legsGreeks(legs, spot, fallbackIv, input.days);
}

export function portfolioGreeks(
  trades: SavedTrade[],
  input: ScenarioInput,
): GreekTotals {
  return trades.reduce<GreekTotals>(
    (sum, trade) => {
      const g = tradeGreeks(trade, input);
      return {
        delta: sum.delta + g.delta,
        gamma: sum.gamma + g.gamma,
        theta: sum.theta + g.theta,
        vega: sum.vega + g.vega,
      };
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0 },
  );
}

/** SPY-equivalent shares: each position's dollar delta scaled by its beta. */
export function betaWeightedDelta(trades: SavedTrade[]): number {
  const spySpot = cachedChain("SPY")?.spot || ticker("SPY").spot;
  if (!(spySpot > 0)) return 0;
  let total = 0;
  for (const trade of trades) {
    const base = baseOf(trade);
    const g = tradeGreeks(trade, DEFAULT_SCENARIO);
    total += (g.delta * base.spot * betaFor(trade.symbol)) / spySpot;
  }
  return total;
}

export function positionBreakdown(
  trades: SavedTrade[],
  input: ScenarioInput,
): PositionScenario[] {
  return trades.map((trade) => {
    const base = baseOf(trade);
    const current = tradeMark(trade, DEFAULT_SCENARIO);
    const scenario = tradeMark(trade, input);
    const g = tradeGreeks(trade, input);
    return {
      trade,
      spot: base.spot,
      current,
      scenario,
      change: scenario - current,
      delta: g.delta,
      vega: g.vega,
    };
  });
}

export function symbolRisks(
  trades: SavedTrade[],
  input: ScenarioInput,
): SymbolRisk[] {
  const bySymbol = new Map<string, SymbolRisk>();
  for (const trade of trades) {
    const key = trade.symbol.toUpperCase();
    const base = baseOf(trade);
    const g = tradeGreeks(trade, input);
    const current = tradeMark(trade, DEFAULT_SCENARIO);
    const scenario = tradeMark(trade, input);
    const entry = bySymbol.get(key) ?? {
      symbol: key,
      spot: base.spot,
      beta: betaFor(key),
      movePct: symbolMovePct(key, input),
      current: 0,
      scenario: 0,
      pnl: 0,
      delta: 0,
      dollarGamma: 0,
      vega: 0,
      theta: 0,
    };
    entry.current += current;
    entry.scenario += scenario;
    entry.pnl += scenario - current;
    entry.delta += g.delta;
    entry.dollarGamma += g.gamma * base.spot * base.spot * 0.01;
    entry.vega += g.vega;
    entry.theta += g.theta;
    bySymbol.set(key, entry);
  }
  return [...bySymbol.values()].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}
