import { ticker } from "../data/tickers";
import { quoteKey, type LiveChain, type LiveQuote } from "./live";
import { analyse, type Instrument, type Leg, type LegKind } from "./options";

export type ScanOutlook = "bullish" | "bearish" | "neutral" | "volatile";
export type ScanLiquidity = "严格" | "标准" | "宽松";
export type ScanRank = "概率" | "风险回报" | "预期价值" | "净权利金";

export type ScanResult = {
  key: string;
  name: string;
  legs: Leg[];
  legText: string;
  pop: number;
  /** Positive means the structure collects premium; negative pays a debit. */
  netCredit: number;
  maxProfit: number | null;
  maxLoss: number | null;
  ror: number | null;
  ev: number;
  breakevens: number[];
  minOi: number;
  minVolume: number;
  maxSpread: number;
};

type LegSpec = {
  kind: LegKind;
  side: 1 | -1;
  qty: number;
  strike: number;
};

type Candidate = {
  name: string;
  legs: Leg[];
};

type Policy = {
  oi: number;
  volume: number;
  spread: number;
};

const POLICIES: Record<ScanLiquidity, Policy> = {
  严格: { oi: 300, volume: 10, spread: 0.12 },
  标准: { oi: 50, volume: 1, spread: 0.25 },
  宽松: { oi: 0, volume: 0, spread: 0.5 },
};

function nearestIndex(strikes: number[], price: number): number {
  let best = 0;
  let distance = Infinity;
  for (let i = 0; i < strikes.length; i++) {
    const next = Math.abs(strikes[i] - price);
    if (next < distance) {
      distance = next;
      best = i;
    }
  }
  return best;
}

function strikesFor(chain: LiveChain, iso: string): number[] {
  const set = new Set<number>();
  for (const key of chain.quotes.keys()) {
    const [keyIso, kind, strikeText] = key.split("|");
    if (keyIso !== iso || (kind !== "call" && kind !== "put")) continue;
    const strike = Number(strikeText);
    if (Number.isFinite(strike) && strike > 0) set.add(strike);
  }
  return [...set].sort((a, b) => a - b);
}

function quoteOf(
  chain: LiveChain,
  iso: string,
  kind: "call" | "put",
  strike: number,
): LiveQuote | undefined {
  return chain.quotes.get(quoteKey(iso, kind, strike));
}

function legStats(chain: LiveChain, iso: string, legs: Leg[]) {
  let minOi = Infinity;
  let minVolume = Infinity;
  let maxSpread = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") continue;
    const quote = quoteOf(chain, iso, leg.kind, leg.strike);
    if (!quote) continue;
    const mid = (quote.bid + quote.ask) / 2;
    const spread = mid > 0 ? (quote.ask - quote.bid) / mid : 1;
    minOi = Math.min(minOi, quote.oi);
    minVolume = Math.min(minVolume, quote.volume);
    maxSpread = Math.max(maxSpread, spread);
  }
  return {
    minOi: Number.isFinite(minOi) ? minOi : 0,
    minVolume: Number.isFinite(minVolume) ? minVolume : 0,
    maxSpread,
  };
}

function buildLegs(
  chain: LiveChain,
  iso: string,
  dte: number,
  specs: LegSpec[],
  policy: Policy,
): Leg[] | null {
  const legs: Leg[] = [];
  for (const spec of specs) {
    if (spec.kind === "stock") {
      legs.push({
        id: `scan-${legs.length}-stock-${spec.side}`,
        kind: "stock",
        side: spec.side,
        qty: spec.qty,
        strike: chain.spot,
        expiry: iso,
        dte,
        fill: Number(chain.spot.toFixed(2)),
      });
      continue;
    }
    const quote = quoteOf(chain, iso, spec.kind, spec.strike);
    if (!quote || quote.bid <= 0 || quote.ask <= 0 || quote.ask < quote.bid) return null;
    const mid = (quote.bid + quote.ask) / 2;
    if (!Number.isFinite(mid) || mid <= 0) return null;
    if (quote.oi < policy.oi || quote.volume < policy.volume) return null;
    if ((quote.ask - quote.bid) / mid > policy.spread) return null;
    const fill = spec.side === 1 ? quote.ask : quote.bid;
    if (!Number.isFinite(fill) || fill <= 0) return null;
    const leg: Leg = {
      id: `scan-${legs.length}-${spec.kind}-${spec.side}-${spec.strike}`,
      kind: spec.kind,
      side: spec.side,
      qty: spec.qty,
      strike: spec.strike,
      expiry: iso,
      dte,
      fill: Number(fill.toFixed(2)),
    };
    if (quote.iv > 0) leg.iv = Number(quote.iv.toFixed(4));
    legs.push(leg);
  }
  return legs.length ? legs : null;
}

