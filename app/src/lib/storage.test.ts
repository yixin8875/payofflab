import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedChain,
  daysUntil,
  expiriesFor,
  liveExpiry,
  liveQuote,
  liveRows,
  liveStrikes,
  loadLiveChain,
  quoteKey,
} from "./live";
import type { Leg } from "./options";
import {
  TRADES_EVENT,
  clearTrades,
  closeLeg,
  closeTrade,
  deleteTrade,
  hasOpenLegs,
  isLeg,
  openTrades,
  readTrades,
  saveTrade,
} from "./store";
import { isoIn } from "./test-fixtures";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
}

const leg = (over: Partial<Leg> = {}): Leg => ({
  id: "l1",
  kind: "call",
  side: 1,
  qty: 1,
  strike: 100,
  expiry: isoIn(30),
  dte: 30,
  fill: 2,
  iv: 0.2,
  ...over,
});

describe("store", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves and reads a trade in upper case", () => {
    const saved = saveTrade({ name: "Long", symbol: "spy", expiry: isoIn(30), legs: [leg()] });
    expect(saved.symbol).toBe("SPY");
    expect(saved.realized).toBe(0);
    expect(saved.openedAt).toBe(saved.savedAt);
    const [read] = readTrades();
    expect(read.id).toBe(saved.id);
    expect(read.legs[0]).toEqual(leg());
    expect(read.legs[0]).not.toBe(saved.legs[0]);
  });

  it("notifies listeners on persist", () => {
    const listener = vi.fn();
    window.addEventListener(TRADES_EVENT, listener);
    saveTrade({ name: "Long", symbol: "SPY", expiry: isoIn(30), legs: [leg()] });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("normalizes legacy entries and drops invalid ones", () => {
    const raw = [
      {
        id: "old",
        name: "Legacy",
        symbol: "qqq",
        expiry: isoIn(30),
        legs: [leg()],
        savedAt: "2026-01-01T00:00:00.000Z",
      },
      { id: 1, name: "broken" },
      {
        id: "empty",
        name: "Empty",
        symbol: "SPY",
        expiry: isoIn(30),
        savedAt: "x",
        legs: [{ id: "bad" }],
      },
    ];
    localStorage.setItem("payoff:trades", JSON.stringify(raw));
    const trades = readTrades();
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      id: "old",
      symbol: "QQQ",
      openedAt: "2026-01-01T00:00:00.000Z",
      realized: 0,
      events: [],
    });
  });

  it("survives corrupt or non-array storage", () => {
    localStorage.setItem("payoff:trades", "{oops");
    expect(readTrades()).toEqual([]);
    localStorage.setItem("payoff:trades", "{}");
    expect(readTrades()).toEqual([]);
  });

  it("validates leg shapes", () => {
    expect(isLeg(leg())).toBe(true);
    expect(isLeg({ ...leg(), side: 2 })).toBe(false);
    expect(isLeg({ ...leg(), qty: Number.NaN })).toBe(false);
    expect(isLeg(null)).toBe(false);
  });

  it("closes part of a leg and keeps the position open", () => {
    const saved = saveTrade({
      name: "Long",
      symbol: "SPY",
      expiry: isoIn(30),
      legs: [leg({ qty: 2 })],
    });
    const closed = closeLeg(saved.id, "l1", 1, 3)!;
    expect(closed.legs[0].qty).toBe(1);
    expect(closed.realized).toBe(100);
    expect(closed.events).toHaveLength(1);
    expect(closed.events[0]).toMatchObject({ legId: "l1", qty: 1, price: 3, realized: 100 });
    expect(closed.closedAt).toBeUndefined();
    expect(hasOpenLegs(closed)).toBe(true);
  });

  it("clamps the quantity and stamps the close time", () => {
    const saved = saveTrade({
      name: "Long",
      symbol: "SPY",
      expiry: isoIn(30),
      legs: [leg({ qty: 2 })],
    });
    const closed = closeLeg(saved.id, "l1", 9, 1.5)!;
    expect(closed.legs[0].qty).toBe(0);
    expect(closed.realized).toBe(-100);
    expect(closed.closedAt).toBeTruthy();
    expect(openTrades(readTrades())).toHaveLength(0);
  });

  it("rejects invalid closes", () => {
    const saved = saveTrade({ name: "Long", symbol: "SPY", expiry: isoIn(30), legs: [leg()] });
    expect(closeLeg(saved.id, "l1", 0, 3)).toBeNull();
    expect(closeLeg(saved.id, "l1", 1, Number.NaN)).toBeNull();
    expect(closeLeg("nope", "l1", 1, 3)).toBeNull();
    expect(closeTrade(saved.id, {})).toBeNull();
  });

  it("closes every remaining leg with supplied marks", () => {
    const saved = saveTrade({
      name: "Spread",
      symbol: "SPY",
      expiry: isoIn(30),
      legs: [leg(), leg({ id: "l2", kind: "put", side: -1, strike: 90, fill: 1 })],
    });
    const closed = closeTrade(saved.id, { l1: 3, l2: 0.5 })!;
    expect(closed.legs.every((item) => item.qty === 0)).toBe(true);
    expect(closed.realized).toBe(150);
    expect(closed.events).toHaveLength(2);
    expect(closed.closedAt).toBeTruthy();
  });

  it("deletes and clears trades", () => {
    const a = saveTrade({ name: "A", symbol: "SPY", expiry: isoIn(30), legs: [leg()] });
    saveTrade({ name: "B", symbol: "QQQ", expiry: isoIn(30), legs: [leg()] });
    expect(readTrades()).toHaveLength(2);
    deleteTrade(a.id);
    expect(readTrades()).toHaveLength(1);
    clearTrades();
    expect(readTrades()).toEqual([]);
  });
});

