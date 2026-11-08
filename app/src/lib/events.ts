import { useEffect, useState } from "react";
import { daysUntil } from "./live";

export type EventKind = "earnings" | "macro" | "dividend" | "other";

export type MarketEvent = {
  id: string;
  /** Uppercase ticker, or "ALL" for a market-wide event. */
  symbol: string;
  /** Calendar date, YYYY-MM-DD. */
  iso: string;
  kind: EventKind;
  note: string;
  createdAt: string;
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  earnings: "财报",
  macro: "宏观",
  dividend: "分红",
  other: "其他",
};

const KEY = "payoff:events";
export const EVENTS_EVENT = "payoff:events-changed";

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
  };
  persist([...readEvents(), event]);
  return event;
}

export function deleteEvent(id: string) {
  persist(readEvents().filter((event) => event.id !== id));
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
