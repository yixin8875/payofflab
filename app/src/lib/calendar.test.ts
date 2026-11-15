import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_KIND_LABEL,
  addEvent,
  daysToEvent,
  deleteEvent,
  eventLabel,
  eventsForSymbol,
  eventsUntil,
  lastEarningsSync,
  nextEvent,
  readEvents,
  syncEarnings,
  todayIso,
  type MarketEvent,
} from "./events";
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
}

const eventOf = (over: Partial<MarketEvent> = {}): MarketEvent => ({
  id: "e1",
  symbol: "AAPL",
  iso: isoIn(5),
  kind: "earnings",
  note: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  source: "manual",
  ...over,
});

const nextWeekday = (): string => {
  const date = new Date();
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

describe("event store", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts empty and survives corrupt storage", () => {
    expect(readEvents()).toEqual([]);
    localStorage.setItem("payoff:events", "{oops");
    expect(readEvents()).toEqual([]);
    localStorage.setItem("payoff:events", "[]");
    expect(readEvents()).toEqual([]);
  });

  it("filters invalid entries, normalizes sources and sorts by date", () => {
    localStorage.setItem(
      "payoff:events",
      JSON.stringify([
        eventOf({ id: "late", iso: isoIn(20), source: "nasdaq" }),
        eventOf({ id: "early", iso: isoIn(2), source: undefined }),
        { id: "bad", symbol: "AAPL", iso: "11/20/2026", kind: "earnings" },
        { id: "kind", symbol: "AAPL", iso: isoIn(2), kind: "holiday", note: "", createdAt: "x" },
      ]),
    );
    const events = readEvents();
    expect(events.map((event) => event.id)).toEqual(["early", "late"]);
    expect(events[0].source).toBe("manual");
    expect(events[1].source).toBe("nasdaq");
  });

  it("adds a manual event and rejects invalid input", () => {
    const added = addEvent({ symbol: " aapl ", iso: isoIn(5), kind: "earnings", note: "  AMC " })!;
    expect(added.symbol).toBe("AAPL");
    expect(added.note).toBe("AMC");
    expect(added.source).toBe("manual");
    expect(readEvents()).toHaveLength(1);
    expect(addEvent({ symbol: "", iso: isoIn(5), kind: "earnings" })).toBeNull();
    expect(addEvent({ symbol: "AAPL", iso: "2026-11-20", kind: "nope" as never })).toBeNull();
  });

  it("lets a manual event replace the matching auto event", () => {
    localStorage.setItem(
      "payoff:events",
      JSON.stringify([eventOf({ id: "auto", source: "nasdaq" })]),
    );
    addEvent({ symbol: "AAPL", iso: isoIn(5), kind: "earnings" });
    const events = readEvents();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("manual");
  });

  it("dismisses a deleted auto event so a sync cannot restore it", () => {
    localStorage.setItem(
      "payoff:events",
      JSON.stringify([eventOf({ id: "auto", source: "nasdaq" })]),
    );
    deleteEvent("auto");
    expect(readEvents()).toEqual([]);
    expect(JSON.parse(localStorage.getItem("payoff:event-dismissed")!)).toEqual([
      { symbol: "AAPL", iso: isoIn(5), kind: "earnings" },
    ]);
  });

  it("filters events by symbol, window and next date", () => {
    const today = todayIso();
    const events = [
      eventOf({ id: "a", iso: isoIn(0) }),
      eventOf({ id: "b", iso: isoIn(10) }),
      eventOf({ id: "c", iso: isoIn(40) }),
      eventOf({ id: "d", symbol: "ALL", iso: isoIn(3) }),
      eventOf({ id: "e", symbol: "MSFT", iso: isoIn(1) }),
      eventOf({ id: "f", iso: isoIn(-2) }),
    ];
    expect(eventsForSymbol(events, "aapl").map((event) => event.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "f",
    ]);
    expect(eventsUntil(events, "AAPL", isoIn(20)).map((event) => event.id)).toEqual([
      "a",
      "b",
      "d",
    ]);
    expect(nextEvent(events, "AAPL")?.id).toBe("a");
    // Market-wide ("ALL") events also apply to a symbol, and come first here.
    expect(nextEvent(events, "MSFT")?.id).toBe("d");
    expect(daysToEvent(eventOf({ iso: isoIn(4) }))).toBe(4);
    expect(eventLabel(eventOf({ iso: isoIn(4), kind: "dividend" }))).toMatch(
      new RegExp(`^\\d+月\\d+日 ${EVENT_KIND_LABEL.dividend}$`),
    );
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

const rowsFor = (symbol: string, time = "time-after-hours") => ({
  data: { rows: [{ symbol, name: "Test Inc.", time }] },
});

const respond = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("syncEarnings", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("imports confirmed dates and reports progress", async () => {
    const fetchMock = vi.fn(async () => respond(rowsFor("AAPL")));
    vi.stubGlobal("fetch", fetchMock);
    const progress = vi.fn();
    const result = await syncEarnings([" aapl ", "AAPL"], progress);
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.updated).toBeGreaterThan(0);
    expect(result.scanned).toBeGreaterThan(0);
    expect(result.missing).toEqual([]);
    expect(progress).toHaveBeenCalledWith(1, result.scanned);

    const events = readEvents();
    expect(events.length).toBe(result.updated);
    expect(events.every((event) => event.source === "nasdaq")).toBe(true);
    expect(events[0].note).toContain("盘后");
    expect(lastEarningsSync()).toMatchObject({
      symbols: ["AAPL"],
      scanned: result.scanned,
      complete: true,
    });
  });

  it("keeps user dismissals and manual entries", async () => {
    const weekday = nextWeekday();
    localStorage.setItem(
      "payoff:event-dismissed",
      JSON.stringify([{ symbol: "AAPL", iso: weekday, kind: "earnings" }]),
    );
    vi.stubGlobal("fetch", vi.fn(async () => respond(rowsFor("AAPL"))));
    const result = await syncEarnings(["AAPL"]);
    expect(result.dismissed).toContain("AAPL");
    expect(readEvents().some((event) => event.iso === weekday)).toBe(false);
  });

  it("does not duplicate a manual date", async () => {
    addEvent({ symbol: "AAPL", iso: nextWeekday(), kind: "earnings", note: "manual" });
    vi.stubGlobal("fetch", vi.fn(async () => respond(rowsFor("AAPL"))));
    await syncEarnings(["AAPL"]);
    const events = readEvents();
    const manual = events.filter((event) => event.source === "manual");
    expect(manual).toHaveLength(1);
    expect(events.filter((event) => event.iso === manual[0].iso)).toHaveLength(1);
  });

  it("keeps old auto events when a scan fails partway", async () => {
    localStorage.setItem(
      "payoff:events",
      JSON.stringify([eventOf({ id: "auto", source: "nasdaq", iso: isoIn(10) })]),
    );
    vi.stubGlobal("fetch", vi.fn(async () => respond({}, 500)));
    const result = await syncEarnings(["AAPL"]);
    expect(result.complete).toBe(false);
    expect(result.failed).toBe(result.scanned);
    expect(result.missing).toContain("AAPL");
    expect(readEvents().some((event) => event.id === "auto")).toBe(true);
  });

  it("requires at least one symbol", async () => {
    await expect(syncEarnings(["  ", "ALL"])).rejects.toThrow("没有可同步的标的");
  });

  it("reads a missing or invalid sync state as null", () => {
    expect(lastEarningsSync()).toBeNull();
    localStorage.setItem("payoff:event-sync", "{oops");
    expect(lastEarningsSync()).toBeNull();
    localStorage.setItem("payoff:event-sync", JSON.stringify({ at: "x", symbols: [1, "AAPL"] }));
    expect(lastEarningsSync()).toMatchObject({ symbols: ["AAPL"], scanned: 0, complete: false });
  });
});
