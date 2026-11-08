import { useEffect, useRef, useState } from "react";
import { ticker } from "../data/tickers";
import {
  cachedChain,
  daysUntil,
  loadLiveChain,
  quoteKey,
  type LiveChain,
  type LiveQuote,
} from "./live";
import { closePrice, sideFees, tradeMargin, type MarginEstimate } from "./execution";
import { greeks, legPrice, type Leg } from "./options";
import { hasOpenLegs, type SavedTrade } from "./store";

export type MarkSource = "live" | "model" | "expired" | "stock";

export type PositionLeg = {
  leg: Leg;
  /** Calendar days to expiry; 0 for stock. */
  dte: number;
  /** Mid mark, used for display and model valuation. */
  mark: number;
  /** Price you would actually close at: bid for longs, ask for shorts. */
  liqMark: number;
  source: MarkSource;
  value: number;
  cost: number;
  pnl: number;
  liqPnl: number;
  quote?: LiveQuote;
};

export type PositionMetrics = {
  trade: SavedTrade;
  spot: number;
  iv: number;
  asOf?: string;
  online: boolean;
  /** Nearest open option expiry, or -1 when only stock remains. */
  dte: number;
  expired: boolean;
  marketValue: number;
  cost: number;
  /** Mark-to-mid P&L. */
  unrealized: number;
  /** P&L if every open leg were closed at bid/ask now. */
  liqUnrealized: number;
  /** Mid minus liquidation: the spread you pay to get out. */
  spreadCost: number;
  /** Round-trip fees on the open contracts. */
  fees: number;
  /** Liquidation P&L after fees. */
  netUnrealized: number;
  realized: number;
  total: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  margin: MarginEstimate;
  legs: PositionLeg[];
  /** Mid mark per leg id, used by the close dialog default. */
  marks: Record<string, number>;
  /** Liquidation price per leg id, used when closing at market. */
  closeMarks: Record<string, number>;
};

export type SymbolSummary = {
  symbol: string;
  spot: number;
  unrealized: number;
  realized: number;
  delta: number;
  theta: number;
  vega: number;
  openCount: number;
  online: boolean;
};

export type PortfolioMetrics = {
  positions: PositionMetrics[];
  open: PositionMetrics[];
  bySymbol: SymbolSummary[];
  marketValue: number;
  cost: number;
  unrealized: number;
  liqUnrealized: number;
  fees: number;
  netUnrealized: number;
  realized: number;
  total: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  margin: number;
  online: number;
  totalOpen: number;
};

function intrinsic(leg: Leg, spot: number): number {
  if (leg.kind === "call") return Math.max(spot - leg.strike, 0);
  if (leg.kind === "put") return Math.max(leg.strike - spot, 0);
  return spot;
}

function markedLeg(
  leg: Leg,
  chain: LiveChain | undefined,
  spot: number,
  iv: number,
): { mark: number; source: MarkSource; dte: number; quote?: LiveQuote } {
  if (leg.kind === "stock") return { mark: spot, source: "stock", dte: 0 };
  const dte = daysUntil(leg.expiry);
  const quote = chain?.quotes.get(quoteKey(leg.expiry, leg.kind, leg.strike));
  if (dte < 0) return { mark: intrinsic(leg, spot), source: "expired", dte, quote };
  if (quote && quote.mid > 0) return { mark: quote.mid, source: "live", dte, quote };
  return {
    mark: legPrice(leg, spot, Math.max(dte, 0.5) / 365, iv),
    source: "model",
    dte,
  };
}

export function positionMetrics(trade: SavedTrade, chain?: LiveChain): PositionMetrics {
  const base = ticker(trade.symbol);
  const spot = chain?.spot || base.spot;
  const iv = chain?.iv30 || base.iv;
  const legs: PositionLeg[] = [];
  let marketValue = 0;
  let cost = 0;
  let unrealized = 0;
  let liqUnrealized = 0;
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  let nearest = -1;
  let expired = false;
  const marks: Record<string, number> = {};
  const closeMarks: Record<string, number> = {};

  for (const leg of trade.legs) {
    const priced = markedLeg(leg, chain, spot, iv);
    const ratio = leg.side * leg.qty * 100;
    const value = ratio * priced.mark;
    const basis = ratio * leg.fill;
    const pnl = value - basis;
    const liqMark = closePrice(leg, priced.quote, priced.mark);
    const liqPnl = ratio * (liqMark - leg.fill);
    marks[leg.id] = priced.mark;
    closeMarks[leg.id] = liqMark;
    legs.push({
      leg,
      dte: priced.dte,
      mark: priced.mark,
      liqMark,
      source: priced.source,
      value,
      cost: basis,
      pnl,
      liqPnl,
      quote: priced.quote,
    });
    if (leg.qty <= 0) continue;
    marketValue += value;
    cost += basis;
    unrealized += pnl;
    liqUnrealized += liqPnl;
    if (leg.kind === "stock") {
      delta += ratio;
      continue;
    }
    if (priced.dte < 0) {
      expired = true;
      continue;
    }
    if (nearest < 0 || priced.dte < nearest) nearest = priced.dte;
    const legIv = priced.quote && priced.quote.iv > 0 ? priced.quote.iv : leg.iv ?? iv;
    const g = greeks(
      [{ ...leg, iv: legIv }],
      spot,
      Math.max(priced.dte, 0.5) / 365,
      iv,
    );
    delta += g.delta;
    gamma += g.gamma;
    theta += g.theta;
    vega += g.vega;
  }

  const fees = sideFees(trade.legs) * 2;
  const margin = tradeMargin(trade, spot, iv);

  return {
    trade,
    spot,
    iv,
    asOf: chain?.asOf,
    online: Boolean(chain),
    dte: nearest,
    expired,
    marketValue,
    cost,
    unrealized,
    liqUnrealized,
    spreadCost: unrealized - liqUnrealized,
    fees,
    netUnrealized: liqUnrealized - fees,
    realized: trade.realized,
    total: unrealized + trade.realized,
    delta,
    gamma,
    theta,
    vega,
    margin,
    legs,
    marks,
    closeMarks,
  };
}

