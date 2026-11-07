import { ticker } from "../data/tickers";
import { cachedChain } from "./live";
import { greeks, legPrice, type Leg } from "./options";
import type { SavedTrade } from "./store";

export type ScenarioInput = {
  /** Uniform move applied to every underlying, in percent. */
  spotPct: number;
  /** Volatility shift in points (1 point = 1 vol percentage point). */
  ivPts: number;
  /** Days forward from today. */
  days: number;
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

export const SPOT_RANGE = 20;

export function maxDte(trades: SavedTrade[]): number {
  let max = 0;
  for (const trade of trades) {
    for (const leg of trade.legs) max = Math.max(max, leg.dte);
  }
  return max;
}

function baseOf(trade: SavedTrade) {
  const base = ticker(trade.symbol);
  const live = cachedChain(trade.symbol);
  return { spot: live?.spot ?? base.spot, iv: live?.iv30 ?? base.iv };
}

function shift(trade: SavedTrade, spotPct: number, ivPts: number) {
  const base = baseOf(trade);
  return {
    spot: base.spot * (1 + spotPct / 100),
    iv: Math.max(0.02, base.iv + ivPts / 100),
  };
}

export function legMark(leg: Leg, spot: number, days: number, baseIv: number): number {
  const T = Math.max(leg.dte - days, 0) / 365;
  return leg.side * leg.qty * 100 * (legPrice(leg, spot, T, baseIv) - leg.fill);
}

export function tradeMark(
  trade: SavedTrade,
  spotPct: number,
  ivPts: number,
  days: number,
): number {
  const { spot, iv } = shift(trade, spotPct, ivPts);
  return trade.legs.reduce((sum, leg) => sum + legMark(leg, spot, days, iv), 0);
}

export function portfolioMark(
  trades: SavedTrade[],
  spotPct: number,
  ivPts: number,
  days: number,
): number {
  return trades.reduce((sum, trade) => sum + tradeMark(trade, spotPct, ivPts, days), 0);
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
    const T = Math.max(leg.dte - days, 0) / 365;
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

export function tradeGreeks(
  trade: SavedTrade,
  spotPct: number,
  ivPts: number,
  days: number,
): GreekTotals {
  const { spot, iv } = shift(trade, spotPct, ivPts);
  return legsGreeks(trade.legs, spot, iv, days);
}

export function portfolioGreeks(
  trades: SavedTrade[],
  spotPct: number,
  ivPts: number,
  days: number,
): GreekTotals {
  return trades.reduce<GreekTotals>(
    (sum, trade) => {
      const g = tradeGreeks(trade, spotPct, ivPts, days);
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

export function positionBreakdown(
  trades: SavedTrade[],
  input: ScenarioInput,
): PositionScenario[] {
  return trades.map((trade) => {
    const base = baseOf(trade);
    const current = tradeMark(trade, 0, 0, 0);
    const scenario = tradeMark(trade, input.spotPct, input.ivPts, input.days);
    const g = tradeGreeks(trade, input.spotPct, input.ivPts, input.days);
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
