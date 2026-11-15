import { describe, expect, it } from "vitest";
import { EXPIRIES, ticker } from "../data/tickers";
import { buildChain, dteYears, expiryFor, makeLeg, pricedLeg, quote, roundStrike, snapStrike } from "./chain";
import { closePrice, estimateMargin, sideFees } from "./execution";
import { clamp, clampText, compactMoney, money, num, pct, price, signedPct } from "./format";
import { daysUntil } from "./live";
import { usMarketStatus } from "./market";
import { legPrice } from "./options";
import { CHIP_GROUPS, PRESET_BY_KEY, PRESETS, legsFor } from "./presets";
import { isoIn, makeChain, makeQuote } from "./test-fixtures";
import { computeSkew, computeVolSurface, termShape, volPoints } from "./vol";

describe("format", () => {
  it("clamps numbers into a range", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("formats money with cents and signs", () => {
    expect(money(1234.5, { cents: true })).toBe("$1,234.50");
    expect(money(-1234.5, { cents: true })).toBe("−$1,234.50");
    expect(money(12, { sign: true })).toBe("+$12");
    expect(money(0, { sign: true })).toBe("$0");
  });

  it("compacts thousands", () => {
    expect(compactMoney(1500)).toBe("$1.5k");
    expect(compactMoney(12000)).toBe("$12k");
    expect(compactMoney(-900)).toBe("−$900");
    expect(compactMoney(0)).toBe("$0");
  });

  it("formats percents with the typographic minus", () => {
    expect(pct(0.1234)).toBe("12.3%");
    expect(pct(-0.125)).toBe("−12.5%");
    expect(pct(0.1234, 2)).toBe("12.34%");
    expect(signedPct(0.05)).toBe("+5.0%");
    expect(signedPct(-0.05)).toBe("−5.0%");
    expect(signedPct(0)).toBe("0.0%");
  });

  it("formats decimal numbers", () => {
    expect(num(1234.567)).toBe("1,234.57");
    expect(num(1234.567, 0)).toBe("1,235");
    expect(price(2.5)).toBe("2.50");
  });

  it("truncates text with an ellipsis", () => {
    expect(clampText("abcdef", 4)).toBe("abc…");
    expect(clampText("ab", 4)).toBe("ab");
  });
});

describe("chain", () => {
  it("rounds strikes to the ladder step", () => {
    expect(roundStrike(100.4, 1)).toBe(100);
    expect(roundStrike(100.6, 1)).toBe(101);
    expect(roundStrike(100.1, 1, "up")).toBe(101);
    expect(roundStrike(100.9, 1, "down")).toBe(100);
    expect(roundStrike(101.1, 2.5)).toBe(100);
    expect(roundStrike(101.3, 2.5, "up")).toBe(102.5);
  });

  it("floors the clock at half a day", () => {
    expect(dteYears(0)).toBeCloseTo(0.5 / 365, 12);
    expect(dteYears(-3)).toBeCloseTo(0.5 / 365, 12);
    expect(dteYears(365)).toBeCloseTo(1, 12);
  });

  it("prices a synthetic quote around the mid", () => {
    const spy = ticker("SPY");
    const q = quote(spy, "call", 736, 27, undefined, false);
    expect(q.mid).toBeGreaterThan(0);
    expect(q.bid).toBeGreaterThan(0);
    expect(q.bid).toBeLessThanOrEqual(q.mid);
    expect(q.ask).toBeGreaterThanOrEqual(q.mid);
    expect(q.iv).toBeGreaterThan(0);
  });

  it("builds a sorted ladder of strikes around spot", () => {
    const rows = buildChain(ticker("SPY"), "2026-12-18", 11, false);
    expect(rows).toHaveLength(11);
    expect(rows.map((row) => row.strike)).toEqual(
      [...rows.map((row) => row.strike)].sort((a, b) => a - b),
    );
    for (const row of rows) {
      expect(row.call.bid).toBeGreaterThan(0);
      expect(row.put.bid).toBeGreaterThan(0);
      expect(row.call.delta).toBeGreaterThan(0);
      expect(row.put.delta).toBeLessThan(0);
      expect(row.call.iv).toBeGreaterThan(0);
    }
  });

  it("keeps the requested expiry when it exists", () => {
    expect(expiryFor("SPY", "2026-12-18").iso).toBe("2026-12-18");
    expect(expiryFor("SPY", "1999-01-01")).toBe(EXPIRIES[3]);
  });

  it("returns the strike unchanged without listed strikes", () => {
    expect(snapStrike("SPY", "2026-12-18", 733.3)).toBe(733.3);
  });

  it("creates legs with unique ids and rounded IV", () => {
    const first = makeLeg("call", 1, 1, 100, "2026-12-18", 3.456, "SPY", 0.23456);
    const second = makeLeg("put", -1, 2, 90, "2026-12-18", 1.2, "SPY", 0);
    expect(first.id).not.toBe(second.id);
    expect(first.iv).toBe(0.2346);
    expect(second.iv).toBeUndefined();
    expect(first.dte).toBe(42);
  });

  it("fills buys at the ask and sells at the bid", () => {
    const spy = ticker("SPY");
    const buy = pricedLeg(spy, "call", 1, 1, 736, "2026-12-18");
    const sell = pricedLeg(spy, "call", -1, 1, 736, "2026-12-18");
    expect(buy.fill).toBeGreaterThanOrEqual(sell.fill);
    expect(buy.fill).toBeGreaterThan(0);
  });

  it("fills stock legs at spot", () => {
    const spy = ticker("SPY");
    const leg = pricedLeg(spy, "stock", 1, 1, spy.spot, "2026-12-18");
    expect(leg.kind).toBe("stock");
    expect(leg.fill).toBe(spy.spot);
    expect(leg.strike).toBe(spy.spot);
  });
});

describe("execution", () => {
  const iso = isoIn(30);
  const call = (side: 1 | -1, strike: number, qty = 1, expiry = iso) => ({
    id: `c-${side}-${strike}`,
    kind: "call" as const,
    side,
    qty,
    strike,
    expiry,
    dte: daysUntil(expiry),
    fill: 1,
    iv: 0.2,
  });
  const stock = (qty: number) => ({
    id: "s",
    kind: "stock" as const,
    side: 1 as const,
    qty,
    strike: 100,
    expiry: iso,
    dte: 0,
    fill: 100,
  });

  it("counts option contracts for fees, not stock", () => {
    expect(sideFees([call(1, 110), call(-1, 120, 2), stock(1)])).toBeCloseTo(3 * 0.69, 6);
    expect(sideFees([stock(5)])).toBe(0);
  });

  it("closes longs at the bid and shorts at the ask", () => {
    const quote = makeQuote({ bid: 1.2, ask: 1.4, mid: 1.3 });
    expect(closePrice(call(1, 110), quote, 1.3)).toBe(1.2);
    expect(closePrice(call(-1, 110), quote, 1.3)).toBe(1.4);
    expect(closePrice(call(1, 110), { ...quote, bid: 0 }, 1.3)).toBe(1.3);
    expect(closePrice(call(1, 110), undefined, 1.3)).toBe(1.3);
    expect(closePrice(stock(1), quote, 1.3)).toBe(1.3);
  });

  it("estimates a naked short with the Reg T formula", () => {
    const short = call(-1, 110);
    const premium = legPrice(short, 100, Math.max(daysUntil(iso), 0.5) / 365, 0.2);
    const result = estimateMargin([short], 100, 0.2);
    const per = Math.max(0.2 * 100 - 10 + premium, 0.1 * 100 + premium);
    expect(result.kind).toBe("naked");
    expect(result.requirement).toBe(Math.round(per * 100));
  });

  it("nets a vertical into its strike width less credit", () => {
    const short = call(-1, 110);
    const long = call(1, 120);
    const T = Math.max(daysUntil(iso), 0.5) / 365;
    const credit = (legPrice(short, 100, T, 0.2) - legPrice(long, 100, T, 0.2)) * 100;
    const result = estimateMargin([short, long], 100, 0.2);
    expect(result.kind).toBe("defined");
    expect(result.requirement).toBe(Math.round(Math.max(0, 1000 - credit)));
    expect(result.crossExpiry).toBe(false);
  });

  it("treats long stock as covered-call cover", () => {
    const result = estimateMargin([call(-1, 110), stock(1)], 100, 0.2);
    expect(result.requirement).toBe(0);
    expect(result.stockExcluded).toBe(true);
    expect(result.kind).toBe("defined");
  });

  it("reports cross-expiry legs and empty books", () => {
    const spread = estimateMargin([call(-1, 110), call(1, 120, 1, isoIn(60))], 100, 0.2);
    expect(spread.crossExpiry).toBe(true);
    const none = estimateMargin([stock(1)], 100, 0.2);
    expect(none.kind).toBe("none");
    expect(none.requirement).toBe(0);
  });
});

describe("market session", () => {
  it("is open during regular hours", () => {
    // 2026-11-16 14:30 UTC = 09:30 EST
    const status = usMarketStatus(new Date("2026-11-16T14:30:00Z"));
    expect(status.open).toBe(true);
    expect(status.detail).toContain("09:30");
  });

  it("is closed before the open", () => {
    const status = usMarketStatus(new Date("2026-11-16T13:00:00Z"));
    expect(status.open).toBe(false);
    expect(status.detail).toContain("今日 9:30 开盘");
  });

  it("is closed after the close", () => {
    const status = usMarketStatus(new Date("2026-11-16T21:30:00Z"));
    expect(status.open).toBe(false);
    expect(status.detail).toContain("下个交易日");
  });

  it("is closed on weekends", () => {
    const status = usMarketStatus(new Date("2026-11-14T15:00:00Z"));
    expect(status.open).toBe(false);
    expect(status.detail).toContain("周末");
  });
});

describe("vol surface", () => {
  const spot = 100;
  const front = isoIn(7);
  const mid = isoIn(45);
  const back = isoIn(120);

  const chain = (() => {
    const legs: {
      iso: string;
      kind: "call" | "put";
      strike: number;
      quote: { iv: number; delta: number };
    }[] = [];
    const add = (iso: string) => {
      // ATM 100, 25-delta call 110, 25-delta put 90.
      legs.push(
        { iso, kind: "call", strike: 100, quote: { iv: 0.2, delta: 0.52 } },
        { iso, kind: "put", strike: 100, quote: { iv: 0.21, delta: -0.5 } },
        { iso, kind: "call", strike: 110, quote: { iv: 0.22, delta: 0.25 } },
        { iso, kind: "put", strike: 90, quote: { iv: 0.3, delta: -0.25 } },
      );
    };
    add(front);
    add(mid);
    add(back);
    return makeChain("TEST", spot, legs);
  })();

  it("reads ATM, 25-delta wings and their combinations", () => {
    const surface = computeVolSurface(chain);
    expect(surface.expiries).toHaveLength(3);
    const row = surface.expiries.find((item) => item.iso === mid)!;
    expect(row.atm).toBeCloseTo(0.205, 6);
    expect(row.atmStrike).toBe(100);
    expect(row.call25).toBeCloseTo(0.22, 6);
    expect(row.put25).toBeCloseTo(0.3, 6);
    expect(row.rr).toBeCloseTo(-0.08, 6);
    expect(row.fly).toBeCloseTo(0.055, 6);
    expect(row.quotes).toBe(4);
  });

  it("uses the expiry nearest 90 days for the back leg", () => {
    const surface = computeVolSurface(chain);
    expect(surface.front?.iso).toBe(front);
    expect(surface.back?.iso).toBe(back);
    expect(surface.slope).toBeCloseTo(0, 6);
  });

  it("builds an out-of-the-money skew", () => {
    const points = computeSkew(chain, mid);
    expect(points.map((point) => point.strike)).toEqual([90, 100, 110]);
    expect(points.map((point) => point.kind)).toEqual(["put", "call", "call"]);
  });

  it("caps the skew to the points nearest spot", () => {
    const points = computeSkew(chain, mid, 2);
    expect(points).toHaveLength(2);
    expect(points.map((point) => point.strike)).toEqual([90, 100]);
  });

  it("formats vol points without negative zero", () => {
    expect(volPoints(0.07)).toBe("+7.0 点");
    expect(volPoints(-0.07)).toBe("−7.0 点");
    expect(volPoints(-0.0004)).toBe("0.0 点");
    expect(volPoints(0)).toBe("0.0 点");
  });

  it("names the term shape", () => {
    expect(termShape(0.01)).toBe("正向期限结构");
    expect(termShape(-0.01)).toBe("倒挂期限结构");
    expect(termShape(0)).toBe("平坦期限结构");
    expect(termShape(null)).toBe("数据不足");
  });
});

describe("presets", () => {
  const spy = ticker("SPY");
  const iso = "2026-12-18";

  it("builds every preset with priced legs", () => {
    for (const preset of PRESETS) {
      const legs = preset.build(spy, iso);
      expect(legs.length).toBeGreaterThan(0);
      for (const leg of legs) {
        expect(leg.fill).toBeGreaterThan(0);
        if (leg.kind !== "stock") expect(leg.iv).toBeGreaterThan(0);
      }
    }
  });

  it("spans two expiries for the calendar", () => {
    const legs = PRESET_BY_KEY.calendar.build(spy, iso);
    expect(legs).toHaveLength(2);
    expect(legs[0].expiry).not.toBe(legs[1].expiry);
  });

  it("returns nothing for an unknown key", () => {
    expect(legsFor("nope", spy, iso)).toEqual([]);
  });

  it("only lists keys that exist", () => {
    for (const group of CHIP_GROUPS) {
      for (const key of group.keys) expect(PRESET_BY_KEY[key]).toBeDefined();
    }
  });
});
