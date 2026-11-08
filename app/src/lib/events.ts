import { useEffect, useState } from "react";
import { daysUntil } from "./live";

export type EventKind = "earnings" | "macro" | "dividend" | "other";

export type EventSource = "manual" | "nasdaq";

export type MarketEvent = {
  id: string;
  /** Uppercase ticker, or "ALL" for a market-wide event. */
  symbol: string;
  /** Calendar date, YYYY-MM-DD. */
  iso: string;
  kind: EventKind;
  note: string;
  createdAt: string;
  /** Auto events are replaced by the next sync; manual entries are never touched. */
  source?: EventSource;
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  earnings: "财报",
  macro: "宏观",
  dividend: "分红",
  other: "其他",
};

const KEY = "payoff:events";
const SYNC_KEY = "payoff:event-sync";
const DISMISS_KEY = "payoff:event-dismissed";
export const EVENTS_EVENT = "payoff:events-changed";

/** Nasdaq only publishes the next ~6 weeks of confirmed dates. */
const HORIZON_DAYS = 60;
const MAX_SYMBOLS = 24;
const FETCH_CONCURRENCY = 6;

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isKind(value: unknown): value is EventKind {
  return value === "earnings" || value === "macro" || value === "dividend" || value === "other";
}

function isEvent(value: unknown): value is MarketEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<MarketEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.symbol === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.iso ?? "") &&
    isKind(event.kind) &&
    typeof event.note === "string" &&
    typeof event.createdAt === "string"
  );
}

export function readEvents(): MarketEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEvent)
      .map(
        (event): MarketEvent => ({
          ...event,
          source: event.source === "nasdaq" ? "nasdaq" : "manual",
        }),
      )
      .sort((a, b) => a.iso.localeCompare(b.iso));
  } catch {
    return [];
  }
}

function persist(events: MarketEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // Quota errors leave the in-memory view usable for this session.
  }
  window.dispatchEvent(new Event(EVENTS_EVENT));
}

type DismissedEvent = { symbol: string; iso: string; kind?: EventKind };

function readDismissed(): DismissedEvent[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is DismissedEvent => {
      if (!value || typeof value !== "object") return false;
      const item = value as Partial<DismissedEvent>;
      return (
        typeof item.symbol === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.iso ?? "") &&
        (item.kind === undefined || isKind(item.kind))
      );
    });
  } catch {
    return [];
  }
}

function writeDismissed(list: DismissedEvent[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(list));
  } catch {
    // Dismissals are a convenience; a full quota should not break the calendar.
  }
}

/** Keep a deleted event from reappearing on the next sync. */
function dismissEvent(event: MarketEvent) {
  const today = todayIso();
  const list = readDismissed().filter((item) => item.iso >= today);
  const exists = list.some(
    (item) =>
      item.symbol === event.symbol &&
      item.iso === event.iso &&
      item.kind === event.kind,
  );
  if (!exists) {
    writeDismissed(
      [...list, { symbol: event.symbol, iso: event.iso, kind: event.kind }].slice(-200),
    );
  }
}

function clearDismissed(symbol: string, iso: string, kind: EventKind) {
  const list = readDismissed();
  const next = list.filter(
    (item) => !(item.symbol === symbol && item.iso === iso && item.kind === kind),
  );
  if (next.length !== list.length) writeDismissed(next);
}

export function addEvent(input: {
  symbol: string;
  iso: string;
  kind: EventKind;
  note?: string;
}): MarketEvent | null {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(input.iso)) return null;
  if (!isKind(input.kind)) return null;
  const event: MarketEvent = {
    id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    iso: input.iso,
    kind: input.kind,
    note: (input.note ?? "").trim(),
    createdAt: new Date().toISOString(),
    source: "manual",
  };
  // A manual entry for the same symbol/date/kind wins over an auto one.
  const events = readEvents().filter(
    (item) =>
      !(
        item.source === "nasdaq" &&
        item.symbol === symbol &&
        item.iso === input.iso &&
        item.kind === input.kind
      ),
  );
  clearDismissed(symbol, input.iso, input.kind);
  persist([...events, event]);
  return event;
}

export function deleteEvent(id: string) {
  const events = readEvents();
  const target = events.find((event) => event.id === id);
  if (target) dismissEvent(target);
  persist(events.filter((event) => event.id !== id));
}

