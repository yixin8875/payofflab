import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeDraft, encodeDraft, type StrategyDraft } from "./draft";
import type { Leg } from "./options";
import { isoIn } from "./test-fixtures";
import {
  WATCHLIST_EVENT,
  addGroup,
  addSymbol,
  countSymbols,
  deleteGroup,
  groupsForSymbol,
  readWatchlist,
  removeSymbol,
  renameGroup,
  toggleSymbol,
  type WatchGroup,
} from "./watchlist";

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

const draft = (over: Partial<StrategyDraft> = {}): StrategyDraft => ({
  name: "牛市价差",
  symbol: "spy",
  expiry: isoIn(30),
  legs: [leg(), leg({ id: "l2", kind: "put", side: -1, strike: 95 })],
  ...over,
});

describe("draft encoding", () => {
  it("round-trips a UTF-8 draft through base64url", () => {
    const encoded = encodeDraft(draft());
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeDraft(encoded)!;
    expect(decoded.name).toBe("牛市价差");
    expect(decoded.symbol).toBe("SPY");
    expect(decoded.legs).toHaveLength(2);
    expect(decoded.legs[0]).toEqual(leg());
  });

  it("rejects missing or malformed input", () => {
    expect(decodeDraft(null)).toBeNull();
    expect(decodeDraft("")).toBeNull();
    expect(decodeDraft("###")).toBeNull();
    expect(decodeDraft(btoa("null"))).toBeNull();
  });

  it("rejects drafts that fail validation", () => {
    expect(decodeDraft(encodeDraft(draft({ legs: [] })))).toBeNull();
    expect(decodeDraft(encodeDraft(draft({ symbol: "spy!" })))).toBeNull();
    expect(decodeDraft(encodeDraft(draft({ expiry: "12/18/2026" })))).toBeNull();
    expect(
      decodeDraft(encodeDraft(draft({ legs: [leg(), { id: "bad" } as Leg] }))),
    ).toBeNull();
    const many = Array.from({ length: 9 }, (_, index) => leg({ id: `l${index}` }));
    expect(decodeDraft(encodeDraft(draft({ legs: many })))).toBeNull();
  });

  it("truncates long names", () => {
    const decoded = decodeDraft(encodeDraft(draft({ name: "长".repeat(120) })))!;
    expect(decoded.name).toHaveLength(80);
  });
});

describe("watchlist", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("seeds default groups when storage is empty or broken", () => {
    expect(readWatchlist().map((group) => group.id)).toEqual(["g_index", "g_growth"]);
    localStorage.setItem("payoff:watchlist", "{oops");
    expect(readWatchlist()).toHaveLength(2);
    localStorage.setItem("payoff:watchlist", "{}");
    expect(readWatchlist()).toHaveLength(2);
  });

  it("keeps an explicitly empty list and filters invalid groups", () => {
    localStorage.setItem("payoff:watchlist", "[]");
    expect(readWatchlist()).toEqual([]);
    localStorage.setItem(
      "payoff:watchlist",
      JSON.stringify([
        { id: "ok", name: "Mine", symbols: ["SPY"] },
        { id: "bad", name: "Bad", symbols: ["spy"] },
        { id: "bad2", name: "Bad", symbols: "SPY" },
        null,
      ]),
    );
    expect(readWatchlist()).toEqual([{ id: "ok", name: "Mine", symbols: ["SPY"] }]);
  });

  it("adds a group with a cleaned name and symbol", () => {
    const group = addGroup("  我的   自选  ", "spy")!;
    expect(group.name).toBe("我的 自选");
    expect(group.symbols).toEqual(["SPY"]);
    expect(readWatchlist().at(-1)?.id).toBe(group.id);
    expect(addGroup("   ")).toBeNull();
    expect(addGroup("No code", "not a symbol")).toMatchObject({ symbols: [] });
  });

  it("caps the number of groups", () => {
    const groups = Array.from({ length: 24 }, (_, index) => ({
      id: `g${index}`,
      name: `G${index}`,
      symbols: [],
    }));
    localStorage.setItem("payoff:watchlist", JSON.stringify(groups));
    expect(addGroup("Extra")).toBeNull();
  });

  it("renames and deletes groups", () => {
    const group = addGroup("Old")!;
    renameGroup(group.id, "  New   name ");
    expect(readWatchlist().find((item) => item.id === group.id)?.name).toBe("New name");
    renameGroup(group.id, "   ");
    expect(readWatchlist().find((item) => item.id === group.id)?.name).toBe("New name");
    deleteGroup(group.id);
    expect(readWatchlist().some((item) => item.id === group.id)).toBe(false);
  });

  it("adds and removes symbols without duplicates", () => {
    const group = addGroup("Mine")!;
    expect(addSymbol(group.id, " qqq ")).toBe(true);
    expect(addSymbol(group.id, "QQQ")).toBe(false);
    expect(addSymbol(group.id, "bad code")).toBe(false);
    expect(addSymbol("nope", "SPY")).toBe(false);
    expect(readWatchlist().find((item) => item.id === group.id)?.symbols).toEqual(["QQQ"]);
    removeSymbol(group.id, "qqq");
    expect(readWatchlist().find((item) => item.id === group.id)?.symbols).toEqual([]);
  });

  it("caps symbols per group", () => {
    const symbols = Array.from({ length: 80 }, (_, index) => `S${index}`);
    const group: WatchGroup = { id: "full", name: "Full", symbols };
    localStorage.setItem("payoff:watchlist", JSON.stringify([group]));
    expect(addSymbol("full", "SPY")).toBe(false);
  });

  it("toggles a symbol and reports the new state", () => {
    const group = addGroup("Mine")!;
    expect(toggleSymbol(group.id, "spy")).toBe(true);
    expect(toggleSymbol(group.id, "spy")).toBe(false);
    expect(toggleSymbol("nope", "SPY")).toBe(false);
  });

  it("finds groups and counts unique symbols", () => {
    const groups: WatchGroup[] = [
      { id: "a", name: "A", symbols: ["SPY", "QQQ"] },
      { id: "b", name: "B", symbols: ["SPY"] },
    ];
    expect(groupsForSymbol(groups, " spy ").map((group) => group.id)).toEqual(["a", "b"]);
    expect(countSymbols(groups)).toBe(2);
    expect(countSymbols([])).toBe(0);
  });

  it("broadcasts changes", () => {
    const listener = vi.fn();
    window.addEventListener(WATCHLIST_EVENT, listener);
    addGroup("Mine");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
