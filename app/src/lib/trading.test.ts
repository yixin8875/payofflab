import { describe, expect, it } from "vitest";
import { ticker } from "../data/tickers";
import type { Leg } from "./options";
import { legPrice } from "./options";
import { positionMetrics, portfolioMetrics } from "./positions";
import { scanStrategies } from "./scanner";
import {
  betaFor,
  betaWeightedDelta,
  DEFAULT_SCENARIO,
  legMark,
  maxDte,
  positionBreakdown,
  symbolMovePct,
  symbolRisks,
  tradeGreeks,
  tradeMark,
} from "./scenario";
import type { SavedTrade } from "./store";
import { isoIn, makeChain, makeLadder } from "./test-fixtures";

const iso = isoIn(30);

const leg = (over: Partial<Leg> = {}): Leg => ({
  id: "l1",
  kind: "call",
  side: 1,
  qty: 1,
  strike: 100,
  expiry: iso,
  dte: 30,
  fill: 2,
  iv: 0.2,
  ...over,
});

const tradeOf = (legs: Leg[], over: Partial<SavedTrade> = {}): SavedTrade => ({
  id: "t1",
  name: "Test",
  symbol: "SPY",
  expiry: iso,
  legs,
  savedAt: "2026-01-01T00:00:00.000Z",
  openedAt: "2026-01-01T00:00:00.000Z",
  realized: 0,
  events: [],
  ...over,
});

function daysIn(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  const expiry = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(Math.round((expiry - today) / 86_400_000), 0.5);
}

describe("positionMetrics", () => {
  const chain = makeChain("SPY", 100, [
    { iso, kind: "call", strike: 100, quote: { mid: 3, bid: 2.9, ask: 3.1, iv: 0.2 } },
  ]);

  it("marks against the live mid and liquidates at the bid", () => {
    const m = positionMetrics(tradeOf([leg()]), chain);
    expect(m.online).toBe(true);
    expect(m.spot).toBe(100);
    expect(m.legs[0].source).toBe("live");
    expect(m.legs[0].mark).toBe(3);
    expect(m.legs[0].liqMark).toBe(2.9);
    expect(m.marketValue).toBe(300);
    expect(m.cost).toBe(200);
    expect(m.unrealized).toBe(100);
    expect(m.liqUnrealized).toBeCloseTo(90, 6);
    expect(m.spreadCost).toBeCloseTo(10, 6);
    expect(m.fees).toBeCloseTo(1.38, 6);
    expect(m.netUnrealized).toBeCloseTo(88.62, 6);
    expect(m.dte).toBe(30);
    expect(m.delta).toBeGreaterThan(0);
    expect(m.marks.l1).toBe(3);
    expect(m.closeMarks.l1).toBe(2.9);
  });

  it("falls back to the model without a chain", () => {
    const m = positionMetrics(tradeOf([leg()]));
    const base = ticker("SPY");
    expect(m.online).toBe(false);
    expect(m.spot).toBe(base.spot);
    expect(m.legs[0].source).toBe("model");
    expect(m.legs[0].mark).toBeCloseTo(
      legPrice(leg(), base.spot, daysIn(iso) / 365, base.iv),
      6,
    );
  });

  it("marks expired legs at intrinsic and flags the position", () => {
    const m = positionMetrics(tradeOf([leg({ expiry: isoIn(-2), dte: -2 })]), chain);
    expect(m.legs[0].source).toBe("expired");
    expect(m.legs[0].dte).toBe(-2);
    expect(m.legs[0].mark).toBe(0);
    expect(m.expired).toBe(true);
    expect(m.dte).toBe(-1);
  });

  it("pays an expired put its intrinsic value", () => {
    const expiredPut = leg({
      id: "p",
      kind: "put",
      strike: 110,
      expiry: isoIn(-1),
      dte: -1,
    });
    const m = positionMetrics(tradeOf([expiredPut]), makeChain("SPY", 100, []));
    expect(m.legs[0].source).toBe("expired");
    expect(m.legs[0].mark).toBe(10);
    expect(m.expired).toBe(true);
  });

  it("values stock at spot and counts its delta", () => {
    const stock = leg({ id: "s", kind: "stock", strike: 100, fill: 100, iv: undefined });
    const m = positionMetrics(tradeOf([stock]), makeChain("SPY", 110, []));
    expect(m.legs[0].source).toBe("stock");
    expect(m.marketValue).toBe(11000);
    expect(m.cost).toBe(10000);
    expect(m.unrealized).toBe(1000);
    expect(m.delta).toBe(100);
    expect(m.dte).toBe(-1);
  });
});