export function useEvents(): MarketEvent[] {
  const [events, setEvents] = useState<MarketEvent[]>(() => readEvents());

  useEffect(() => {
    const sync = () => setEvents(readEvents());
    window.addEventListener(EVENTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return events;
}

export function eventsForSymbol(events: MarketEvent[], symbol: string): MarketEvent[] {
  const upper = symbol.toUpperCase();
  return events.filter((event) => event.symbol === upper || event.symbol === "ALL");
}

/** Events from today through the given expiry date, inclusive. */
export function eventsUntil(
  events: MarketEvent[],
  symbol: string,
  iso: string,
): MarketEvent[] {
  const today = todayIso();
  return eventsForSymbol(events, symbol).filter(
    (event) => event.iso >= today && event.iso <= iso,
  );
}

export function nextEvent(
  events: MarketEvent[],
  symbol: string,
): MarketEvent | undefined {
  const today = todayIso();
  return eventsForSymbol(events, symbol).find((event) => event.iso >= today);
}

export function daysToEvent(event: MarketEvent): number {
  return daysUntil(event.iso);
}

export function eventLabel(event: MarketEvent): string {
  const [, month, day] = event.iso.split("-").map(Number);
  return `${month}月${day}日 ${EVENT_KIND_LABEL[event.kind]}`;
}

export type EarningsSyncState = {
  at: string;
  symbols: string[];
  scanned: number;
  complete: boolean;
};

export type EarningsSyncResult = {
  updated: number;
  missing: string[];
  /** Symbols whose date was found but had been deleted by the user. */
  dismissed: string[];
  failed: number;
  scanned: number;
  complete: boolean;
};

type NasdaqRow = { symbol?: string; name?: string; time?: string };
type NasdaqDay = { data?: { rows?: NasdaqRow[] | null } | null };

const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function isoOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Weekdays only: US companies report earnings Monday through Friday. */
function scanDates(days: number): string[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    dates.push(isoOf(date));
  }
  return dates;
}

async function fetchEarningsDay(iso: string): Promise<NasdaqRow[]> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const text = await invoke<string>("fetch_earnings_day", { date: iso });
    const payload = JSON.parse(text) as NasdaqDay;
    return Array.isArray(payload.data?.rows) ? payload.data.rows : [];
  }
  const response = await fetch(`/nasdaq/api/calendar/earnings?date=${iso}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`财报日历返回 ${response.status}`);
  const payload = (await response.json()) as NasdaqDay;
  return Array.isArray(payload.data?.rows) ? payload.data.rows : [];
}

function timingLabel(time: string | undefined): string {
  if (time === "time-pre-market") return "盘前";
  if (time === "time-after-hours") return "盘后";
  return "时间未定";
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await task(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export function lastEarningsSync(): EarningsSyncState | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EarningsSyncState>;
    if (typeof parsed.at !== "string" || !Array.isArray(parsed.symbols)) {
      return null;
    }
    return {
      at: parsed.at,
      symbols: parsed.symbols.filter(
        (value): value is string => typeof value === "string",
      ),
      scanned: typeof parsed.scanned === "number" ? parsed.scanned : 0,
      complete: parsed.complete === true,
    };
  } catch {
    return null;
  }
}

/**
 * Replace auto earnings events for the supplied symbols with the dates Nasdaq
 * has confirmed. Manual events (and auto events for other symbols) are kept.
 */
export async function syncEarnings(
  symbols: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<EarningsSyncResult> {
  const list = [
    ...new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol && symbol !== "ALL"),
    ),
  ].slice(0, MAX_SYMBOLS);
  if (!list.length) throw new Error("没有可同步的标的");

  const wanted = new Set(list);
  const dates = scanDates(HORIZON_DAYS);
  const today = todayIso();
  const dismissed = new Set(
    readDismissed()
      .filter((item) => item.kind === undefined || item.kind === "earnings")
      .map((item) => `${item.symbol}|${item.iso}`),
  );
  const found = new Map<string, MarketEvent>();
  const skipped = new Set<string>();
  let done = 0;
  let failed = 0;

  await mapLimit(dates, FETCH_CONCURRENCY, async (iso) => {
    try {
      const rows = await fetchEarningsDay(iso);
      for (const row of rows) {
        const symbol = (row.symbol ?? "").trim().toUpperCase();
        if (!wanted.has(symbol)) continue;
        if (iso < today) continue;
        const key = `${symbol}|${iso}`;
        if (dismissed.has(key)) {
          skipped.add(symbol);
          continue;
        }
        if (found.has(key)) continue;
        found.set(key, {
          id: `auto_${symbol}_${iso}`,
          symbol,
          iso,
          kind: "earnings",
          note: `纳斯达克日历 · ${timingLabel(row.time)}`,
          createdAt: new Date().toISOString(),
          source: "nasdaq",
        });
      }
    } catch {
      failed += 1;
    } finally {
      done += 1;
      onProgress?.(done, dates.length);
    }
  });

  const existing = readEvents();
  const manualKeys = new Set(
    existing
      .filter((event) => event.source !== "nasdaq")
      .map((event) => `${event.symbol}|${event.iso}|${event.kind}`),
  );
  const foundSymbols = new Set([...found.values()].map((event) => event.symbol));
  const synced = new Set(list);
  const kept = existing.filter((event) => {
    if (event.source !== "nasdaq") return true;
    if (event.iso < today) return false;
    if (!synced.has(event.symbol)) return true;
    if (failed === 0) return false;
    // A partial scan must not erase a date it only failed to fetch.
    return !foundSymbols.has(event.symbol);
  });
  const additions = [...found.values()].filter(
    (event) => !manualKeys.has(`${event.symbol}|${event.iso}|${event.kind}`),
  );
  persist([...kept, ...additions]);

  const state: EarningsSyncState = {
    at: new Date().toISOString(),
    symbols: list,
    scanned: dates.length,
    complete: failed === 0,
  };
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(state));
  } catch {
    // The events themselves are already persisted.
  }

  return {
    updated: additions.length,
    missing: list.filter(
      (symbol) => !foundSymbols.has(symbol) && !skipped.has(symbol),
    ),
    dismissed: [...skipped],
    failed,
    scanned: dates.length,
    complete: failed === 0,
  };
}
