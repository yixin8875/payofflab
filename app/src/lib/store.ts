import { useEffect, useState } from "react";
import type { Leg } from "./options";

export type SavedTrade = {
  id: string;
  name: string;
  symbol: string;
  expiry: string;
  legs: Leg[];
  savedAt: string;
};

const KEY = "payoff:trades";
export const TRADES_EVENT = "payoff:trades-changed";

function isLeg(value: unknown): value is Leg {
  if (!value || typeof value !== "object") return false;
  const leg = value as Partial<Leg>;
  return (
    typeof leg.id === "string" &&
    (leg.kind === "call" || leg.kind === "put" || leg.kind === "stock") &&
    (leg.side === 1 || leg.side === -1) &&
    typeof leg.qty === "number" &&
    typeof leg.strike === "number" &&
    typeof leg.expiry === "string" &&
    typeof leg.dte === "number" &&
    typeof leg.fill === "number"
  );
}

function isSavedTrade(value: unknown): value is SavedTrade {
  if (!value || typeof value !== "object") return false;
  const trade = value as Partial<SavedTrade>;
  return (
    typeof trade.id === "string" &&
    typeof trade.name === "string" &&
    typeof trade.symbol === "string" &&
    typeof trade.expiry === "string" &&
    typeof trade.savedAt === "string" &&
    Array.isArray(trade.legs) &&
    trade.legs.every(isLeg)
  );
}

export function readTrades(): SavedTrade[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedTrade);
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

export function saveTrade(input: Omit<SavedTrade, "id" | "savedAt">): SavedTrade {
  const trade: SavedTrade = {
    ...input,
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    savedAt: new Date().toISOString(),
  };
  persist([trade, ...readTrades()].slice(0, 200));
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
