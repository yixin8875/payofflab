import { describe, expect, it } from "vitest";
import { q } from "./options";
import { daysUntil, quoteKey, type LiveChain, type LiveQuote } from "./live";
import { bsGamma } from "./options";
import {
  computeGex,
  computeGexHeatmap,
  computeGexProfile,
  gexAxisLabel,
  gexLabel,
  inGexRange,
  strikeLabel,
  type GexRange,
} from "./gex";

const isoIn = (days: number) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
};

const baseQuote = (over: Partial<LiveQuote> = {}): LiveQuote => ({
  bid: 1,
  ask: 1.2,
  mid: 1.1,
  iv: 0.2,
  delta: 0.5,
  gamma: 0.02,
  theta: -0.01,
  vega: 0.1,
  oi: 100,
  volume: 10,
  last: 1.1,
  ...over,
});

type Leg = {
  iso: string;
  kind: "call" | "put";
  strike: number;
  quote?: Partial<LiveQuote>;
};

const chainOf = (spot: number, legs: Leg[]): LiveChain => {
  const quotes = new Map<string, LiveQuote>();
  for (const leg of legs) {
    quotes.set(quoteKey(leg.iso, leg.kind, leg.strike), baseQuote(leg.quote));
  }
  const expiries = [...new Set(legs.map((leg) => leg.iso))]
    .map((iso) => {
      const [, m, d] = iso.split("-").map(Number);
      return { iso, label: `${m}月${d}日`, dte: daysUntil(iso) };
    })
    .sort((a, b) => a.dte - b.dte);
  return {
    symbol: "TEST",
    spot,
    change: 0,
    changePct: 0,
    iv30: 0.2,
    asOf: "test",
    expiries,
    quotes,
  };
};

const ALL: GexRange = { kind: "all" };

describe("computeGex dollar gamma", () => {
  it("uses gamma × weight × 100 × spot² × 0.01 per 1%", () => {
    const chain = chainOf(50, [
      { iso: isoIn(7), kind: "call", strike: 50, quote: { gamma: 0.04, oi: 10 } },
    ]);
    const gex = computeGex(chain, ALL);
    expect(gex.total).toBeCloseTo(1000, 6);
    expect(gex.callTotal).toBeCloseTo(1000, 6);
    expect(gex.callWall?.strike).toBe(50);
  });

  it("switches to dollars per 1 point", () => {
    const chain = chainOf(50, [
      { iso: isoIn(7), kind: "call", strike: 50, quote: { gamma: 0.04, oi: 10 } },
    ]);
    const point = computeGex(chain, ALL, { unit: "point" });
    // per-point = per-1% × 100 / spot
    expect(point.total).toBeCloseTo(2000, 6);
  });

  it("gives puts a negative sign", () => {
    const chain = chainOf(50, [
      { iso: isoIn(7), kind: "call", strike: 50, quote: { gamma: 0.04, oi: 10 } },
      { iso: isoIn(7), kind: "put", strike: 50, quote: { gamma: 0.02, oi: 25 } },
    ]);
    const gex = computeGex(chain, ALL);
    expect(gex.callTotal).toBeCloseTo(1000, 6);
    expect(gex.putTotal).toBeCloseTo(-1250, 6);
    expect(gex.total).toBeCloseTo(-250, 6);
    expect(gex.callPutRatio).toBeCloseTo(0.8, 6);
  });
});

