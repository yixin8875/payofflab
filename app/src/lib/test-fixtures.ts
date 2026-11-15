import { daysUntil, quoteKey, type LiveChain, type LiveQuote } from "./live";

/** Local calendar date N days from today, matching daysUntil's own basis. */
export const isoIn = (days: number): string => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
};

export const makeQuote = (over: Partial<LiveQuote> = {}): LiveQuote => ({
  bid: 1,
  ask: 1.1,
  mid: 1.05,
  iv: 0.2,
  delta: 0.5,
  gamma: 0.01,
  theta: -0.02,
  vega: 0.1,
  oi: 500,
  volume: 50,
  last: 1.05,
  ...over,
});

export type FixtureLeg = {
  iso: string;
  kind: "call" | "put";
  strike: number;
  quote?: Partial<LiveQuote>;
};

export const makeChain = (
  symbol: string,
  spot: number,
  legs: FixtureLeg[],
  over: Partial<LiveChain> = {},
): LiveChain => {
  const quotes = new Map<string, LiveQuote>();
  for (const leg of legs) {
    quotes.set(quoteKey(leg.iso, leg.kind, leg.strike), makeQuote(leg.quote));
  }
  const expiries = [...new Set(legs.map((leg) => leg.iso))]
    .map((iso) => {
      const [, m, d] = iso.split("-").map(Number);
      return { iso, label: `${m}月${d}日`, dte: daysUntil(iso) };
    })
    .sort((a, b) => a.dte - b.dte);
  return {
    symbol,
    spot,
    change: 0,
    changePct: 0,
    iv30: 0.2,
    asOf: "test",
    expiries,
    quotes,
    ...over,
  };
};

/** A full strike ladder with tradable two-sided quotes, for scanner tests. */
export const makeLadder = (
  symbol: string,
  spot: number,
  iso: string,
  strikes: number[],
  over: Partial<LiveQuote> = {},
): LiveChain => {
  const legs: FixtureLeg[] = [];
  for (const strike of strikes) {
    legs.push({ iso, kind: "call", strike, quote: { bid: 2, ask: 2.2, mid: 2.1, ...over } });
    legs.push({ iso, kind: "put", strike, quote: { bid: 2, ask: 2.2, mid: 2.1, ...over } });
  }
  return makeChain(symbol, spot, legs);
};