describe("portfolioMetrics", () => {
  it("aggregates open and closed trades by symbol", () => {
    const chain = makeChain("SPY", 100, [
      { iso, kind: "call", strike: 100, quote: { mid: 3, bid: 2.9, ask: 3.1 } },
    ]);
    const open = tradeOf([leg()]);
    const closed = tradeOf([leg({ id: "l2", qty: 0 })], {
      id: "t2",
      realized: 50,
      closedAt: "2026-02-01T00:00:00.000Z",
    });
    const p = portfolioMetrics([open, closed], { SPY: chain });
    expect(p.positions).toHaveLength(2);
    expect(p.open).toHaveLength(1);
    expect(p.totalOpen).toBe(1);
    expect(p.marketValue).toBe(300);
    expect(p.realized).toBe(50);
    expect(p.total).toBeCloseTo(150, 6);
    expect(p.bySymbol).toHaveLength(1);
    expect(p.bySymbol[0]).toMatchObject({ symbol: "SPY", openCount: 1, online: true });
    expect(p.online).toBe(1);
  });

  it("returns zeros for an empty book", () => {
    const p = portfolioMetrics([], {});
    expect(p.positions).toHaveLength(0);
    expect(p.unrealized).toBe(0);
    expect(p.bySymbol).toHaveLength(0);
  });
});