function signature(legs: Leg[]): string {
  return legs
    .map((leg) => `${leg.kind}:${leg.side}:${leg.qty}:${leg.strike}:${leg.expiry}`)
    .sort()
    .join("|");
}

function legText(legs: Leg[]): string {
  return legs
    .map((leg) => {
      const prefix = leg.side === 1 ? "+" : "−";
      if (leg.kind === "stock") return `${prefix}${leg.qty * 100}股`;
      const right = leg.kind === "call" ? "C" : "P";
      return `${prefix}${right}${leg.strike}${leg.qty > 1 ? `×${leg.qty}` : ""}`;
    })
    .join(" / ");
}

/**
 * Scans exchange-listed strikes for structures that match the selected
 * outlook. Entry fills use ask for buys and bid for sells, so the premium
 * shown is executable rather than mid-market.
 */
export function scanStrategies(
  chain: LiveChain,
  expiryIso: string,
  outlook: ScanOutlook,
  liquidity: ScanLiquidity,
  rank: ScanRank,
): ScanResult[] {
  const expiry = chain.expiries.find((item) => item.iso === expiryIso);
  const strikes = strikesFor(chain, expiryIso);
  if (!expiry || strikes.length < 2 || !chain.spot) return [];

  const policy = POLICIES[liquidity];
  const atm = strikes[nearestIndex(strikes, chain.spot)];
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const near = (pct: number, direction: "nearest" | "above" | "below" = "nearest") => {
    const target = chain.spot * (1 + pct / 100);
    let index = nearestIndex(strikes, target);
    if (direction === "above") {
      while (index < strikes.length - 1 && strikes[index] < target - 1e-9) index += 1;
    } else if (direction === "below") {
      while (index > 0 && strikes[index] > target + 1e-9) index -= 1;
    }
    return strikes[index];
  };

  const add = (name: string, specs: LegSpec[]) => {
    const optionStrikes = specs
      .filter((spec) => spec.kind !== "stock")
      .map((spec) => `${spec.kind}:${spec.strike}`);
    if (new Set(optionStrikes).size !== optionStrikes.length) return;
    const legs = buildLegs(chain, expiryIso, expiry.dte, specs, policy);
    if (!legs) return;
    const key = signature(legs);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ name, legs });
  };

  const opt = (
    kind: "call" | "put",
    side: 1 | -1,
    strike: number,
    qty = 1,
  ): LegSpec => ({ kind, side, qty, strike });

  if (outlook === "bullish") {
    for (const offset of [-1, 0, 1, 2, 3]) {
      add("买入看涨", [opt("call", 1, near(offset))]);
    }
    for (const anchor of [-1, 0, 1]) {
      for (const width of [0.5, 1, 1.5, 2]) {
        add("牛市看涨价差", [
          opt("call", 1, near(anchor)),
          opt("call", -1, near(anchor + width, "above")),
        ]);
      }
    }
    for (const anchor of [-1, -2, -3]) {
      for (const width of [0.5, 1, 1.5, 2]) {
        add("牛市看跌价差", [
          opt("put", -1, near(anchor, "below")),
          opt("put", 1, near(anchor - width, "below")),
        ]);
      }
    }
    for (const offset of [-2, -3, -4, -5]) {
      add("现金担保看跌", [opt("put", -1, near(offset, "below"))]);
    }
    for (const offset of [1, 2, 3, 4]) {
      add("备兑看涨", [
        { kind: "stock", side: 1, qty: 1, strike: chain.spot },
        opt("call", -1, near(offset, "above")),
      ]);
    }
  }

  if (outlook === "bearish") {
    for (const offset of [-3, -2, -1, 0, 1]) {
      add("买入看跌", [opt("put", 1, near(offset))]);
    }
    for (const anchor of [-1, -2, -3]) {
      for (const width of [0.5, 1, 1.5, 2]) {
        add("熊市看跌价差", [
          opt("put", 1, near(anchor, "below")),
          opt("put", -1, near(anchor - width, "below")),
        ]);
      }
    }
    for (const anchor of [1, 2, 3]) {
      for (const width of [0.5, 1, 1.5, 2]) {
        add("熊市看涨价差", [
          opt("call", -1, near(anchor, "above")),
          opt("call", 1, near(anchor + width, "above")),
        ]);
      }
    }
  }

  if (outlook === "neutral") {
    for (const distance of [3, 4, 5]) {
      for (const width of [1.5, 2.5]) {
        add("铁鹰式", [
          opt("put", -1, near(-distance, "below")),
          opt("put", 1, near(-distance - width, "below")),
          opt("call", -1, near(distance, "above")),
          opt("call", 1, near(distance + width, "above")),
        ]);
      }
    }
    for (const width of [1.5, 2.5, 4]) {
      add("铁蝶式", [
        opt("put", -1, atm),
        opt("call", -1, atm),
        opt("put", 1, near(-width, "below")),
        opt("call", 1, near(width, "above")),
      ]);
      add("蝶式价差", [
        opt("call", 1, near(-width, "below")),
        opt("call", -1, atm, 2),
        opt("call", 1, near(width, "above")),
      ]);
    }
    for (const distance of [3, 5]) {
      add("卖出宽跨式", [opt("put", -1, near(-distance, "below")), opt("call", -1, near(distance, "above"))]);
    }
  }

  if (outlook === "volatile") {
    add("买入跨式", [opt("call", 1, atm), opt("put", 1, atm)]);
    for (const distance of [2, 3, 4]) {
      add("买入宽跨式", [
        opt("put", 1, near(-distance, "below")),
        opt("call", 1, near(distance, "above")),
      ]);
    }
  }

  if (!candidates.length) return [];

  const base = ticker(chain.symbol);
  const instrument: Instrument = {
    ...base,
    symbol: chain.symbol,
    spot: chain.spot,
    change: chain.change,
    changePct: chain.changePct,
    iv: chain.iv30 || base.iv,
    expiries: chain.expiries,
  };
  const T = Math.max(expiry.dte, 0) / 365;
  const results: ScanResult[] = [];

  for (const candidate of candidates) {
    const analysis = analyse(candidate.legs, instrument, T);
    const netCredit = -analysis.premium;
    if (!Number.isFinite(analysis.expectedValue) || Math.abs(netCredit) < 0.01) continue;
    if (analysis.maxProfit !== null && analysis.maxProfit <= 0) continue;
    if (analysis.maxLoss !== null && analysis.maxLoss >= 0) continue;
    const risk = analysis.maxLoss !== null ? Math.abs(analysis.maxLoss) : null;
    const ror =
      risk !== null && risk > 0 && analysis.maxProfit !== null
        ? analysis.maxProfit / risk
        : null;
    const stats = legStats(chain, expiryIso, candidate.legs);
    results.push({
      key: signature(candidate.legs),
      name: candidate.name,
      legs: candidate.legs,
      legText: legText(candidate.legs),
      pop: analysis.probProfit,
      netCredit,
      maxProfit: analysis.maxProfit,
      maxLoss: analysis.maxLoss,
      ror,
      ev: analysis.expectedValue,
      breakevens: analysis.breakevens,
      ...stats,
    });
  }

  results.sort((a, b) => {
    if (rank === "概率") return b.pop - a.pop;
    if (rank === "风险回报") return (b.ror ?? -1) - (a.ror ?? -1);
    if (rank === "净权利金") return Math.abs(b.netCredit) - Math.abs(a.netCredit);
    return b.ev - a.ev;
  });

  return results.slice(0, 80);
}