export function portfolioMetrics(
  trades: SavedTrade[],
  chains: Record<string, LiveChain>,
): PortfolioMetrics {
  const positions = trades.map((trade) =>
    positionMetrics(trade, chains[trade.symbol.toUpperCase()]),
  );
  const open = positions.filter((item) => hasOpenLegs(item.trade));
  let marketValue = 0;
  let cost = 0;
  let unrealized = 0;
  let liqUnrealized = 0;
  let fees = 0;
  let netUnrealized = 0;
  let margin = 0;
  let realized = 0;
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  const onlineSymbols = new Set<string>();
  const groups = new Map<string, SymbolSummary>();

  for (const item of positions) {
    realized += item.realized;
    const key = item.trade.symbol.toUpperCase();
    const group = groups.get(key) ?? {
      symbol: key,
      spot: item.spot,
      unrealized: 0,
      realized: 0,
      delta: 0,
      theta: 0,
      vega: 0,
      openCount: 0,
      online: item.online,
    };
    group.realized += item.realized;
    if (hasOpenLegs(item.trade)) {
      marketValue += item.marketValue;
      cost += item.cost;
      unrealized += item.unrealized;
      liqUnrealized += item.liqUnrealized;
      fees += item.fees;
      netUnrealized += item.netUnrealized;
      margin += item.margin.requirement;
      delta += item.delta;
      gamma += item.gamma;
      theta += item.theta;
      vega += item.vega;
      group.unrealized += item.unrealized;
      group.delta += item.delta;
      group.theta += item.theta;
      group.vega += item.vega;
      group.openCount += 1;
      group.spot = item.spot;
      group.online = item.online;
      if (item.online) onlineSymbols.add(key);
    }
    groups.set(key, group);
  }

  return {
    positions,
    open,
    bySymbol: [...groups.values()].sort((a, b) => b.unrealized - a.unrealized),
    marketValue,
    cost,
    unrealized,
    liqUnrealized,
    fees,
    netUnrealized,
    realized,
    total: unrealized + realized,
    delta,
    gamma,
    theta,
    vega,
    margin,
    online: onlineSymbols.size,
    totalOpen: open.length,
  };
}

function uniqueSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.toUpperCase()).filter(Boolean))].sort();
}

/**
 * Loads every open position's chain once. A reload forces fresh CBOE quotes
 * for all symbols; symbols that fail keep their previous cached chain.
 */
export function useLiveChains(symbols: string[]) {
  const list = uniqueSymbols(symbols);
  const key = list.join(",");
  const [chains, setChains] = useState<Record<string, LiveChain>>(() => {
    const initial: Record<string, LiveChain> = {};
    for (const symbol of list) {
      const hit = cachedChain(symbol);
      if (hit) initial[symbol] = hit;
    }
    return initial;
  });
  const [loading, setLoading] = useState(() => list.some((symbol) => !cachedChain(symbol)));
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);
  const force = useRef(false);

  useEffect(() => {
    if (!list.length) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const shouldForce = force.current;
    force.current = false;
    setLoading(true);
    setError(undefined);
    Promise.allSettled(
      list.map(async (symbol) => {
        const chain = await loadLiveChain(symbol, shouldForce);
        return [symbol, chain] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, LiveChain> = {};
      const errors: string[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          const [symbol, chain] = result.value;
          next[symbol] = chain;
        } else {
          errors.push(
            result.reason instanceof Error ? result.reason.message : "在线行情连接失败",
          );
        }
      }
      setChains((prev) => ({ ...prev, ...next }));
      setError(errors[0]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // list is derived from key on every render; depend on the joined key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  return {
    chains,
    loading,
    error,
    reload: () => {
      force.current = true;
      setTick((value) => value + 1);
    },
  };
}