describe("scenario", () => {
  const spy = ticker("SPY");

  it("looks up static betas and defaults to one", () => {
    expect(betaFor("SPY")).toBe(1);
    expect(betaFor("sqQq")).toBe(-3.2);
    expect(betaFor("ZZZZ")).toBe(1);
  });

  it("applies uniform, beta and custom moves", () => {
    const base = { ...DEFAULT_SCENARIO, marketPct: 2, extras: { SQQQ: -1 } };
    expect(symbolMovePct("SQQQ", base)).toBe(2);
    expect(symbolMovePct("SQQQ", { ...base, mode: "beta" })).toBeCloseTo(-6.4, 6);
    expect(symbolMovePct("SQQQ", { ...base, mode: "custom" })).toBe(1);
    expect(symbolMovePct("SPY", { ...base, mode: "custom" })).toBe(2);
  });

  it("marks a stock leg off its fill", () => {
    const stock = leg({ kind: "stock", strike: 100, fill: 100 });
    expect(legMark(stock, 110, 0, 0.2)).toBe(1000);
  });

  it("prices a trade at entry, on a rally and after time passes", () => {
    const T = daysIn(iso) / 365;
    const entry = leg({ strike: 736 });
    const trade = tradeOf([{ ...entry, fill: legPrice(entry, spy.spot, T, spy.iv) }], {
      symbol: "SPY",
    });
    expect(tradeMark(trade, DEFAULT_SCENARIO)).toBeCloseTo(0, 6);
    expect(tradeMark(trade, { ...DEFAULT_SCENARIO, marketPct: 10 })).toBeGreaterThan(0);
    expect(tradeMark(trade, { ...DEFAULT_SCENARIO, days: 60 })).toBeLessThan(0);
  });

  it("reports greeks that decay to zero at expiry", () => {
    const trade = tradeOf([leg({ strike: 736 })]);
    expect(tradeGreeks(trade, DEFAULT_SCENARIO).delta).toBeGreaterThan(0);
    expect(tradeGreeks(trade, { ...DEFAULT_SCENARIO, days: 60 }).delta).toBe(0);
  });

  it("scales dollar delta into SPY shares", () => {
    const trade = tradeOf([leg({ strike: 736 })]);
    const delta = betaWeightedDelta([trade]);
    expect(delta).toBeCloseTo(tradeGreeks(trade, DEFAULT_SCENARIO).delta, 6);
  });

  it("splits the book by symbol and ranks by absolute pnl", () => {
    const spyTrade = tradeOf([
      leg({ strike: 736 }),
      leg({ id: "l2", strike: 700, side: -1, fill: 0.5, iv: 0.1 }),
    ]);
    const nvdaTrade = tradeOf([leg({ id: "n1", strike: 180 })], { id: "t2", symbol: "NVDA" });
    const risks = symbolRisks([spyTrade, nvdaTrade], {
      ...DEFAULT_SCENARIO,
      mode: "beta",
      marketPct: 5,
    });
    expect(risks.map((risk) => risk.symbol).sort()).toEqual(["NVDA", "SPY"]);
    for (const risk of risks) {
      expect(Number.isFinite(risk.pnl)).toBe(true);
      expect(risk.movePct).toBeCloseTo(5 * betaFor(risk.symbol), 6);
    }
    const nvda = risks.find((risk) => risk.symbol === "NVDA")!;
    expect(nvda.dollarGamma).not.toBe(0);
  });

  it("breaks down change per position", () => {
    const trade = tradeOf([leg({ strike: 736 })]);
    const [row] = positionBreakdown([trade], { ...DEFAULT_SCENARIO, marketPct: 10 });
    expect(row.change).toBeCloseTo(row.scenario - row.current, 6);
    expect(row.change).toBeGreaterThan(0);
    expect(row.spot).toBe(spy.spot);
  });

  it("measures the longest open option expiry", () => {
    const trade = tradeOf([
      leg({ expiry: isoIn(10) }),
      leg({ id: "l2", expiry: isoIn(80) }),
      leg({ id: "s", kind: "stock", expiry: isoIn(200) }),
    ]);
    expect(maxDte([trade])).toBe(80);
    expect(maxDte([])).toBe(0);
  });
});

describe("scanStrategies", () => {
  const ladder = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
  const chain = makeLadder("SPY", 100, iso, ladder);

  it("produces executable candidates for every outlook", () => {
    for (const outlook of ["bullish", "bearish", "neutral", "volatile"] as const) {
      const results = scanStrategies(chain, iso, outlook, "标准", "概率");
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.legs.length).toBeGreaterThan(0);
        expect(result.pop).toBeGreaterThanOrEqual(0);
        expect(result.pop).toBeLessThanOrEqual(1);
        expect(Number.isFinite(result.ev)).toBe(true);
        expect(result.legText.length).toBeGreaterThan(0);
      }
    }
  });

  it("sorts by probability or risk-reward", () => {
    const byPop = scanStrategies(chain, iso, "bullish", "标准", "概率");
    const pops = byPop.map((result) => result.pop);
    expect(pops).toEqual([...pops].sort((a, b) => b - a));

    const byRor = scanStrategies(chain, iso, "neutral", "标准", "风险回报");
    const rors = byRor.map((result) => result.ror ?? -1);
    expect(rors).toEqual([...rors].sort((a, b) => b - a));
  });

  it("enforces the strict liquidity policy", () => {
    const thin = makeLadder("SPY", 100, iso, [98, 99, 100, 101, 102], { oi: 10, volume: 0 });
    expect(scanStrategies(thin, iso, "volatile", "严格", "概率")).toEqual([]);
    expect(scanStrategies(thin, iso, "volatile", "宽松", "概率").length).toBeGreaterThan(0);
  });

  it("returns nothing without a known expiry or enough strikes", () => {
    expect(scanStrategies(chain, "1999-01-01", "bullish", "标准", "概率")).toEqual([]);
    const single = makeLadder("SPY", 100, iso, [100]);
    expect(scanStrategies(single, iso, "bullish", "标准", "概率")).toEqual([]);
  });
});