describe("computeGex filters", () => {
  it("weights by volume when asked", () => {
    const chain = chainOf(50, [
      { iso: isoIn(7), kind: "call", strike: 50, quote: { gamma: 0.04, oi: 10, volume: 2 } },
    ]);
    const gex = computeGex(chain, ALL, { weight: "volume" });
    expect(gex.total).toBeCloseTo(200, 6);
    expect(gex.weight).toBe("volume");
  });

  it("drops strikes outside the moneyness band", () => {
    const chain = chainOf(100, [
      { iso: isoIn(7), kind: "call", strike: 100, quote: { gamma: 0.02 } },
      { iso: isoIn(7), kind: "call", strike: 80, quote: { gamma: 0.02 } },
    ]);
    const all = computeGex(chain, ALL);
    const near = computeGex(chain, ALL, { moneyness: 0.1 });
    expect(all.strikes.map((row) => row.strike)).toEqual([80, 100]);
    expect(near.strikes.map((row) => row.strike)).toEqual([100]);
  });

  it("respects the expiry range but keeps the full term structure", () => {
    const chain = chainOf(100, [
      { iso: isoIn(3), kind: "call", strike: 100, quote: { gamma: 0.01 } },
      { iso: isoIn(20), kind: "call", strike: 100, quote: { gamma: 0.01 } },
      { iso: isoIn(60), kind: "call", strike: 100, quote: { gamma: 0.01 } },
    ]);
    const week = computeGex(chain, { kind: "week" });
    const month = computeGex(chain, { kind: "month" });
    expect(week.includedExpiries).toBe(1);
    expect(month.includedExpiries).toBe(2);
    expect(week.byExpiry).toHaveLength(3);
    expect(month.byExpiry).toHaveLength(3);
    expect(week.total).toBeLessThan(month.total);
  });

  it("reports range membership", () => {
    expect(inGexRange(isoIn(3), { kind: "week" })).toBe(true);
    expect(inGexRange(isoIn(20), { kind: "week" })).toBe(false);
    expect(inGexRange(isoIn(20), { kind: "month" })).toBe(true);
    expect(inGexRange(isoIn(60), { kind: "expiry", iso: isoIn(60) })).toBe(true);
    expect(inGexRange(isoIn(60), { kind: "expiry", iso: isoIn(20) })).toBe(false);
  });
});