const occDate = (iso: string) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);

const payloadFor = (symbol: string, iso: string, pastIso: string) => ({
  timestamp: "2026-11-15 20:00:00",
  data: {
    symbol,
    current_price: 100,
    price_change: 1,
    price_change_percent: 1,
    iv30: 20,
    options: [
      {
        option: `${symbol}${occDate(iso)}C00100000`,
        bid: 3,
        ask: 3.2,
        iv: 0.2,
        delta: 0.52,
        gamma: 0.02,
        theta: -0.03,
        vega: 0.1,
        open_interest: 1000,
        volume: 120,
        last_trade_price: 3.1,
      },
      {
        option: `${symbol}${occDate(iso)}P00100000`,
        bid: 2.9,
        ask: 3.1,
        iv: 0.21,
        delta: -0.48,
        gamma: 0.02,
        theta: -0.03,
        vega: 0.1,
        open_interest: 900,
        volume: 80,
        last_trade_price: 3,
      },
      { option: `B1${symbol}${occDate(iso)}C00100000`, bid: 1, ask: 1.2 },
      { option: `${symbol}${occDate(pastIso)}C00100000`, bid: 1, ask: 1.2 },
      { option: "NOT-AN-OCC" },
    ],
  },
});

const respond = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("live", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("measures calendar days until expiry", () => {
    expect(daysUntil(isoIn(0))).toBe(0);
    expect(daysUntil(isoIn(3))).toBe(3);
    expect(daysUntil(isoIn(-2))).toBe(-2);
    expect(daysUntil("bad")).toBe(0);
  });

  it("formats quote keys at three decimals", () => {
    expect(quoteKey("2026-12-18", "call", 100)).toBe("2026-12-18|call|100.000");
  });

  it("parses a delayed chain and caches it", async () => {
    const iso = isoIn(30);
    const fetchMock = vi.fn(async () => respond(payloadFor("TESTA", iso, isoIn(-1))));
    vi.stubGlobal("fetch", fetchMock);

    const chain = await loadLiveChain("testa");
    expect(chain.symbol).toBe("TESTA");
    expect(chain.spot).toBe(100);
    expect(chain.changePct).toBeCloseTo(0.01, 8);
    expect(chain.iv30).toBeCloseTo(0.2, 8);
    expect(chain.expiries).toHaveLength(1);
    expect(chain.expiries[0].iso).toBe(iso);
    expect(chain.quotes.size).toBe(2);
    expect(chain.quotes.get(quoteKey(iso, "call", 100))?.mid).toBeCloseTo(3.1, 6);
    expect(chain.asOf).not.toBe("最近收盘");

    expect(cachedChain("TESTA")).toBe(chain);
    expect(expiriesFor("TESTA")).toBe(chain.expiries);
    expect(liveExpiry("TESTA", iso)?.dte).toBe(30);
    expect(liveQuote("TESTA", "put", 100, iso)?.iv).toBeCloseTo(0.21, 8);
    expect(liveStrikes("TESTA", iso)).toEqual([100]);

    const rows = liveRows(chain, iso, 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].call.bid).toBe(3);
    expect(rows[0].put.ask).toBe(3.1);

    const again = await loadLiveChain("TESTA");
    expect(again).toBe(chain);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadLiveChain("TESTA", true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports an unavailable symbol", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond({}, 404)));
    await expect(loadLiveChain("TESTB")).rejects.toThrow("该标的没有在线期权数据");
  });

  it("reports an empty payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond({ data: {} })));
    await expect(loadLiveChain("TESTC")).rejects.toThrow("没有可用的在线期权数据");
  });

  it("reports a payload with no future expiries", async () => {
    const past = isoIn(-3);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond({
          data: {
            symbol: "TESTD",
            current_price: 100,
            options: [{ option: `TESTD${occDate(past)}C00100000`, bid: 1, ask: 1.1 }],
          },
        }),
      ),
    );
    await expect(loadLiveChain("TESTD")).rejects.toThrow("在线数据里没有未来到期日");
  });

  it("serves an empty row set for an unknown expiry", () => {
    const empty = {
      symbol: "X",
      spot: 1,
      change: 0,
      changePct: 0,
      iv30: 0,
      asOf: "test",
      expiries: [],
      quotes: new Map(),
    };
    expect(liveRows(empty, "x")).toEqual([]);
  });
});
