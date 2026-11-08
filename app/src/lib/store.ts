import { useEffect, useState } from "react";
import type { Leg } from "./options";

export type CloseEvent = {
  id: string;
  at: string;
  legId: string;
  qty: number;
  price: number;
  realized: number;
};

export type SavedTrade = {
  id: string;
  name: string;
  symbol: string;
  expiry: string;
  legs: Leg[];
  savedAt: string;
  /** When the position was opened. Older saved strategies use savedAt. */
  openedAt: string;
  /** Realized P&L from full or partial closes. */
  realized: number;
  /** Every close, kept so the position history survives partial exits. */
  events: CloseEvent[];
  closedAt?: string;
};

const KEY = "payoff:trades";
export const TRADES_EVENT = "payoff:trades-changed";

export function isLeg(value: unknown): value is Leg {
  if (!value || typeof value !== "object") return false;
  const leg = value as Partial<Leg>;
  return (
    typeof leg.id === "string" &&
    (leg.kind === "call" || leg.kind === "put" || leg.kind === "stock") &&
    (leg.side === 1 || leg.side === -1) &&
    typeof leg.qty === "number" &&
    Number.isFinite(leg.qty) &&
    typeof leg.strike === "number" &&
    Number.isFinite(leg.strike) &&
    typeof leg.expiry === "string" &&
    typeof leg.dte === "number" &&
    typeof leg.fill === "number" &&
    Number.isFinite(leg.fill)
  );
}

function isCloseEvent(value: unknown): value is CloseEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CloseEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.at === "string" &&
    typeof event.legId === "string" &&
    typeof event.qty === "number" &&
    typeof event.price === "number" &&
    typeof event.realized === "number"
  );
}

/** Accepts 1.3.0 strategies that predate the position fields. */
function normalize(value: unknown): SavedTrade | null {
  if (!value || typeof value !== "object") return null;
  const trade = value as Record<string, unknown>;
  if (
    typeof trade.id !== "string" ||
    typeof trade.name !== "string" ||
    typeof trade.symbol !== "string" ||
    typeof trade.expiry !== "string" ||
    typeof trade.savedAt !== "string" ||
    !Array.isArray(trade.legs)
  ) {
    return null;
  }
  const legs = trade.legs.filter(isLeg);
  if (!legs.length) return null;
  return {
    id: trade.id,
    name: trade.name,
    symbol: trade.symbol.toUpperCase(),
    expiry: trade.expiry,
    legs,
    savedAt: trade.savedAt,
    openedAt: typeof trade.openedAt === "string" ? trade.openedAt : trade.savedAt,
    realized: typeof trade.realized === "number" && Number.isFinite(trade.realized) ? trade.realized : 0,
    events: Array.isArray(trade.events) ? trade.events.filter(isCloseEvent) : [],
    closedAt: typeof trade.closedAt === "string" ? trade.closedAt : undefined,
  };
}

export function readTrades(): SavedTrade[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((trade): trade is SavedTrade => trade !== null);
  } catch {
    return [];
  }
}

function persist(trades: SavedTrade[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(trades));
  } catch {
    // Ignore quota errors; the in-memory view still updates for this session.
  }
  window.dispatchEvent(new Event(TRADES_EVENT));
}

export function hasOpenLegs(trade: SavedTrade): boolean {
  return trade.legs.some((leg) => leg.qty > 0);
}

export function openTrades(trades: SavedTrade[]): SavedTrade[] {
  return trades.filter(hasOpenLegs);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function saveTrade(input: {
  name: string;
  symbol: string;
  expiry: string;
  legs: Leg[];
}): SavedTrade {
  const now = new Date().toISOString();
  const trade: SavedTrade = {
    ...input,
    symbol: input.symbol.toUpperCase(),
    legs: input.legs.map((leg) => ({ ...leg })),
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    savedAt: now,
    openedAt: now,
    realized: 0,
    events: [],
  };
  persist([trade, ...readTrades()].slice(0, 500));
  return trade;
}

/** Close some or all contracts of one leg at a given mark. */
export function closeLeg(
  tradeId: string,
  legId: string,
  quantity: number,
  price: number,
): SavedTrade | null {
  const trades = readTrades();
  const trade = trades.find((item) => item.id === tradeId);
  const leg = trade?.legs.find((item) => item.id === legId);
  if (!trade || !leg || !Number.isFinite(price)) return null;
  const qty = Math.min(Math.max(0, Math.floor(quantity)), leg.qty);
  if (qty <= 0) return null;
  const now = new Date().toISOString();
  const realized = round2(leg.side * qty * 100 * (price - leg.fill));
  leg.qty -= qty;
  trade.realized = round2(trade.realized + realized);
  trade.events = [
    ...trade.events,
    {
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      at: now,
      legId,
      qty,
      price,
      realized,
    },
  ];
  trade.closedAt = hasOpenLegs(trade) ? undefined : now;
  persist(trades);
  return trade;
}

/** Close every remaining contract at the supplied marks. */
export function closeTrade(
  tradeId: string,
  prices: Record<string, number>,
): SavedTrade | null {
  const trades = readTrades();
  const trade = trades.find((item) => item.id === tradeId);
  if (!trade) return null;
  const now = new Date().toISOString();
  const events: CloseEvent[] = [];
  for (const leg of trade.legs) {
    if (leg.qty <= 0) continue;
    const price = prices[leg.id];
    if (price === undefined || !Number.isFinite(price)) continue;
    const qty = leg.qty;
    const realized = round2(leg.side * qty * 100 * (price - leg.fill));
    leg.qty = 0;
    trade.realized = round2(trade.realized + realized);
    events.push({
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      at: now,
      legId: leg.id,
      qty,
      price,
      realized,
    });
  }
  if (!events.length) return null;
  trade.events = [...trade.events, ...events];
  trade.closedAt = hasOpenLegs(trade) ? undefined : now;
  persist(trades);
  return trade;
}

export function deleteTrade(id: string) {
  persist(readTrades().filter((trade) => trade.id !== id));
}

export function clearTrades() {
  persist([]);
}

export function useTrades() {
  const [trades, setTrades] = useState<SavedTrade[]>(() => readTrades());

  useEffect(() => {
    const sync = () => setTrades(readTrades());
    window.addEventListener(TRADES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TRADES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return trades;
}