describe("computeGex structure", () => {
  it("interpolates the gamma flip between strikes", () => {
    const chain = chainOf(99, [
      { iso: isoIn(7), kind: "call", strike: 98, quote: { gamma: 0.02, oi: 10 } },
      { iso: isoIn(7), kind: "put", strike: 99, quote: { gamma: 0.05, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 100, quote: { gamma: 0.02, oi: 10 } },
    ]);
    const gex = computeGex(chain, ALL);
    const [first, second] = gex.strikes;
    expect(first.net).toBeGreaterThan(0);
    expect(first.net + second.net).toBeLessThan(0);
    const ratio = -first.net / second.net;
    expect(gex.flip).toBeCloseTo(first.strike + (second.strike - first.strike) * ratio, 6);
    expect(gex.flipZone).toBeNull();
  });

  it("turns a double crossing near spot into a flip zone", () => {
    const chain = chainOf(99, [
      { iso: isoIn(7), kind: "call", strike: 98, quote: { gamma: 0.04, oi: 10 } },
      { iso: isoIn(7), kind: "put", strike: 99, quote: { gamma: 0.05, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 100, quote: { gamma: 0.04, oi: 10 } },
    ]);
    const gex = computeGex(chain, ALL);
    expect(gex.flipZone).not.toBeNull();
    expect(gex.flipZone!.low).toBeGreaterThan(98);
    expect(gex.flipZone!.high).toBeLessThan(100);
    expect(gex.flipZone!.low).toBeLessThan(gex.flipZone!.high);
  });

  it("sums the wall over ±2 listed strikes", () => {
    const chain = chainOf(100, [
      { iso: isoIn(7), kind: "call", strike: 98, quote: { gamma: 0.01, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 99, quote: { gamma: 0.01, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 100, quote: { gamma: 0.02, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 101, quote: { gamma: 0.01, oi: 10 } },
      { iso: isoIn(7), kind: "call", strike: 102, quote: { gamma: 0.01, oi: 10 } },
    ]);
    const gex = computeGex(chain, ALL);
    expect(gex.callWall?.strike).toBe(100);
    expect(gex.callWall?.thick).toBeCloseTo(6000, 6);
  });

  it("measures top-five concentration", () => {
    const legs: Leg[] = [];
    for (let strike = 95; strike <= 100; strike += 1) {
      legs.push({ iso: isoIn(7), kind: "call", strike, quote: { gamma: 0.01, oi: 10 } });
    }
    const gex = computeGex(chainOf(100, legs), ALL);
    expect(gex.concentration).toBeCloseTo(5 / 6, 6);
  });

  it("keeps the chart to the 61 strikes nearest spot", () => {
    const legs: Leg[] = [];
    for (let strike = 65; strike <= 134; strike += 1) {
      legs.push({ iso: isoIn(7), kind: "call", strike, quote: { gamma: 0.01, oi: 1 } });
    }
    const gex = computeGex(chainOf(100, legs), ALL);
    expect(gex.strikes).toHaveLength(70);
    expect(gex.chartStrikes).toHaveLength(61);
    expect(gex.chartStrikes[0].strike).toBe(70);
    expect(gex.chartStrikes[60].strike).toBe(130);
  });

  it("returns an empty result without quotes", () => {
    const gex = computeGex(chainOf(100, []), ALL);
    expect(gex.total).toBe(0);
    expect(gex.strikes).toHaveLength(0);
    expect(gex.flip).toBeNull();
    expect(gex.callWall).toBeNull();
  });
});

describe("computeGex IV scenarios", () => {
  it("recomputes gamma so lower IV raises exposure", () => {
    const chain = chainOf(100, [
      { iso: isoIn(7), kind: "call", strike: 100, quote: { iv: 0.2, gamma: 0.02, oi: 10 } },
    ]);
    const base = computeGex(chain, ALL, { ivScale: 1 });
    const down = computeGex(chain, ALL, { ivScale: 0.7 });
    const up = computeGex(chain, ALL, { ivScale: 1.3 });
    expect(down.total).toBeGreaterThan(base.total);
    expect(base.total).toBeGreaterThan(up.total);
    expect(up.total).toBeGreaterThan(0);
  });

  it("drops legs without IV when the scenario is model-based", () => {
    const iso = isoIn(7);
    const years = Math.max(daysUntil(iso), 1) / 365;
    const gamma = bsGamma(100, 100, years, 0.2);
    const chain = chainOf(100, [
      { iso, kind: "call", strike: 100, quote: { iv: 0.2, oi: 10, gamma } },
      { iso, kind: "call", strike: 120, quote: { iv: 0, gamma: 0.02, oi: 10 } },
    ]);
    const quoted = computeGex(chain, ALL);
    const modelled = computeGex(chain, ALL, { ivScale: 1 });
    expect(quoted.total - modelled.total).toBeCloseTo(2000, 6);
  });
});

describe("computeGex vanna and charm", () => {
  it("is positive for an OTM call and mirrors for the matching put", () => {
    const iso = isoIn(30);
    const call = computeGex(
      chainOf(100, [{ iso, kind: "call", strike: 110, quote: { iv: 0.2, oi: 10 } }]),
      ALL,
    );
    const put = computeGex(
      chainOf(100, [{ iso, kind: "put", strike: 110, quote: { iv: 0.2, oi: 10 } }]),
      ALL,
    );
    expect(call.vannaTotal).toBeGreaterThan(0);
    expect(put.vannaTotal).toBeCloseTo(-call.vannaTotal, 6);

    const years = Math.max(daysUntil(iso), 1) / 365;
    const notional = 10 * 100 * 100;
    const putCharm = -call.charmTotal + (q * Math.exp(-q * years) * notional) / 365;
    expect(call.charmTotal).not.toBe(0);
    expect(put.charmTotal).toBeCloseTo(putCharm, 3);
  });

  it("sums the per-strike columns into the totals", () => {
    const gex = computeGex(
      chainOf(100, [
        { iso: isoIn(30), kind: "call", strike: 110, quote: { iv: 0.2, oi: 10 } },
        { iso: isoIn(30), kind: "put", strike: 90, quote: { iv: 0.25, oi: 4 } },
      ]),
      ALL,
    );
    const vanna = gex.strikes.reduce((sum, row) => sum + row.vanna, 0);
    const charm = gex.strikes.reduce((sum, row) => sum + row.charm, 0);
    expect(vanna).toBeCloseTo(gex.vannaTotal, 6);
    expect(charm).toBeCloseTo(gex.charmTotal, 6);
  });
});

describe("computeGexProfile", () => {
  it("agrees with the quoted gamma at spot", () => {
    const iso = isoIn(7);
    const years = Math.max(daysUntil(iso), 1) / 365;
    const chain = chainOf(100, [
      {
        iso,
        kind: "call",
        strike: 105,
        quote: { iv: 0.2, oi: 10, gamma: bsGamma(100, 105, years, 0.2) },
      },
      {
        iso,
        kind: "put",
        strike: 95,
        quote: { iv: 0.25, oi: 20, gamma: bsGamma(100, 95, years, 0.25) },
      },
    ]);
    const gex = computeGex(chain, ALL);
    const profile = computeGexProfile(chain, ALL);
    expect(profile.current.net).toBeCloseTo(gex.total, 6);
    expect(profile.points).toHaveLength(33);
    expect(profile.low).toBeCloseTo(90, 6);
    expect(profile.high).toBeCloseTo(110, 6);
    expect(profile.current.price).toBe(100);
  });

  it("returns no points without spot or IV", () => {
    const noSpot = computeGexProfile(chainOf(0, []), ALL);
    expect(noSpot.points).toHaveLength(0);
    const noIv = computeGexProfile(
      chainOf(100, [{ iso: isoIn(7), kind: "call", strike: 100, quote: { iv: 0 } }]),
      ALL,
    );
    expect(noIv.points).toHaveLength(0);
  });
});

describe("computeGexHeatmap", () => {
  const chain = chainOf(100, [
    { iso: isoIn(3), kind: "call", strike: 95, quote: { gamma: 0.02, oi: 10 } },
    { iso: isoIn(3), kind: "put", strike: 95, quote: { gamma: 0.01, oi: 20 } },
    { iso: isoIn(10), kind: "call", strike: 100, quote: { gamma: 0.03, oi: 10 } },
  ]);

  it("keeps cells aligned with strikes and expiries", () => {
    const heat = computeGexHeatmap(chain, 0.1);
    expect(heat.expiries).toHaveLength(2);
    expect(heat.rows.map((row) => row.strike)).toEqual([100, 95]);
    expect(heat.rows[1].cells).toHaveLength(2);
    expect(heat.rows[1].cells[0]?.net).toBeCloseTo(
      heat.rows[1].cells[0]!.call + heat.rows[1].cells[0]!.put,
      6,
    );
    expect(heat.rows[0].cells[0]).toBeNull();
    expect(heat.rows[0].cells[1]).not.toBeNull();
    expect(heat.scale).toBeGreaterThan(0);
  });

  it("falls back to the nearest strikes when the band is empty", () => {
    const far = chainOf(100, [
      { iso: isoIn(3), kind: "call", strike: 95, quote: { gamma: 0.02, oi: 10 } },
      { iso: isoIn(3), kind: "call", strike: 90, quote: { gamma: 0.02, oi: 10 } },
    ]);
    const narrow = computeGexHeatmap(far, 0.001);
    expect(narrow.rows.map((row) => row.strike)).toEqual([95, 90]);
  });
});

describe("labels", () => {
  it("formats dollar amounts by magnitude", () => {
    expect(gexLabel(1_500_000_000)).toBe("$1.50B");
    expect(gexLabel(-2_300_000)).toBe("−$2.3M");
    expect(gexLabel(12_345)).toBe("$12k");
    expect(gexLabel(500)).toBe("$500");
    expect(gexLabel(1500, { sign: true })).toBe("+$2k");
  });

  it("keeps axis labels shorter", () => {
    expect(gexAxisLabel(1_500_000_000)).toBe("$1.5B");
    expect(gexAxisLabel(-2_300_000)).toBe("−$2M");
  });

  it("formats strikes with and without decimals", () => {
    expect(strikeLabel(600)).toBe("600");
    expect(strikeLabel(600.5)).toBe("600.5");
  });
});
